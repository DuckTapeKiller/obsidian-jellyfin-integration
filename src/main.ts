
import { Plugin, Notice, MarkdownView, TFile, addIcon, requestUrl } from 'obsidian';
import { JellyfinPluginSettings, DEFAULT_SETTINGS, JellyfinSettingTab } from './settings';
import { JellyfinAPI } from './jellyfin';
import { DirectorFolderSuggestModal, MovieSuggestModal } from './modals';
import { JellyfinBrowserModal } from './browser';

export default class JellyfinPlugin extends Plugin {
    settings: JellyfinPluginSettings;
    api: JellyfinAPI;

    async onload() {
        await this.loadSettings();
        this.api = new JellyfinAPI(this.settings);

        this.addSettingTab(new JellyfinSettingTab(this.app, this));

        // Registry Jellyfin Icon
        addIcon('jellyfin', '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><title>Jellyfin</title><path d="M12 0C8.8 0-1.4 18.5.2 21.7s22.1 3 23.6 0C25.4 18.6 15.2 0 12 0m7.8 19c-1 2-14.5 2-15.6 0C3.2 16.9 10 4.8 12 4.8s8.8 12.1 7.8 14.2M12 9.2c-1 0-4.4 6.1-4 7.2.6 1 7.4 1 8 0 .4-1-3-7.2-4-7.2"/></svg>');

        // Ribbon Icon
        this.addRibbonIcon('jellyfin', 'Browse Jellyfin Library', () => {
            new JellyfinBrowserModal(this.app, this).open();
        });

        // Command to Open Browser
        this.addCommand({
            id: 'jellyfin-browse-library',
            name: 'Browse Library (Rich UI)',
            callback: () => {
                new JellyfinBrowserModal(this.app, this).open();
            }
        });

        // Command to Test Connection
        this.addCommand({
            id: 'jellyfin-test-connection',
            name: 'Test Jellyfin Connection',
            callback: async () => {
                const result = await this.api.testConnection();
                new Notice(result ? 'Connection Successful!' : 'Connection Failed. Check Settings.');
            }
        });

        // Command 1: Generate Table (Simple View)
        this.addCommand({
            id: 'jellyfin-generate-table',
            name: 'Generate Movies Table (Director Structure)',
            callback: async () => {
                await this.generateDirectorMoviesTable();
            }
        });

        // Command 2: Import Movie to Note
        this.addCommand({
            id: 'jellyfin-import-movie-note',
            name: 'Import Movie to Note',
            callback: async () => {
                await this.importMovieToNote();
            }
        });
    }

    async loadSettings() {
        this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    }

    async saveSettings() {
        await this.saveData(this.settings);
        this.api = new JellyfinAPI(this.settings); // Update API instance with new settings
    }

    // Logic for Table Generation
    async generateDirectorMoviesTable() {
        try {
            new Notice("Fetching library...");
            // 1. Fetch Root Folders/Views to find the User's Movie Library
            const views = await this.api.getDirectorsOrMovies();

            // For simplicity, let's ask the user to pick the folder that contains "Directors" (assuming it's a view/collection)
            // If the user's structure is Root -> Directors Folders -> Movies
            new DirectorFolderSuggestModal(this.app, this, views, async (selectedView) => {
                new Notice(`Fetching directors from ${selectedView.Name}...`);
                // 2. Fetch "Directors" (folders inside the selected view)
                const directors = await this.api.getItemsByParent(selectedView.Id);

                let tableMarkdown = "| **Director** | **Item 1** | **Item 2** | **Item 3** | **Item 4** |\n|---|---|---|---|---|\n";

                // Limit to first 10 directors for performance in this demo, or we can paginate.
                // Fetching movies for EACH director might be heavy. Let's do it successfully.
                // We will process a subset or show a progress bar in a real app. 
                // Here we will try first 5 to demonstrate.
                const directorsToProcess = directors.slice(0, 5);

                for (const director of directorsToProcess) {
                    const movies = await this.api.getItemsByParent(director.Id);
                    const movieNames = movies.map(m => m.Name).slice(0, 4); // Take first 4
                    // Pad if less than 4
                    while (movieNames.length < 4) movieNames.push("");

                    tableMarkdown += `| **${director.Name}** | ${movieNames.join(" | ")} |\n`;
                }

                const view = this.app.workspace.getActiveViewOfType(MarkdownView);
                if (view) {
                    const cursor = view.editor.getCursor();
                    view.editor.replaceRange(tableMarkdown, cursor);
                } else {
                    new Notice("Open a Markdown file to insert the table.");
                }

            }).open();

        } catch (e) {
            new Notice("Error fetching data: " + e.message);
            console.error(e);
        }
    }

