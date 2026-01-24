import { App, SuggestModal } from 'obsidian';
import type JellyfinPlugin from './main';

export class MovieSuggestModal extends SuggestModal<any> {
    plugin: JellyfinPlugin;
    items: any[];
    onChoose: (item: any) => void;

    constructor(app: App, plugin: JellyfinPlugin, items: any[], onChoose: (item: any) => void) {
        super(app);
        this.plugin = plugin;
        this.items = items;
        this.onChoose = onChoose;
    }

    getSuggestions(query: string): any[] {
        return this.items.filter((item) =>
            item.Name.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(item: any, el: HTMLElement) {
        el.createEl('div', { text: item.Name });
        el.createEl('small', { text: item.ProductionYear ? String(item.ProductionYear) : '' });
    }

    onChooseSuggestion(item: any, _evt: MouseEvent | KeyboardEvent) {
        this.onChoose(item);
    }
}

export class DirectorFolderSuggestModal extends SuggestModal<any> {
    plugin: JellyfinPlugin;
    items: any[];
    onChoose: (item: any) => void;

    constructor(app: App, plugin: JellyfinPlugin, items: any[], onChoose: (item: any) => void) {
        super(app);
        this.plugin = plugin;
        this.items = items;
        this.onChoose = onChoose;
    }

    getSuggestions(query: string): any[] {
        return this.items.filter((item) =>
            item.Name.toLowerCase().includes(query.toLowerCase())
        );
    }

    renderSuggestion(item: any, el: HTMLElement) {
        el.createEl('div', { text: item.Name });
        el.createEl('small', { text: item.Type }); // Should be 'Folder' or 'Collection'
    }

    onChooseSuggestion(item: any, _evt: MouseEvent | KeyboardEvent) {
        this.onChoose(item);
    }
}
