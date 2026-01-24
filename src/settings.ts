import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type JellyfinPlugin from './main';

export interface JellyfinPluginSettings {
    serverUrl: string;
    apiKey: string;
    userId: string;
    // UI Settings
    gridColumns: number;
    // Note Settings
    outputFolder: string;
    tagsTemplate: string;
    // Frontmatter Keys
    keyTitle: string;
    keyOriginalTitle: string;
    keyDirector: string;
    keyCast: string;
    keyRating: string;
    keyCriticRating: string;
    keyYear: string;
    keyPlot: string;
    keyGenre: string;
    keyParentalRating: string;
    keyProductionLocations: string;

    // Poster Settings
    downloadPoster: boolean;
    posterFolderPath: string;

    // Frontmatter Toggles
    includeTags: boolean;
    includePlot: boolean;
    includeCast: boolean;
    includeRating: boolean; // Affects Community Rating
    includeCriticRating: boolean; // Separate toggle for critic? Or shared? User asked for "Critic rating" in settings. Let's make it granular.
    includeOriginalTitle: boolean;
    includeGenre: boolean;
    includeProductionLocations: boolean;
    includeYear: boolean;
    includeTmdbId: boolean;
    includePoster: boolean;
    includeWatched: boolean;
    keyWatched: string;

    // Order
    frontmatterOrder: string[];
    // Custom Fields
    customFields: string[];
}

export const DEFAULT_SETTINGS: JellyfinPluginSettings = {
    serverUrl: '',
    apiKey: '',
    userId: '',
    gridColumns: 4,
    outputFolder: 'Jellyfin Movies',
    tagsTemplate: 'jellyfin, movie',
    keyTitle: 'Title',
    keyOriginalTitle: 'Original Title',
    keyDirector: 'Director',
    keyCast: 'Cast',
    keyRating: 'Community Rating',
    keyCriticRating: 'Critic Rating',
    keyYear: 'Year',
    keyPlot: 'Overview',
    keyGenre: 'Genre',
    keyParentalRating: 'Parental Rating',
    keyProductionLocations: 'Production Locations',
    downloadPoster: false,
    posterFolderPath: 'Assets/Posters',
    includeTags: true,
    includePlot: true,
    includeCast: true,
    includeRating: true,
    includeCriticRating: true,
    includeOriginalTitle: true,
    includeGenre: true,
    includeProductionLocations: true,
    includeYear: true,
    includeTmdbId: true,
    includePoster: true,
    includeWatched: true,
    keyWatched: 'Watched',
    frontmatterOrder: [
        'title', 'original_title', 'genre', 'director', 'cast',
        'production_locations', 'rating_community', 'rating_critic',
        'rating_parental', 'tags', 'plot', 'year', 'tmdb_id',
        'watched', 'poster'
    ],
    customFields: [],
}

export class JellyfinSettingTab extends PluginSettingTab {
    plugin: JellyfinPlugin;