    // New helper for Button in Browser Modal
    async generateTableForFolder(parentId: string, folderName: string) {
        try {
            const children = await this.api.getItemsByParent(parentId);

            // Check if children are Movies or Folders (Directors)
            // If contents are movies, make a table of movies
            // If contents are folders, make a table of folders (Directors)

            const movies = children.filter(c => c.Type === "Movie");
            const folders = children.filter(c => c.IsFolder || c.Type === "Collection");

            let tableMarkdown = "";

            if (folders.length > 0) {
                // Director/Folder Table Logic
                tableMarkdown = `| **${folderName}** | **Item 1** | **Item 2** | **Item 3** | **Item 4** |\n|---|---|---|---|---|\n`;

                // Process ALL folders (User requested no limits)
                let count = 0;
                const total = folders.length;
                new Notice(`Generating table for ${total} items. This may take a moment...`);

                for (const folder of folders) {
                    count++;
                    if (count % 5 === 0) new Notice(`Processing ${count}/${total}...`);

                    const subItems = await this.api.getItemsByParent(folder.Id);
                    const names = subItems.map(m => m.Name).slice(0, 4);
                    while (names.length < 4) names.push("");
                    tableMarkdown += `| **${folder.Name}** | ${names.join(" | ")} |\n`;
                }
            } else if (movies.length > 0) {
                // Just a list of movies? The user requirement was Director Table.
                // If we are INSIDE a director folder, maybe just list movies?
                // Let's stick to the requested format which assumes we are looking at Directors.
                new Notice("This folder contains movies directly. Please go up one level to generate a Director table.");
                return;
            } else {
                new Notice("No items found to generate table.");
                return;
            }

            // Insert Table
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (view) {
                const cursor = view.editor.getCursor();
                view.editor.replaceRange(tableMarkdown, cursor);
                new Notice("Table generated!");
            } else {
                new Notice("Open a Markdown file to insert the table.");
            }

        } catch (e) {
            new Notice("Error generating table: " + e.message);
        }
    }

    // Logic for Note Import
    async importMovieToNote() {
        try {
            // 1. Pick Library/Director first (Navigation)
            const views = await this.api.getDirectorsOrMovies();
            new DirectorFolderSuggestModal(this.app, this, views, async (selectedView) => {
                new Notice(`Fetching contents of ${selectedView.Name}...`);
                // 2. Pick a "Director" folder or just list all movies (recursive is better if flattened)
                // Let's assume user navigates one level down
                const directors = await this.api.getItemsByParent(selectedView.Id);

                new DirectorFolderSuggestModal(this.app, this, directors, async (selectedDirector) => {
                    // 3. Pick a Movie
                    const movies = await this.api.getItemsByParent(selectedDirector.Id);
                    new MovieSuggestModal(this.app, this, movies, async (movie) => {
                        await this.createMovieNote(movie);
                    }).open();
                }).open();
            }).open();
        } catch (e) {
            new Notice("Error: " + e.message);
        }
    }

    async createMovieNote(basicMovie: any) {
        // Fetch Full Details first (Lazy Load)
        new Notice(`Fetching details for ${basicMovie.Name}...`);
        const movie = await this.api.getItemDetails(basicMovie.Id);

        // Output Folder Logic
        let folderPath = this.settings.outputFolder.trim().replace(/\/$/, ''); // Remove trailing slash
        if (folderPath && folderPath !== '') {
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                await this.app.vault.createFolder(folderPath);
            }
            folderPath = folderPath + '/';
        } else {
            folderPath = '';
        }

        const filename = `${folderPath}${movie.Name.replace(/[\\/:*?"<>|]/g, "")}.md`; // Sanitize filename

        // Metadata Sanitisation
        // Task A: Handle Colons in Titles (Replace with em-dash)
        const cleanTitle = movie.Name.replace(/:/g, ' —');

