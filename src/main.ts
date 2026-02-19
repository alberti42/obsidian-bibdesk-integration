// main.ts

import { BibtexManager } from 'bibtex_manager';
import { App, FileSystemAdapter, normalizePath, PDFPlusLib, PdfPlusPlugin, Platform, Plugin, PluginSettingTab, Setting, TextComponent, TFile, ToggleComponent } from 'obsidian';

import { around } from 'monkey-around';

import * as fs from 'fs';
import * as path from 'path';

import { BibtexIntegrationSettings, isHotkeysSettingTab } from 'types';
import { unwatchFile, watchFile, doesFolderExist, set_bookmark_resolver_path, set_bookmark_resolver_script_path, set_use_native_binary, ensureBookmarkResolver, fileExists, parseFilePath } from 'utils';

import { DEFAULT_BIBTEX_CONTENT, DEFAULT_SETTINGS } from 'defaults';
import { InsertCitationFuzzyModal, InsertCitekeyFuzzyModal, OpenPdfFuzzyModal } from 'citekeyFuzzyModal';

export default class BibtexIntegration extends Plugin {
    settings: BibtexIntegrationSettings = DEFAULT_SETTINGS;

    private pdf_plus_plugin: PdfPlusPlugin | null = null;
    
    public bibtexManager = new BibtexManager(this);


    async onload() {
        const adapter = this.app.vault.adapter;
        if (!(adapter instanceof FileSystemAdapter)) {
            throw new Error("The vault folder could not be determined.");
        }

        // Path to vault
        const vaultPath = adapter.getBasePath();

        // Paths to bookmark resolver artifacts in the plugin folder
        const pluginDir = this.manifest.dir
            ? path.join(vaultPath, this.manifest.dir)
            : null;

        set_bookmark_resolver_path(pluginDir ? path.join(pluginDir, 'bookmark_resolver') : null);
        set_bookmark_resolver_script_path(pluginDir ? path.join(pluginDir, 'bookmark_resolver.scpt') : null);

        await this.loadSettings();

        // Apply the bookmark resolver mode from settings, then ensure artifacts are present
        set_use_native_binary(this.settings.use_native_binary);
        ensureBookmarkResolver(this.manifest.version, this.settings.use_native_binary)
            .then(() => console.log("BibDesk Integration: bookmark resolver ready."))
            .catch(error => console.error("BibDesk Integration: ensureBookmarkResolver error:", error));

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new BibtexIntegrationSettingTab(this.app, this));

        // For example, triggering the worker when a command is run:
        this.addCommand({
            id: 'parse-bibtex',
            name: 'Force parsing BibTeX file again',
            callback: async () => {
                this.parseBibtexFile();
            }
        });

        this.addCommand({
            id: 'open-pdf-from-bibtex-library',
            name: 'Open a PDF paper that is contained in the BibTex library',
            callback: () => {
                if(this.bibtexManager) {
                    const modal = new OpenPdfFuzzyModal(this, this.bibtexManager);
                    modal.open();
                }
            }
        });

        this.addCommand({
            id: 'cite-paper-from-bibtex-library',
            name: 'Insert citation to a paper that is contained in the BibTex library',
            callback: () => {
                if(this.bibtexManager) {
                    const modal = new InsertCitationFuzzyModal(this, this.bibtexManager);
                    modal.open();
                }
            }
        });

        this.addCommand({
            id: 'citekey-from-bibtex-library',
            name: 'Insert citekey of a paper that is contained in the BibTex library',
            callback: () => {
                if(this.bibtexManager) {
                    const modal = new InsertCitekeyFuzzyModal(this, this.bibtexManager);
                    modal.open();
                }
            }
        });

        if(this.settings.import_delay_ms>0) {
            setTimeout(() => {
                this.parseBibtexFile();
            }, this.settings.import_delay_ms);
        } else {
            this.parseBibtexFile();
        }

