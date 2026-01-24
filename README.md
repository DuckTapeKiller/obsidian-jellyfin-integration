![jellyfin](screenshots/pixel_art_jellyfin_integration.png)

This plugin integrates your **Jellyfin** media server with **Obsidian**, allowing you to browse your movie library directly within Obsidian and create rich Markdown notes for your movies.

It is designed to be highly customizable, letting you control exactly what metadata is imported, how it is named, and how images are handled.


https://github.com/user-attachments/assets/001bd861-e9ac-4dc7-bd27-241ce925e94b


---

## ✨ Features

- **Visual Library Browser**: Browse your Jellyfin movie library using a visual grid of movie posters.
- **One-Click Import**: Click on any movie card to instantly generate a Markdown note in your vault.
- **Comprehensive Metadata**: Automatically fetches and saves metadata including:
  - Title & Original Title
  - Director & Cast
  - Release Year
  - Genres & Tags
  - Plot Summary (Overview)
  - Ratings (Community, Critic, Parental)
  - Production Locations
  - TmdbId
- **Poster Management**:
  - **Remote Links**: Display posters using direct links to your Jellyfin server.
  - **Local Download**: Option to download posters directly to your vault for offline access.
  - **Smart Naming**: Downloaded posters are named `Title — Director.jpg` to avoid collisions.
- **Metadata Sanitization**:
  - Automatically replaces colons (`:`) in titles with em-dashes (`—`) for cleaner filenames and YAML.
  - Sanitizes quotes in plot summaries to ensure valid Frontmatter.
- **Highly Configurable**:
  - **Toggle Fields**: Choose exactly which metadata fields to include or exclude.
  - **Rename Keys**: Customize the YAML key names (e.g., rename `Director` to `Directed By`).

---

## ⚙️ Settings Guide

To configure the plugin, go to **Settings** -> **Jellyfin Integration**.

### Connection Settings
* **Server URL**: The full URL of your Jellyfin server (e.g., `http://192.168.1.10:8096`).
* **API Key**: An API key generated from your Jellyfin Dashboard (under **Advanced** -> **API Keys**).
* **User ID**: This is a **specific hexadecimal ID** (e.g., `5d28a0...`), **NOT** your username.
    *   **How to find it**: Go to your Jellyfin Dashboard -> **Users**, click on your user profile. The ID is in the URL bar (e.g., `.../userId/5d28a0...`).
* **Test Connection**: Click this button to verify your credentials.

### Note Generation
* **Output Folder**: The folder in your vault where movie notes will be created (e.g., `Movies`).
* **Tags Template**: Defaut tags to add to every movie note. Supports dynamic placeholders like `{{genre}}`, `{{year}}`, `{{director}}`.

### Poster Management
* **Download Poster**:
  * **Status (Off)**: Links to the image on your Jellyfin server. Requires network connection to view.
  * **Status (On)**: Downloads the image to your vault.
* **Poster Storage Path**: The folder where downloaded images are saved (e.g., `Assets/Posters`).
* **Smart Naming**: Images are automatically named `Title — Director.jpg`.

### Frontmatter Keys & Order
This section allows you to fully customize the YAML front matter of your notes.

For each field, you have three controls:
1.  **Toggle Switch**: Turn **ON** to include the field, **OFF** to completely exclude it.
2.  **Text Input**: Rename the key (e.g., rename `Director` to `Directed By`).
3.  **Drag & Drop**: **Drag any row** by the handle (`☰`) to change the order in which fields appear in the generated note.

**Available Fields:**
* **Title** (Mandatory, renameable)
* **Director** (Mandatory, renameable)
* **Original Title**
* **Cast**
* **Genre**
* **Year**
* **Plot / Overview**
* **Production Locations**
* **Rating** (Community & Critic)
* **Parental Rating**
* **Tags**
*   **TmdbId**
*   **Watched Status**: A checkbox property (e.g., `Watched: false`) to track your viewing history.
*   **Poster Key**: The key used for the image path (e.g., `Poster: ...`).

---

## 🚀 How to Use

1.  **Click the Jellyfin Icon** in the left ribbon sidebar.
    *   *(Alternatively, use the Command Palette and search for "Browse Library")*
2.  A visual grid of your movies will open.
    *   Navigate folders by clicking on them.
    *   Use the **Breadcrumbs** at the top to go back.
4.  **Click on a Movie Card**.
5.  A new note will be created in your defined **Output Folder** with all the metadata you've configured.

## IMPORTANT:
**IF YOU HAVE A LARGE FILM COLLECTION, IT IS NORMAL THAT WHEN CLICKING ON THE FOLDER CONTAINING YOUR MOVIES, THE PLUGIN TAKES A WHILE TO DISPLAY THE INFORMATION.**



---

## 🛠️ Troubleshooting

- **Connection Failed?**: Ensure your Server URL includes the port and `http://` or `https://`. Check that your API key is correct.
- **Empty Checkboxes?**: Some themes may override checkbox styles. This plugin attempts to enforce visibility, but switching themes may resolve the issue.
- **Visual Glitches**: If the movie grid layout appears incorrect, try adjusting the **Grid Columns** setting to better match your screen size.
