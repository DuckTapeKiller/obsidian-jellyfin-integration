import { App, Modal, Notice, setIcon } from "obsidian";
import JellyfinPlugin from "./main";

export class JellyfinBrowserModal extends Modal {
    plugin: JellyfinPlugin;
    currentParentId: string | null = null;
    currentItems: any[] = [];
    selectedItems: Set<string> = new Set(); // IDs of selected items
    breadcrumbs: { id: string | null, name: string }[] = [];
    isSelectAll = false;
    selectionCountEl: HTMLElement;
    gridEl: HTMLElement;

    constructor(app: App, plugin: JellyfinPlugin) {
        super(app);
        this.plugin = plugin;
    }

    async onOpen() {
        const { contentEl } = this;
        contentEl.empty();
        contentEl.addClass("jellyfin-browser-container");

        // Initial Load
        await this.loadItems();
        this.render();
    }

    async loadItems(parentId: string | null = null) {
        try {
            if (parentId) {
                this.currentItems = await this.plugin.api.getItemsByParent(parentId);
            } else {
                // Root views
                this.currentItems = await this.plugin.api.getDirectorsOrMovies();
            }
            this.currentParentId = parentId;
            this.selectedItems.clear(); // Clear selection on navigation
            this.isSelectAll = false;
        } catch (error) {
            new Notice("Error loading items: " + error.message);
        }
    }

    addToBreadcrumb(id: string | null, name: string) {
        // Prevent duplicate abuse (spam click)
        if (this.breadcrumbs.length > 0) {
            const last = this.breadcrumbs[this.breadcrumbs.length - 1];
            if (last.id === id) return;
        }
        this.breadcrumbs.push({ id, name });
    }

    popBreadcrumbTo(index: number) {
        this.breadcrumbs = this.breadcrumbs.slice(0, index + 1);
        const target = this.breadcrumbs[index];
        this.loadItems(target.id).then(() => this.render());
    }

    goBack() {
        if (this.breadcrumbs.length > 0) {
            const newLength = this.breadcrumbs.length - 1;
            // If we are about to pop the last remaining breadcrumb, we go to Root (null)
            if (newLength === 0) {
                this.breadcrumbs = [];
                this.loadItems(null).then(() => this.render());
            } else {
                // Otherwise, go to the previous breadcrumb
                this.popBreadcrumbTo(newLength - 1);
            }
        }
    }

    render() {
        const { contentEl } = this;
        contentEl.empty();

        // --- Header Section ---
        const header = contentEl.createDiv("jellyfin-browser-header");

        // Back Button (Problem C)
        const backBtn = header.createEl("button", { cls: "clickable-icon", title: "Go Back" });
        setIcon(backBtn, "arrow-left");
        backBtn.onclick = () => this.goBack();
        if (this.breadcrumbs.length === 0) backBtn.disabled = true;

        // Home Button
        const homeBtn = header.createEl("button", { cls: "clickable-icon", title: "Go Home" });
        setIcon(homeBtn, "home");
        homeBtn.onclick = async () => {
            this.breadcrumbs = [];
            await this.loadItems(null);
            this.render();
        };

        // Breadcrumbs Text
        const breadcrumbsContainer = header.createDiv("jellyfin-breadcrumbs");
        this.breadcrumbs.forEach((crumb, index) => {
            if (index > 0) breadcrumbsContainer.createSpan({ text: " > " });
            const crumbEl = breadcrumbsContainer.createSpan({
                text: crumb.name,
                cls: "breadcrumb-item"
            });
            crumbEl.style.cursor = "pointer";
            crumbEl.onclick = () => this.popBreadcrumbTo(index);
        });

        // --- Action Toolbar (Problem B & D) ---
        const toolbar = contentEl.createDiv("jellyfin-browser-toolbar");
        toolbar.style.padding = "5px 10px";
        toolbar.style.display = "flex";
        toolbar.style.gap = "10px";
        toolbar.style.alignItems = "center";
        toolbar.style.background = "var(--background-secondary)";

        // Select All Checkbox
        const selectAllContainer = toolbar.createDiv({ cls: "jellyfin-select-all" });
        selectAllContainer.style.display = "flex";
        selectAllContainer.style.alignItems = "center";
        selectAllContainer.style.gap = "5px";

        const selectAllCb = selectAllContainer.createEl("input", { type: "checkbox" });
        selectAllCb.checked = this.isSelectAll;
        selectAllCb.onclick = (_e) => {
            this.isSelectAll = selectAllCb.checked;
            if (this.isSelectAll) {
                this.currentItems.forEach(i => this.selectedItems.add(i.Id));
            } else {
                this.selectedItems.clear();
            }
            this.updateSelectionCount();
            this.render();
        };
        selectAllContainer.createSpan({ text: "Select All" });

        // Selection Count
        this.selectionCountEl = toolbar.createSpan({ cls: "jellyfin-selection-count" });
        this.selectionCountEl.style.marginLeft = "10px";
        this.selectionCountEl.style.fontSize = "0.9em";
        this.selectionCountEl.style.color = "var(--text-muted)";
        this.updateSelectionCount();

        // --- Search Bar ---
        const searchContainer = toolbar.createDiv({ cls: "jellyfin-search-container" });
        searchContainer.style.flexGrow = "1";
        searchContainer.style.maxWidth = "300px";
        searchContainer.style.marginLeft = "10px";

        const searchInput = searchContainer.createEl("input", { type: "text", placeholder: "Search..." });
        searchInput.style.width = "100%";
        searchInput.oninput = (e) => {
            const query = (e.target as HTMLInputElement).value.toLowerCase();
            this.filterItems(query);
        };

        // Action Buttons
        const buttonsContainer = toolbar.createDiv();
        buttonsContainer.style.marginLeft = "auto";
        buttonsContainer.style.display = "flex";
        buttonsContainer.style.gap = "10px";

        const createTableBtn = buttonsContainer.createEl("button", { text: "Create Table" });
        createTableBtn.onclick = async () => {
            const itemsToProcess = this.currentItems.filter(i => this.selectedItems.has(i.Id));
            if (itemsToProcess.length === 0) {
                new Notice("Please select items first.");
                return;
            }
            await this.plugin.generateTableFromItems(itemsToProcess);
            this.close();
        };

        const createNotesBtn = toolbar.createEl("button", { text: "Import Notes" });
        createNotesBtn.onclick = async () => {
            const itemsToProcess = this.currentItems.filter(i => this.selectedItems.has(i.Id));
            if (itemsToProcess.length === 0) {
                new Notice("Please select items first.");
                return;
            }
            await this.plugin.createNotesForItems(itemsToProcess);
            this.close();
        };

        // --- Grid Content ---
        const grid = contentEl.createDiv("jellyfin-browser-grid");
        this.gridEl = grid;

        // Apply Column Setting
        grid.style.setProperty('--grid-columns', this.plugin.settings.gridColumns.toString());

        this.renderGridItems(this.currentItems);
    }