    constructor(app: App, plugin: JellyfinPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;

        containerEl.empty();
        containerEl.createEl('h2', { text: 'Jellyfin Integration Settings' });

        new Setting(containerEl)
            .setName('Server URL')
            .setDesc('Base URL of your Jellyfin server (e.g., http://myserver.com:8096)')
            .addText(text => text
                .setPlaceholder('http://myserver.com:8096')
                .setValue(this.plugin.settings.serverUrl)
                .onChange(async (value) => {
                    this.plugin.settings.serverUrl = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('API Key')
            .setDesc('Your Jellyfin API Key')
            .addText(text => text
                .setPlaceholder('API Key')
                .setValue(this.plugin.settings.apiKey)
                .onChange(async (value) => {
                    this.plugin.settings.apiKey = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('User ID')
            .setDesc('Your Jellyfin User ID (optional, required for specific user data)')
            .addText(text => text
                .setPlaceholder('User ID')
                .setValue(this.plugin.settings.userId)
                .onChange(async (value) => {
                    this.plugin.settings.userId = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Test Connection')
            .setDesc('Verify that your Server URL and API Key are correct.')
            .addButton(button => button
                .setButtonText('Test Connection')
                .setCta()
                .onClick(async () => {
                    const status = await this.plugin.api.testConnection();
                    if (status) {
                        new Notice('✅ Connection Successful!');
                    } else {
                        new Notice('❌ Connection Failed. Check settings and console for details.');
                    }
                }));

        containerEl.createEl('h3', { text: 'UI Settings' });

        new Setting(containerEl)
            .setName('Grid Columns')
            .setDesc('Number of columns in the library browser (3-6).')
            .addSlider(slider => slider
                .setLimits(3, 6, 1)
                .setValue(this.plugin.settings.gridColumns)
                .setDynamicTooltip()
                .onChange(async (value) => {
                    this.plugin.settings.gridColumns = value;
                    await this.plugin.saveSettings();
                    // We might need to refresh open views, but for now just save.
                    // The browser reads settings on open/render.
                }));

        containerEl.createEl('h3', { text: 'Note Generation' });

        new Setting(containerEl)
            .setName('Output Folder')
            .setDesc('Folder where movie notes will be created.')
            .addText(text => text
                .setPlaceholder('Jellyfin Movies')
                .setValue(this.plugin.settings.outputFolder)
                .onChange(async (value) => {
                    this.plugin.settings.outputFolder = value;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName('Tags Template')
            .setDesc('Comma separated tags. Use {{director}}, {{year}}, {{genre}} as placeholders.')
            .addText(text => text
                .setPlaceholder('jellyfin, movie, {{director}}')
                .setValue(this.plugin.settings.tagsTemplate)
                .onChange(async (value) => {
                    this.plugin.settings.tagsTemplate = value;
                    await this.plugin.saveSettings();
                }));

        containerEl.createEl('h4', { text: 'Frontmatter Order' });
        containerEl.createEl('div', { text: 'Drag and drop items to reorder the Frontmatter fields.', cls: 'setting-item-description' });

        containerEl.createEl('h4', { text: 'Frontmatter Keys & Order' });
        containerEl.createEl('div', { text: 'Drag items to reorder. User toggles to include/exclude.', cls: 'setting-item-description' });

        // Custom Field Adder
        new Setting(containerEl)
            .setName('Add Custom Field')
            .setDesc('Add a new frontmatter key (e.g. "My Rating"). It will be added with an empty value.')
            .addText(text => text
                .setPlaceholder('Field Name')
                .onChange((value) => {
                    // We could store it temporarily
                    text.inputEl.dataset.value = value;
                }))
            .addButton(btn => btn
                .setButtonText('Add')
                .onClick(async () => {
                    // Logic to add
                    const inputEl = containerEl.querySelector('input[placeholder="Field Name"]') as HTMLInputElement;
                    const value = inputEl?.value.trim();

                    if (value && !this.plugin.settings.customFields.includes(value) && !this.plugin.settings.frontmatterOrder.includes(value)) {
                        this.plugin.settings.customFields.push(value);
                        this.plugin.settings.frontmatterOrder.push(value); // Add to end of order
                        await this.plugin.saveSettings();

                        // Clear input
                        inputEl.value = '';
                        this.display(); // Refresh to show in list
                    } else {
                        new Notice('Invalid or duplicate field name.');
                    }
                }));


        const fmContainer = containerEl.createDiv();
        this.renderFrontmatterSettings(fmContainer);


        containerEl.createEl('h4', { text: 'Poster Management' });

        new Setting(containerEl)
            .setName('Download Poster')
            .setDesc('Download the primary image locally to your vault.')
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.downloadPoster)
                .onChange(async (value) => {
                    this.plugin.settings.downloadPoster = value;
                    await this.plugin.saveSettings();
                    this.display();
                }));

        if (this.plugin.settings.downloadPoster) {
            new Setting(containerEl)
                .setName('Poster Storage Path')
                .setDesc('Folder where posters will be saved (e.g., Assets/Posters).')
                .addText(text => text
                    .setPlaceholder('Assets/Posters')
                    .setValue(this.plugin.settings.posterFolderPath)
                    .onChange(async (value) => {
                        this.plugin.settings.posterFolderPath = value;
                        await this.plugin.saveSettings();
                    }));
        }
    }

    renderFrontmatterSettings(container: HTMLElement) {
        container.empty();

        let dragStartIndex: number | null = null;

        // Iterate through the saved order
        this.plugin.settings.frontmatterOrder.forEach((key, index) => {
            let setting: Setting | null = null;

            // Generate the Setting based on the key
            switch (key) {
                // Mandatory Fields (Title, Director) - No toggle, just Rename
                case 'title':
                    setting = new Setting(container)
                        .setName('Title')
                        .setDesc('Mandatory')
                        .addText(t => t.setValue(this.plugin.settings.keyTitle).onChange(async v => { this.plugin.settings.keyTitle = v; await this.plugin.saveSettings(); }));
                    break;
                case 'director':
                    setting = new Setting(container)
                        .setName('Director')
                        .setDesc('Mandatory')
                        .addText(t => t.setValue(this.plugin.settings.keyDirector).onChange(async v => { this.plugin.settings.keyDirector = v; await this.plugin.saveSettings(); }));
                    break;

                // Optional Fields (Toggle + Rename)
                case 'original_title':
                    setting = new Setting(container)
                        .setName('Original Title')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeOriginalTitle).onChange(async v => { this.plugin.settings.includeOriginalTitle = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyOriginalTitle).onChange(async v => { this.plugin.settings.keyOriginalTitle = v; await this.plugin.saveSettings(); }));
                    break;
                case 'cast':
                    setting = new Setting(container)
                        .setName('Cast')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeCast).onChange(async v => { this.plugin.settings.includeCast = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyCast).onChange(async v => { this.plugin.settings.keyCast = v; await this.plugin.saveSettings(); }));
                    break;
                case 'genre':
                    setting = new Setting(container)
                        .setName('Genre')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeGenre).onChange(async v => { this.plugin.settings.includeGenre = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyGenre).onChange(async v => { this.plugin.settings.keyGenre = v; await this.plugin.saveSettings(); }));
                    break;
                case 'year':
                    setting = new Setting(container)
                        .setName('Year')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeYear).onChange(async v => { this.plugin.settings.includeYear = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyYear).onChange(async v => { this.plugin.settings.keyYear = v; await this.plugin.saveSettings(); }));
                    break;
                case 'plot':
                    setting = new Setting(container)
                        .setName('Plot / Overview')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includePlot).onChange(async v => { this.plugin.settings.includePlot = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyPlot).onChange(async v => { this.plugin.settings.keyPlot = v; await this.plugin.saveSettings(); }));
                    break;
                case 'production_locations':
                    setting = new Setting(container)
                        .setName('Production Locations')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeProductionLocations).onChange(async v => { this.plugin.settings.includeProductionLocations = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyProductionLocations).onChange(async v => { this.plugin.settings.keyProductionLocations = v; await this.plugin.saveSettings(); }));
                    break;
                case 'rating_community':
                    setting = new Setting(container)
                        .setName('Community Rating')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeRating).onChange(async v => { this.plugin.settings.includeRating = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyRating).onChange(async v => { this.plugin.settings.keyRating = v; await this.plugin.saveSettings(); }));
                    break;
                case 'rating_critic':
                    setting = new Setting(container)
                        .setName('Critic Rating')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeCriticRating).onChange(async v => { this.plugin.settings.includeCriticRating = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyCriticRating).onChange(async v => { this.plugin.settings.keyCriticRating = v; await this.plugin.saveSettings(); }));
                    break;
                case 'rating_parental':
                    setting = new Setting(container)
                        .setName('Parental Rating')
                        .setDesc('Renames the parental rating field.')
                        .addText(t => t.setValue(this.plugin.settings.keyParentalRating).onChange(async v => { this.plugin.settings.keyParentalRating = v; await this.plugin.saveSettings(); }));
                    break;
                case 'tags':
                    setting = new Setting(container)
                        .setName('Tags')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeTags).onChange(async v => { this.plugin.settings.includeTags = v; await this.plugin.saveSettings(); }));
                    break;
                case 'tmdb_id':
                    setting = new Setting(container)
                        .setName('TmdbId')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeTmdbId).onChange(async v => { this.plugin.settings.includeTmdbId = v; await this.plugin.saveSettings(); }));
                    break;
                case 'poster':
                    setting = new Setting(container)
                        .setName('Poster Key')
                        .setDesc('Include "Poster" field in frontmatter.')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includePoster).onChange(async v => { this.plugin.settings.includePoster = v; await this.plugin.saveSettings(); }));
                    break;
                case 'watched':
                    setting = new Setting(container)
                        .setName('Watched Status')
                        .setDesc('Add a checkbox property to track if watched.')
                        .addToggle(toggle => toggle.setValue(this.plugin.settings.includeWatched).onChange(async v => { this.plugin.settings.includeWatched = v; await this.plugin.saveSettings(); }))
                        .addText(t => t.setValue(this.plugin.settings.keyWatched).onChange(async v => { this.plugin.settings.keyWatched = v; await this.plugin.saveSettings(); }));
                    break;
                default:
                    // Check if it is a Custom Field
                    if (this.plugin.settings.customFields.includes(key)) {
                        setting = new Setting(container)
                            .setName(key)
                            .setDesc('Custom Field')
                            .addButton(btn => btn
                                .setIcon('trash')
                                .setTooltip('Delete Field')
                                .onClick(async () => {
                                    // Delete Logic
                                    this.plugin.settings.customFields = this.plugin.settings.customFields.filter(f => f !== key);
                                    this.plugin.settings.frontmatterOrder = this.plugin.settings.frontmatterOrder.filter(f => f !== key);
                                    await this.plugin.saveSettings();
                                    this.renderFrontmatterSettings(container);
                                }));
                    }
                    break;
            }

            if (setting) {
                const item = setting.settingEl;

                // DRAG AND DROP LOGIC
                item.setAttribute('draggable', 'true');
                item.style.cursor = 'grab';
                // item.style.borderRadius = ''; // Explicitly do NOT set border radius, keep native

                // Add simple handle icon to name
                const nameEl = item.querySelector('.setting-item-name');
                if (nameEl) {
                    nameEl.prepend(createSpan({ text: '☰ ', cls: 'jellyfin-drag-handle' }));
                }

                item.ondragstart = (e) => {
                    dragStartIndex = index;
                    if (e.dataTransfer) {
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', index.toString());
                        item.style.opacity = '0.5';
                    }
                };

                item.ondragover = (e) => {
                    e.preventDefault();
                    e.dataTransfer!.dropEffect = 'move';
                    item.style.boxShadow = '0 -2px 0 var(--interactive-accent)'; // Indicating drop line
                };

                item.ondragleave = (e) => {
                    item.style.boxShadow = '';
                };

                item.ondrop = async (e) => {
                    e.preventDefault();
                    item.style.boxShadow = '';
                    const dragEndIndex = index;

                    if (dragStartIndex !== null && dragStartIndex !== dragEndIndex) {
                        const items = [...this.plugin.settings.frontmatterOrder];
                        const [draggedItem] = items.splice(dragStartIndex, 1);
                        items.splice(dragEndIndex, 0, draggedItem);

                        this.plugin.settings.frontmatterOrder = items;
                        await this.plugin.saveSettings();
                        this.renderFrontmatterSettings(container);
                    }
                };

                item.ondragend = () => {
                    item.style.opacity = '1';
                    item.style.boxShadow = '';
                };
            }
        });
    }
}