        // Task B: Handle Inner Quotation Marks in Overview (Replace with single quotes)
        const cleanOverview = (movie.Overview || '').replace(/"/g, "'");

        // --- NEW TAGS LOGIC ---
        // 1. Parse template (comma separated)
        // 2. Slugify values
        // 3. Format as YAML list

        let tagsList: string[] = [];
        const templateParts = this.settings.tagsTemplate.split(',').map(s => s.trim()).filter(s => s.length > 0);

        const directorName = movie.People ? movie.People.find((p: any) => p.Type === 'Director')?.Name || '' : '';
        const year = movie.ProductionYear || '';
        const genres = movie.Genres ? movie.Genres : [];
        const actors = movie.People ? movie.People.filter((p: any) => p.Type === 'Actor').map((p: any) => p.Name) : [];

        for (const part of templateParts) {
            if (part === '{{director}}') {
                if (directorName) tagsList.push(this.slugify(directorName));
            } else if (part === '{{title}}') {
                tagsList.push(this.slugify(movie.Name));
            } else if (part === '{{year}}') {
                if (year) tagsList.push(this.slugify(year.toString()));
            } else if (part === '{{genre}}') {
                // Genres is already an array, slugify each
                genres.forEach((g: string) => tagsList.push(this.slugify(g)));
            } else if (part === '{{actors}}') {
                // Actors array
                actors.forEach((a: string) => tagsList.push(this.slugify(a)));
            } else {
                // Static tag (e.g. 'jellyfin')
                // Check if it's a known variable we missed or just text
                // If it looks like a variable {{...}} but not matches, maybe ignore or keep raw?
                // User requirement: "generate, all in lowercase, tags"
                // Let's slugify everything for safety
                tagsList.push(this.slugify(part));
            }
        }

        // Deduplicate
        tagsList = [...new Set(tagsList)];


        // Build Frontmatter keys
        const fmLines = [`---`];

        // Generator Map
        const generators: Record<string, () => Promise<void> | void> = {
            'title': () => { fmLines.push(`${this.settings.keyTitle}: ${cleanTitle}`); },

            'original_title': () => {
                if (this.settings.includeOriginalTitle) fmLines.push(`${this.settings.keyOriginalTitle}: ${this.safeValue(movie.OriginalTitle || '')}`);
            },

            'genre': () => {
                if (this.settings.includeGenre) fmLines.push(`${this.settings.keyGenre}: ${genres.map((g: string) => this.safeValue(g)).join(', ')}`);
            },

            'director': () => {
                if (this.settings.includeCast) fmLines.push(`${this.settings.keyDirector}: ${this.safeValue(this.getPeopleByType(movie.People, 'Director'))}`);
            },

            'cast': () => {
                if (this.settings.includeCast) fmLines.push(`${this.settings.keyCast}: ${this.safeValue(this.getPeopleByType(movie.People, 'Actor'))}`);
            },

            'production_locations': () => {
                if (this.settings.includeProductionLocations) {
                    const locs = movie.ProductionLocations || [];
                    const cleanLocs = locs.filter((l: string) => l && l.trim().length > 0).join(', ');
                    fmLines.push(`${this.settings.keyProductionLocations}: ${this.safeValue(cleanLocs)}`);
                }
            },

            'rating_community': () => {
                if (this.settings.includeRating) {
                    const rawRating = movie.CommunityRating;
                    const commRating = parseFloat(rawRating);
                    if (!isNaN(commRating) && isFinite(commRating)) {
                        fmLines.push(`${this.settings.keyRating}: ${commRating}`);
                    }
                }
            },

            'rating_critic': () => {
                if (this.settings.includeCriticRating) {
                    const criticRating = parseFloat(movie.CriticRating);
                    if (typeof criticRating === 'number' && !isNaN(criticRating)) {
                        fmLines.push(`${this.settings.keyCriticRating}: ${criticRating}`);
                    } else if (movie.CriticRating) {
                        const cleanCritic = parseFloat(movie.CriticRating.replace('%', ''));
                        if (!isNaN(cleanCritic)) {
                            fmLines.push(`${this.settings.keyCriticRating}: ${cleanCritic}`);
                        }
                    }
                }
            },

            'rating_parental': () => {
                if (movie.OfficialRating) {
                    fmLines.push(`${this.settings.keyParentalRating}: ${this.safeValue(movie.OfficialRating)}`);
                }
            },

            'tags': () => {
                if (this.settings.includeTags && tagsList.length > 0) {
                    fmLines.push(`tags:`);
                    tagsList.forEach(tag => fmLines.push(`  - ${tag}`));
                }
            },

            'plot': () => {
                if (this.settings.includePlot) fmLines.push(`${this.settings.keyPlot}: "${cleanOverview}"`);
            },

            'year': () => {
                if (this.settings.includeYear) {
                    const prodYear = parseInt(movie.ProductionYear);
                    if (!isNaN(prodYear)) {
                        fmLines.push(`${this.settings.keyYear}: ${prodYear}-01-01`);
                    }
                }
            },

            'tmdb_id': () => {
                if (this.settings.includeTmdbId) fmLines.push(`TmdbId: ${movie.ProviderIds?.Tmdb || ''}`);
            },

            'watched': () => {
                if (this.settings.includeWatched) fmLines.push(`${this.settings.keyWatched}: false`);
            },

            'poster': async () => {
                if (this.settings.includePoster) {
                    const posterUrl = `${this.settings.serverUrl}/Items/${movie.Id}/Images/Primary`;
                    if (this.settings.downloadPoster) {
                        const localPosterPath = await this.downloadPosterImage(movie, posterUrl);
                        fmLines.push(`Poster: "[[${localPosterPath}]]"`);
                    } else {
                        fmLines.push(`Poster: ${posterUrl}`);
                    }
                }
            }
        };

        // Execution Loop
        // Use default order if settings are missing keys (e.g. migration)
        const order = this.settings.frontmatterOrder || DEFAULT_SETTINGS.frontmatterOrder;

        for (const key of order) {
            const generator = generators[key];
            if (generator) {
                await generator();
            } else if (this.settings.customFields && this.settings.customFields.includes(key)) {
                fmLines.push(`${key}: `);
            }
        }

        fmLines.push(`---`);

        const frontmatter = fmLines.join("\n");

        try {
            await this.app.vault.create(filename, frontmatter);
            new Notice(`Created note: ${filename}`);
            // Open the new file
            const file = this.app.vault.getAbstractFileByPath(filename);
            if (file instanceof TFile) {
                this.app.workspace.getLeaf(true).openFile(file);
            }
        } catch (e) {
            new Notice("Error creating note: " + e.message);
        }
    }