        this.app.workspace.onLayoutReady(async () => {
            // Wait for all plugins to be loaded
            this.monkey_patch_PDF_plus();
        });     
    }

    monkey_patch_PDF_plus() {
        // Prevent duplicate patching
        if (this.pdf_plus_plugin) return;

        // Retrieve the PDF+ plugin and ensure it is loaded
        const pdf_plus_plugin = this.app.plugins.getPlugin('pdf-plus') as PdfPlusPlugin | undefined;
        if (!(pdf_plus_plugin && pdf_plus_plugin.lib)) {
            console.log("PDF++ plugin cannot be monkey-patched because it is not loaded.");
            return;
        }
        this.pdf_plus_plugin = pdf_plus_plugin;

        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;

        // Patch getExternalPDFUrl function
        const removeMonkeyPatchFnc = around(pdf_plus_plugin.lib, {
            getExternalPDFUrl: function (next: (file: TFile) => Promise<string | null>) {
                return async function (this: PDFPlusLib, file: TFile): Promise<string | null> { 
                    if (file.stat.size > 300) return null;

                    const content = (await this.app.vault.read(file)).trim();

                    if (content.startsWith('x-bdsk://')) {
                        if(self.bibtexManager) {
                            const url = await self.bibtexManager.getPdfUrlFromUrl(content);
                            if(url) {
                                return Platform.resourcePathPrefix + url.substring(8);
                            } else {
                                console.error("Error:", `could not resolve url: ${content}`);
                                return null;
                            }
                        } else {
                            console.error("Error:", "BibTex parser not initialized correctly");
                            return null;    
                        }
                    }

                    // Call the original function using .call to preserve the `this` context
                    const result = await next.call(this, file);

                    // Return the (potentially modified) result
                    return result;
                };
            }
        });

        // Register the cleanup function so the patch can be removed later
        this.register(removeMonkeyPatchFnc);
        return;
    }

    async parseBibtexFile() {
        let bibtex_data: string;
        try {
            const t0 = Date.now();
            bibtex_data = await this.readBibFile();
            const t1 = Date.now();
            if (this.settings.debug_parser) console.log("BibTex file loaded in " + (t1 - t0) + " milliseconds.");
        } catch(error) {
            let errorMsg;
            if(error instanceof Error) {
                errorMsg = error.message;
            } else {
                errorMsg = `${error}`;
            }
            console.error(`Error when loading BibTex file ${this.settings.bibtex_filepath.trim()}:`, errorMsg);
            if(this.settings.use_demo_entries) {
                this.bibtexManager.parseBibtexData(DEFAULT_BIBTEX_CONTENT);
                if(this.settings.debug_parser) console.log("No user-provided BibTex file was found. Using demo entries instead.")
            }
            return;
        }

        watchFile(this.settings.bibtex_filepath,this);
        
        this.bibtexManager.parseBibtexData(bibtex_data);
    }

    // Function to read the .bib file and return its contents
    async readBibFile(): Promise < string > {
        if (this.settings.bibtex_filepath.trim() === '') {
            throw new Error("no .bib file provided.")
        }
        if (! await fileExists(this.settings.bibtex_filepath)) {
            throw new Error("file does not exist.")
        }
        try {
            const data = await fs.promises.readFile(this.settings.bibtex_filepath, 'utf8');
            return data;
        } catch (err) {
            console.error("Error reading file:", err);
            throw err; // Rethrow the error so the caller knows something went wrong
        }
    }

    onunload() {
        unwatchFile();
    }

    async onExternalSettingsChange() {
        // Load settings
        await this.loadSettings();

        const activeTab = this.app.setting.activeTab;
        if(activeTab && activeTab instanceof BibtexIntegrationSettingTab) activeTab.display();
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class BibtexIntegrationSettingTab extends PluginSettingTab {
    plugin: BibtexIntegration;

    private bibtex_filepath_original: string;

    constructor(app: App, plugin: BibtexIntegration) {
        super(app, plugin);
        this.plugin = plugin;
        this.bibtex_filepath_original = DEFAULT_SETTINGS.bibtex_filepath;
    }

    display(): void {
        // Save the original setting before the user has the chance to change it
        this.bibtex_filepath_original = this.plugin.settings.bibtex_filepath;

        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl).setName('Importing BibTex entries').setHeading();

        const bibtex_filepath_setting = new Setting(containerEl)
            .setName('BibTex file')
            .setDesc('Full path of the BibTex file to be imported. Note: this is the absolute path on \
                    your computer and is not referred to the vault.');

        let bibtex_filepath_text:TextComponent;
        bibtex_filepath_setting.addText(text => {
                bibtex_filepath_text = text;
                const warningEl = containerEl.createEl('div', { cls: 'mod-warning' });
                text.setPlaceholder('Filepath')
                .setValue(this.plugin.settings.bibtex_filepath)
                .onChange(async (value) => {
                    // Remove any previous warning text
                    warningEl.textContent = '';
                    const normalizedPath = path.normalize(value);
                    const parsedPath = parseFilePath(normalizedPath);

                    // when the field is empty, we don't consider it as an error,
                    // but simply as if the .bib file was not provided yet
                    const isEmpty = value === "";

                    if (!isEmpty && parsedPath.ext !== ".bib") {
                        warningEl.textContent = 'Please choose a BibTex file with .bib extension.';
                        warningEl.classList.remove('bibdesk-integration-hidden');
                    }
                    else if (!isEmpty && !await fileExists(normalizedPath)) {
                        warningEl.textContent = 'Please enter the path of an existing BibTex file in your vault.';
                        warningEl.classList.remove('bibdesk-integration-hidden');
                    } else {
                        // Hide the warning and save the valid value
                        warningEl.classList.add('bibdesk-integration-hidden');
                        this.plugin.settings.bibtex_filepath = value;
                        await this.plugin.saveSettings();
                    }
                })
            });

        bibtex_filepath_setting.addExtraButton((button) => {
            button
                .setIcon("reset")
                .setTooltip("Reset to default value")
                .onClick(() => {
                    const value = DEFAULT_SETTINGS.bibtex_filepath;
                    bibtex_filepath_text.setValue(value);
                    this.plugin.settings.bibtex_filepath = value;
                    this.plugin.saveSettings();
                });
        });

        const import_delay_setting = new Setting(containerEl)
            .setName('Delay on start')
            .setDesc('A delay in milliseconds before importing the BibTex entries after the plugin has loaded. This may be useful to make Obsidian more responsive on start.');

        let import_delay_text:TextComponent;
        import_delay_setting.addText(text => {
                import_delay_text = text;
                const warningEl = containerEl.createEl('div', { cls: 'mod-warning' });
                warningEl.classList.remove('bibdesk-integration-hidden');  // Initially hide the warning
                return text
                    .setPlaceholder('Delay in milliseconds')
                    .setValue(`${this.plugin.settings.import_delay_ms}`)
                    .onChange(async (inputStr) => {
                        // Remove any previous warning text
                        warningEl.textContent = '';

                        const inputStrWithoutSpaces = inputStr.replaceAll(' ','');

                        // Try to parse the input as an integer
                        const parsedInput = parseInt(inputStrWithoutSpaces, 10);

                        // Check if the value is a valid number and greater than or equal to 0
                        if (isNaN(parsedInput) || parsedInput < 0 || (`${parsedInput}` !== inputStrWithoutSpaces)) {
                            // Show warning if the input is invalid
                            warningEl.textContent = 'Please enter a valid positive integer number for the delay.';
                            warningEl.classList.remove('bibdesk-integration-hidden');
                        } else {
                            // Hide the warning and save the valid value
                            warningEl.classList.add('bibdesk-integration-hidden');
                            this.plugin.settings.import_delay_ms = parsedInput;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        import_delay_setting.addExtraButton((button) => {
            button
                .setIcon("reset")
                .setTooltip("Reset to default value")
                .onClick(() => {
                    const value = DEFAULT_SETTINGS.import_delay_ms;
                    import_delay_text.setValue(`${value}`);
                    this.plugin.settings.import_delay_ms = value;
                    this.plugin.saveSettings();
                });
        });


        const use_demo_entries_setting = new Setting(containerEl)
            .setName('Use demo entries')
            .setDesc('If this option is enabled, a few BibTex entries are used for demonstration purposes when no BibTex file is provided yet.');

        let use_demo_entries_toggle: ToggleComponent;
        use_demo_entries_setting.addToggle(toggle => {
            use_demo_entries_toggle = toggle;
            toggle
            .setValue(this.plugin.settings.use_demo_entries)
            .onChange(async (value: boolean) => {
                this.plugin.settings.use_demo_entries = value;
                this.plugin.saveSettings();
            })
        });

        use_demo_entries_setting.addExtraButton((button) => {
            button
                .setIcon("reset")
                .setTooltip("Reset to default value")
                .onClick(() => {
                    const value = DEFAULT_SETTINGS.use_demo_entries;
                    use_demo_entries_toggle.setValue(value);
                    this.plugin.settings.use_demo_entries = value;
                    this.plugin.saveSettings();
                });
        });


        const debug_parser_setting = new Setting(containerEl)
            .setName('Debug BibTex parser')
            .setDesc('If this option is enabled, information about the parsed BibTex files are provided in the developed console.');


        let debug_parser_toggle: ToggleComponent;
        debug_parser_setting.addToggle(toggle => {
            debug_parser_toggle = toggle;
            toggle
            .setValue(this.plugin.settings.debug_parser)
            .onChange(async (value: boolean) => {
                this.plugin.settings.debug_parser = value;
                this.plugin.saveSettings();
            })
        });

        debug_parser_setting.addExtraButton((button) => {
            button
                .setIcon("reset")
                .setTooltip("Reset to default value")
                .onClick(() => {
                    const value = DEFAULT_SETTINGS.debug_parser;
                    debug_parser_toggle.setValue(value);
                    this.plugin.settings.debug_parser = value;
                    this.plugin.saveSettings();
                });
        });

        new Setting(containerEl).setName('Library in the vault').setHeading();

        const pdf_folder_setting = new Setting(containerEl)
            .setName('Folder containg PDF++ placeholders')
            .setDesc('A folder in your vault containing the placeholders from PDF++ (e.g.: "00 Meta/PDF++")');

        let pdf_folder_text:TextComponent;
        pdf_folder_setting.addText(text => {
                pdf_folder_text = text;
                const warningEl = containerEl.createEl('div', { cls: 'mod-warning' });
                warningEl.classList.remove('bibdesk-integration-hidden');  // Initially hide the warning
                return text
                    .setPlaceholder('E.g.: 00 Meta/PDF++')
                    .setValue(this.plugin.settings.pdf_folder)
                    .onChange(async (value) => {
                        // Remove any previous warning text
                        warningEl.textContent = '';
                        const path = normalizePath(value);
                        if (!doesFolderExist(this.app.vault,path)) {
                            warningEl.textContent = 'Please enter the path of an existing folder in your vault.';
                            warningEl.classList.remove('bibdesk-integration-hidden');
                        } else {
                            // Hide the warning and save the valid value
                            warningEl.classList.add('bibdesk-integration-hidden');
                            this.plugin.settings.pdf_folder = path;
                            await this.plugin.saveSettings();
                        }
                    });
            });

        pdf_folder_setting.addExtraButton((button) => {
            button
                .setIcon("reset")
                .setTooltip("Reset to default value")
                .onClick(() => {
                    const value = DEFAULT_SETTINGS.pdf_folder;
                    pdf_folder_text.setValue(value);
                    this.plugin.settings.pdf_folder = value;
                    this.plugin.saveSettings();
                });
        });

        const organize_by_years_setting = new Setting(containerEl)
            .setName('Organize the PDF placeholders by years')
            .setDesc('If this option is enabled, the placeholders are stored in subfolders named by the year of the publication.');

        let organize_by_years_toggle: ToggleComponent;
        organize_by_years_setting.addToggle(toggle => {
            organize_by_years_toggle = toggle;
            toggle
            .setValue(this.plugin.settings.organize_by_years)
            .onChange(async (value: boolean) => {
                this.plugin.settings.organize_by_years = value;
                this.plugin.saveSettings();
            })
        });

        organize_by_years_setting.addExtraButton((button) => {
            button
                .setIcon("reset")
                .setTooltip("Reset to default value")
                .onClick(() => {
                    const value = DEFAULT_SETTINGS.organize_by_years;
                    organize_by_years_toggle.setValue(DEFAULT_SETTINGS.organize_by_years);
                    this.plugin.settings.organize_by_years = value;
                    this.plugin.saveSettings();
                });
        });

        new Setting(containerEl).setName('Commands and hotkeys').setHeading();

        new Setting(containerEl).setName(createFragment((frag:DocumentFragment) => {
                frag.appendText("The plugin offers a range of commands to insert citations and open the attached PDF files. \
                    You can review the commands and their hotkey assignments by visiting the ");
                const em = createEl('em');
                const link = frag.createEl('a', { href: '#', text: 'Hotkeys'});
                link.onclick = () => {
                    const tab = this.app.setting.openTabById('hotkeys');
                    if(isHotkeysSettingTab(tab)) {
                        tab.setQuery(this.plugin.manifest.id)
                    }
                };

                em.appendChild(link);
                frag.appendChild(em);
                frag.appendText(' configuration pane.');
            }));

    }

    // Triggered when the settings pane is closed
    hide(): void {
        super.hide();
        if(this.bibtex_filepath_original !== this.plugin.settings.bibtex_filepath) {
            // if the setting has changed, parse the new bibtex file
            this.plugin.parseBibtexFile();
        }
    }
}

export interface ParsedUri {
    scheme: string;
    address: string;
    query: Queries|null;
}

export interface Queries {
    [key: string]: string|null;
}
