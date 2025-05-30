// obsidian-augment.d.ts

import 'obsidian';

declare module "obsidian" {
    interface App {
        internalPlugins: InternalPlugins;
        plugins: Plugins;
        setting: Setting;
    }
    interface Plugin {
        _loaded: boolean;
    }
    interface PluginSettingTab {
        name: string;
    }
    interface SettingTab {
        id: string;
        name: string;
        navEl: HTMLElement;
        // updateSearch(e: string): void;
        renderInstalledPlugin(
            pluginManifest: PluginManifest,
            containerEl: HTMLElement,
            nameMatch: boolean | null,
            authorMatch: boolean | null,
            descriptionMatch: boolean | null
        ): void;
    }
    interface Setting {
        onOpen(): void;
        onClose(): void;

        openTabById(id: string): void;
        openTab(tab: SettingTab): void;

        closeActiveTab(tab: SettingTab): void;

        isPluginSettingTab(tab: SettingTab): boolean;
        addSettingTab(tab: SettingTab): void;
        removeSettingTab(tab: SettingTab): void;

        activeTab: SettingTab;
        lastTabId: string;

        pluginTabs: PluginSettingTab[];
        settingTabs: SettingTab[];

        tabContentContainer: HTMLDivElement;
        tabHeadersEl: HTMLDivElement;

        close(): void;
    }
    
    interface Plugins {
        manifests: Record<string, PluginManifest>;
        plugins: Record<string, Plugin>;
        getPlugin(id: string): Plugin;
        uninstallPlugin(pluginId: string): Promise<void>;
        getPluginFolder(): string;
    }
    
    interface InternalPlugins {
        plugins: Record<string, Plugin>;
        getPluginById(id: string): Plugin;
    }

    interface AbstractInputSuggest<T> extends PopoverSuggest<T> {
        textInputEl: HTMLInputElement;
    }

    interface Chooser<T> {
        values: T[];
        selectedItem: number;
        useSelectedItem: (event?: KeyboardEvent) => void;
        setSuggestions: (items: T[]) => void;
    }

    interface FuzzySuggestModal<T> {
        chooser: Chooser<T>;
        containerEl: HTMLDivElement;
        selectedItem: number;
        suggestions: HTMLDivElement[];
        moveDown: () => void;
        moveUp: () => void;
        setSelectedItem: (index: number, scroll?: boolean) => void;
        setSuggestions: (items: T[]) => void;
        useSelectedItem: (event?: KeyboardEvent) => void;
        updateSuggestions(): void;
    }

    interface WorkspaceLeaf {
        tabHeaderEl: HTMLElement;
        tabHeaderInnerTitleEl: HTMLElement;
    }

    interface HotkeysSettingTab extends SettingTab {
        setQuery: (str: string) => void;
    }
}