    slugify(text: string): string {
        return text.toString().toLowerCase()
            .replace(/\s+/g, '_')           // Replace spaces with -
            .replace(/[#,.\[\]:;"']/g, '');  // Remove invalid tag chars (keep letters, numbers, unicode)
    }

    // Helper to sanitize Metadata text (remove colons, quotes) to prevent YAML breakage
    safeValue(text: string): string {
        if (!text) return '';
        return text.toString()
            .replace(/:/g, ' —')   // Replace colons with em-dash
            .replace(/"/g, "'");   // Replace double quotes with single quotes
    }

    getPeopleByType(people: any[], type: string): string {
        if (!people) return '';
        return people.filter(p => p.Type === type).map(p => p.Name).join(', ');
    }

    // --- New Bulk Action Handlers ---

    async generateTableFromItems(items: any[]) {
        try {
            const view = this.app.workspace.getActiveViewOfType(MarkdownView);
            if (!view) {
                new Notice("Open a Markdown file to insert the table.");
                return;
            }

            let tableMarkdown = "| **Name** | **Item 1** | **Item 2** | **Item 3** | **Item 4** |\n|---|---|---|---|---|\n";

            let count = 0;
            const total = items.length;
            new Notice(`Generating table for ${total} items...`);

            for (const item of items) {
                count++;
                if (count % 5 === 0) new Notice(`Processing ${count}/${total}...`);

                // If item is a Folder/Collection, fetch children
                if (item.IsFolder || item.Type === "Collection" || item.Type === "UserView") {
                    const subItems = await this.api.getItemsByParent(item.Id);
                    const names = subItems.map(m => m.Name).slice(0, 4);
                    while (names.length < 4) names.push("");
                    tableMarkdown += `| **${item.Name}** | ${names.join(" | ")} |\n`;
                } else {
                    // Just a movie?
                    tableMarkdown += `| **${item.Name}** | (Movie) | | | |\n`;
                }
            }

            const cursor = view.editor.getCursor();
            view.editor.replaceRange(tableMarkdown, cursor);
            new Notice("Table generated!");

        } catch (e) {
            new Notice("Error: " + e.message);
        }
    }

    async createNotesForItems(items: any[]) {
        let created = 0;
        new Notice(`Importing ${items.length} notes...`);

        for (const item of items) {
            if (item.Type === "Movie") {
                await this.createMovieNote(item);
                created++;
            } else if (item.IsFolder || item.Type === "Collection") {
                const subItems = await this.api.getItemsByParent(item.Id);
                const subMovies = subItems.filter(i => i.Type === "Movie");
                for (const m of subMovies) {
                    await this.createMovieNote(m);
                    created++;
                }
            }
        }
        new Notice(`Finished! Created/Updated ${created} notes.`);
    }
    async downloadPosterImage(movie: any, url: string): Promise<string | null> {
        try {
            const folderPath = this.settings.posterFolderPath.replace(/\/$/, '');
            if (!this.app.vault.getAbstractFileByPath(folderPath)) {
                await this.app.vault.createFolder(folderPath);
            }

            const safeName = movie.Name.replace(/[\\/:*?"<>|]/g, "").trim();

            // Extract and sanitize Director name
            const director = movie.People ? movie.People.find((p: any) => p.Type === 'Director')?.Name : null;
            let filenameBase = safeName;

            if (director) {
                const safeDirector = director.replace(/[\\/:*?"<>|]/g, "").trim();
                filenameBase = `${safeName} — ${safeDirector}`;
            }

            const filename = `${folderPath}/${filenameBase}.jpg`;

            // Check if exists
            if (this.app.vault.getAbstractFileByPath(filename)) {
                return filename;
            }

            const response = await requestUrl({ url: url });
            if (response.status === 200) {
                await this.app.vault.createBinary(filename, response.arrayBuffer);
                return filename;
            }
            return null;

        } catch (e) {
            console.error("Failed to download poster", e);
            new Notice(`Failed to download poster for ${movie.Name}`);
            return null;
        }
    }
}
