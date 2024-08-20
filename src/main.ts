// main.ts

import { App, Editor, MarkdownFileInfo, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting } from 'obsidian';
import { promises as fs } from 'fs';
import * as path from 'path';

import {parse} from "./peggy.mjs"

interface BibtexIntegrationSettings {
    mySetting: string;
}

const DEFAULT_SETTINGS: BibtexIntegrationSettings = {
    mySetting: 'default'
}

export default class BibtexIntegration extends Plugin {
    settings: BibtexIntegrationSettings = DEFAULT_SETTINGS;

    private filePath = path.join("/Users/andrea/Documents/Papers library", "Andrea's references.bib");
    worker: Worker | null = null;

    async onload() {
        await this.loadSettings();

        // This creates an icon in the left ribbon.
        const ribbonIconEl = this.addRibbonIcon('dice', 'Sample Plugin', (evt: MouseEvent) => {
            // Called when the user clicks the icon.
            new Notice('This is a notice!');
        });
        // Perform additional things with the ribbon
        ribbonIconEl.addClass('my-plugin-ribbon-class');

        // This adds a status bar item to the bottom of the app. Does not work on mobile apps.
        const statusBarItemEl = this.addStatusBarItem();
        statusBarItemEl.setText('Status Bar Text');

        // This adds a simple command that can be triggered anywhere
        this.addCommand({
            id: 'open-sample-modal-simple',
            name: 'Open sample modal (simple)',
            callback: () => {
                new SampleModal(this.app).open();
            }
        });
        // This adds an editor command that can perform some operation on the current editor instance
        this.addCommand({
            id: 'sample-editor-command',
            name: 'Sample editor command',
            editorCallback: (editor: Editor, view: MarkdownView | MarkdownFileInfo): any => {
                console.log(editor.getSelection());
                editor.replaceSelection('Sample Editor Command');
            }
        });
        // This adds a complex command that can check whether the current state of the app allows execution of the command
        this.addCommand({
            id: 'open-sample-modal-complex',
            name: 'Open sample modal (complex)',
            checkCallback: (checking: boolean) => {
                // Conditions to check
                const markdownView = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (markdownView) {
                    // If checking is true, we're simply "checking" if the command can be run.
                    // If checking is false, then we want to actually perform the operation.
                    if (!checking) {
                        new SampleModal(this.app).open();
                    }

                    // This command will only show up in Command Palette when the check function returns true
                    return true;
                }
            }
        });

        // This adds a settings tab so the user can configure various aspects of the plugin
        this.addSettingTab(new SampleSettingTab(this.app, this));

        // When registering intervals, this function will automatically clear the interval when the plugin is disabled.
        this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));

         // Define the worker's code as a string
        const workerCode = `
            self.onmessage = function(event) {
                console.log('Message received in worker:', event.data.length);
                self.postMessage('Worker processed the data');
            };
        `;

        // Create a Blob URL from the worker code
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);

        try {
            // Create and initialize the Web Worker from the Blob URL
            this.worker = new Worker(workerUrl);
            
            // Check for any errors when loading the worker
            this.worker.onerror = (error) => {
                console.error("Failed to load the worker. Error:");
                console.log(error);
            };
            
            // Confirm successful communication with the worker
            this.worker.onmessage = async (event) => {
                let data;
                const t0 = Date.now();
                try {
                    data = await fs.readFile(path.join("/Users/andrea/Documents/Papers library", "Andrea's references.bib"), 'utf8');
                } catch (err) {
                    console.error("Error reading file:", err);
                    throw err;  // Rethrow the error so the caller knows something went wrong
                }
                const t1 = Date.now();
                console.log("Bibtex file loaded in " + (t1 - t0) + " milliseconds.");

                const t2 = Date.now();
                const parsedData = parse(data);
                const t3 = Date.now();
                console.log("Bibtex file parsed in " + (t3 - t2) + " milliseconds:", parsedData.length);
            };

        } catch (error) {
            console.error("Error creating worker:", error);        
        }
    
        // For example, triggering the worker when a command is run:
        this.addCommand({
            id: 'parse-bibtex',
            name: 'Parse BibTeX File',
            callback: async () => {
                if(this.worker) {
                    this.worker.postMessage({});    
                }                
            }
        });
    }

    onunload() {
        if (this.worker) {
            this.worker.terminate();  // Clean up the worker when unloading
        }
    }
    
    async parseBibtex() {
        const t0 = Date.now();
        const data = await this.readBibFile();
        const t1 = Date.now();
        console.log("Bibtex file loaded in " + (t1 - t0) + " milliseconds.");

        const t2 = Date.now();
        const parsedData = parse(data);
        const t3 = Date.now();
        console.log("Bibtex file parsed in " + (t3 - t2) + " milliseconds:", parsedData.length);
    }


    // Function to read the .bib file and return its contents
    async readBibFile(): Promise<string> {
      try {
        const data = await fs.readFile(this.filePath, 'utf8');
        return data;
      } catch (err) {
        console.error("Error reading file:", err);
        throw err;  // Rethrow the error so the caller knows something went wrong
      }
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
    }
}

class SampleModal extends Modal {
    constructor(app: App) {
        super(app);
    }

    onOpen() {
        const {contentEl} = this;
        contentEl.setText('Woah!');
    }

    onClose() {
        const {contentEl} = this;
        contentEl.empty();
    }
}

class SampleSettingTab extends PluginSettingTab {
    plugin: BibtexIntegration;

    constructor(app: App, plugin: BibtexIntegration) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const {containerEl} = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName('Setting #1')
            .setDesc('It\'s a secret')
            .addText(text => text
                .setPlaceholder('Enter your secret')
                .setValue(this.plugin.settings.mySetting)
                .onChange(async (value) => {
                    this.plugin.settings.mySetting = value;
                    await this.plugin.saveSettings();
                }));
    }
}