    updateSelectionCount() {
        if (this.selectionCountEl) {
            const count = this.selectedItems.size;
            this.selectionCountEl.setText(count > 0 ? `${count} selected` : "");
        }
    }

    // Separated Grid Rendering for Filtering
    renderGridItems(items: any[]) {
        if (!this.gridEl) return;
        this.gridEl.empty();

        if (items.length === 0) {
            this.gridEl.createDiv({ text: "No items found." });
            return;
        }

        items.forEach(item => {
            const card = this.gridEl.createDiv("jellyfin-card");
            // Highlight if selected
            if (this.selectedItems.has(item.Id)) {
                card.classList.add("is-selected");
                card.style.borderColor = "var(--interactive-accent)";
                card.style.borderWidth = "2px";
                card.style.borderStyle = "solid";
            }

            // Image or Icon
            const isFolder = item.Type === "Collection" || item.Type === "UserView" || item.IsFolder;
            const hasImage = item.ImageTags && item.ImageTags.Primary;

            // Card Click Handler (Covers entire card area, no dead zones)
            card.onclick = (e) => {
                if (isFolder) {
                    // Folder navigation
                    this.addToBreadcrumb(item.Id, item.Name);
                    this.loadItems(item.Id).then(() => this.render());
                } else {
                    // Movie Interaction:
                    // User Request: "TO SELECT, YOU NEED TO CLICK THE CHECKBOX"
                    // Current Decision: Card Body Click -> Do Nothing
                }
            };

            // Checkbox Overlay
            const cbContainer = card.createDiv("jellyfin-card-checkbox");

            const cb = cbContainer.createEl("input", { type: "checkbox", cls: "jellyfin-specific-checkbox" });
            cb.checked = this.selectedItems.has(item.Id);
            cb.onclick = (e) => {
                // IMPORTANT: Stop propagation to prevent card click handler from firing
                e.stopPropagation();

                if (cb.checked) {
                    this.selectedItems.add(item.Id);
                } else {
                    this.selectedItems.delete(item.Id);
                }

                this.updateSelectionCount();

                // Manually sync visuals
                if (cb.checked) {
                    card.classList.add("is-selected");
                    card.style.borderColor = "var(--interactive-accent)";
                    card.style.borderWidth = "2px";
                    card.style.borderStyle = "solid";
                    card.style.backgroundColor = "var(--background-secondary-alt)";
                } else {
                    card.classList.remove("is-selected");
                    card.style.removeProperty("border-color");
                    card.style.removeProperty("border-width");
                    card.style.removeProperty("border-style");
                    card.style.removeProperty("background-color");
                }
            };

            const contentContainer = card.createDiv("jellyfin-card-content");
            // contentContainer click removed (Handled by card.onclick)

            // Double Click to Import (REMOVED - User Request)
            // if (!isFolder) {
            //    contentContainer.ondblclick = async () => {
            //         await this.plugin.createMovieNote(item);
            //         this.close();
            //    };
            // }


            if (hasImage) {
                const imgUrl = this.plugin.api.getImageUrl(item.Id);
                const img = contentContainer.createEl("img", { cls: "jellyfin-poster" });
                img.src = imgUrl;
            } else {
                const iconDiv = contentContainer.createDiv("jellyfin-folder-icon");
                setIcon(iconDiv, isFolder ? "folder" : "film");
            }

            // Title
            contentContainer.createDiv({ cls: "jellyfin-card-title", text: item.Name });
        });
    }

    filterItems(query: string) {
        if (!query) {
            this.renderGridItems(this.currentItems);
            return;
        }
        const filtered = this.currentItems.filter(item => item.Name.toLowerCase().includes(query));
        this.renderGridItems(filtered);
    }

    onClose() {
        const { contentEl } = this;
        contentEl.empty();
    }
}
