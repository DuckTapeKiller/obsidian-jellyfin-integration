import { requestUrl, Notice } from 'obsidian';
import { JellyfinPluginSettings } from './settings';

export class JellyfinAPI {
    settings: JellyfinPluginSettings;

    constructor(settings: JellyfinPluginSettings) {
        this.settings = settings;
    }

    private getHeaders() {
        return {
            'X-Emby-Token': this.settings.apiKey,
            'Content-Type': 'application/json'
        };
    }

    async testConnection(): Promise<boolean> {
        if (!this.settings.serverUrl || !this.settings.apiKey) return false;
        try {
            const url = `${this.settings.serverUrl}/System/Info`;
            const response = await requestUrl({
                url: url,
                method: 'GET',
                headers: this.getHeaders()
            });
            return response.status === 200;
        } catch (error) {
            console.error('Jellyfin Connection Failed:', error);
            // Re-throw or return specific error for UI to display
            if (error.status === 401) throw new Error("401 Unauthorized: Check API Key / User ID");
            if (error.status === 404) throw new Error("404 Not Found: Check Server URL");
            throw error;
        }
    }

    getImageUrl(itemId: string, type: 'Primary' | 'Backdrop' = 'Primary'): string {
        return `${this.settings.serverUrl}/Items/${itemId}/Images/${type}`;
    }

    async getLink(itemId: string): Promise<string> {
        return `${this.settings.serverUrl}/web/index.html#!/details?id=${itemId}`;
    }

    async getDirectorsOrMovies(parentId?: string): Promise<any[]> {
        if (!this.settings.serverUrl) throw new Error("Server URL is missing.");
        if (!this.settings.userId) throw new Error("User ID is missing. Please set it in settings.");

        // Optimized: Only fetch essential fields for browsing (Images, Name, ID, Type)
        let url = `${this.settings.serverUrl}/Users/${this.settings.userId}/Items?Recursive=true&IncludeItemTypes=Movie,BoxSet&Fields=ImageTags,PrimaryImageAspectRatio,ProductionYear`;

        if (parentId) {
            url += `&ParentId=${parentId}`;
        }

        if (!parentId) {
            // Fetch root views to find the movie library
            const viewsUrl = `${this.settings.serverUrl}/Users/${this.settings.userId}/Views`;
            const viewsResponse = await requestUrl({
                url: viewsUrl,
                method: 'GET',
                headers: this.getHeaders()
            });
            return viewsResponse.json.Items;
        }

        try {
            const response = await requestUrl({
                url: url,
                method: 'GET',
                headers: this.getHeaders()
            });
            return response.json.Items;
        } catch (e) {
            console.error(`[Jellyfin Plugin] API Error ${e.status} fetching ${url}`, e);
            new Notice(`Jellyfin API Error: ${e.status}. Check Console.`);
            throw e;
        }
    }

    // Fetch generic items by parent ID (Folder browsing)
    async getItemsByParent(parentId: string): Promise<any[]> {
        // Optimized: Only fetch essential fields
        const url = `${this.settings.serverUrl}/Users/${this.settings.userId}/Items?ParentId=${parentId}&Fields=ImageTags,PrimaryImageAspectRatio,ProductionYear`;
        const response = await requestUrl({
            url: url,
            method: 'GET',
            headers: this.getHeaders()
        });
        return response.json.Items;
    }

    // New: Fetch FULL details for a specific item (Import usage)
    async getItemDetails(itemId: string): Promise<any> {
        const url = `${this.settings.serverUrl}/Users/${this.settings.userId}/Items/${itemId}?Fields=People,Genres,ProductionLocations,CommunityRating,CriticRating,Overview,PremiereDate,OfficialRating,ProviderIds,Tags,ImageTags`;
        const response = await requestUrl({
            url: url,
            method: 'GET',
            headers: this.getHeaders()
        });
        return response.json;
    }
}
