# InstantWar-Auto-Login

[![Latest Release](https://img.shields.io/github/v/release/markvarvel/InstantWar-Auto-Login?label=Latest%20Release)](https://github.com/markvarvel/InstantWar-Auto-Login/releases/latest)
[![Download](https://img.shields.io/badge/Download-iw--auto--login--dist.zip-blue?style=for-the-badge)](https://github.com/markvarvel/InstantWar-Auto-Login/releases/latest/download/iw-auto-login-dist.zip)

Chrome extension (Manifest V3) for automated login, refresh, and tab management for InstantWar. Works on Windows, macOS, and Linux. Also compatible with Brave Browser.

## Features

- **Login Automation** — Bulk login with multiple accounts from an Excel file, auto-tab grouping by color
- **Tab Refresh** — Refresh all InstantWar tabs with optional range filtering
- **Dark Mode** — Follows system theme preference

## Installation

### Option 1: Download Pre-Built Extension (Recommended)

1. **Download** the latest [iw-auto-login-dist.zip](https://github.com/markvarvel/InstantWar-Auto-Login/releases/latest/download/iw-auto-login-dist.zip) from GitHub Releases
2. **Extract** the zip file to a permanent folder
   - **Windows:** `C:\Extensions\InstantWar-Auto-Login\`
   - **macOS:** `~/Extensions/InstantWar-Auto-Login/`
   - **Linux:** `~/Extensions/InstantWar-Auto-Login/`
3. Open `chrome://extensions/` in Chrome (or `brave://extensions/` in Brave Browser)
4. Enable **Developer mode** (toggle in top right)
5. Click **Load unpacked**
6. Select the extracted `dist` folder

### Option 2: Build from Source

```bash
# Clone the repository
git clone https://github.com/markvarvel/InstantWar-Auto-Login.git
cd InstantWar-Auto-Login

# Install dependencies
npm install

# Build the extension
npm run build
```

Then load the `dist` folder using steps 3–6 above.

## Setup — Connecting Your Login File

The extension does **not** bundle your login data. On first run you'll be prompted to choose your own `.xlsx` file — the extension remembers this choice and auto-reloads it whenever you open the popup.

### Quick Start

1. **Open the bundled template** — Find `IW-Logins-Template.xlsx` in the `public/` folder (or in the extension's `dist/` after building). Open it in Excel, LibreOffice, or Google Sheets.
2. **Add your accounts** — Fill in one row per account using the column format below.
3. **Save as `.xlsx`** — Save the file somewhere persistent
   - **Windows:** `D:\IW\IW-Logins.xlsx` or `C:\Users\you\Google Drive\IW\IW-Logins.xlsx`
   - **macOS:** `~/Google Drive/IW/IW-Logins.xlsx`
   - **Linux:** `~/Google Drive/IW/IW-Logins.xlsx`
4. **Choose it in the extension** — Open the extension popup → Login tab → click **Choose XLSX File** → select your saved file.
5. **Done!** — The extension will auto-reload your file every time you open the popup. If the file is moved or deleted, you'll be prompted to choose it again.

### Reloading

Click **Reload File** to re-read your xlsx from disk (picks up any changes you've made). If the file reference has expired (e.g. browser restart), the extension will ask you to choose it again.

### Changing Files

Click **Choose Different File** to switch to a different xlsx file at any time.

### How File Access Works

The extension uses the **File System Access API** (`window.showOpenFilePicker`) to maintain a persistent handle to your xlsx file. This allows it to re-read your file automatically on each popup open without asking you to choose it again.

**Persistent file handles** (File System Access API) — When available, the extension stores a direct reference to your file on disk. This means:
- The file reloads automatically every time you open the popup
- You only need to choose the file once (until the browser clears the handle)
- If you move or delete the file, the extension detects this and prompts you to choose a new one

**Extension popup fallback** — Chrome extension popups don't have access to the File System Access API, so the extension automatically falls back to a standard `<input type="file">` element. This works identically but requires you to re-select the file if the browser restarts. The extension stores your recent files in IndexedDB, so switching between files is still fast.

**Recent Files** — The extension remembers up to 5 recently used xlsx files in IndexedDB. Use the **Recent Files** dropdown to switch between them without re-browsing.

## Usage

### Login Tab

1. **Choose XLSX File** — Select your `.xlsx` login file (first time only)
2. **Reload File** — Re-read your file from disk to pick up changes
3. **Range Filter** — Optionally enter a range (e.g., `1-5, 8, 10-12`) to only process specific accounts
4. **Start Login Automation** — Opens new tabs and logs in each account sequentially
5. **Stop Login** — Cancels the current login queue

**Timestamp Indicator:**
- 🟢 Green dot (pulsing) — Loaded within last 5 minutes
- 🟢 Green — Loaded within last hour
- 🟠 Orange — Loaded within last day
- 🔴 Red — Loaded more than a day ago

### Refresh Tab

1. **Tab Range** — Optionally enter a range to refresh specific tabs
2. **Start Refresh** — Reloads all open InstantWar tabs sequentially (waits ~27s between each)
3. **Stop Refresh** — Cancels the refresh cycle

## Excel File Format

The `.xlsx` file should have a single sheet with these column headers:

| Column | Type | Required | Description |
|--------|------|----------|-------------|
| `User Name` | string | ✅ | Login username |
| `Player Name` | string | ❌ | In-game player name (display only) |
| `Email` | string | ❌ | Account email |
| `Password` | string | ✅ | Account password |
| `Old Pass` | string | ❌ | Previous password (for password changes) |
| `Tab` | string | ❌ | Tab group name in Chrome (defaults to "IW Accounts") |
| `Position` | number | ❌ | Account position/sort order |
| `Color` | string | ❌ | Tab group color (e.g., `blue`, `red`, `green` — defaults to `blue`) |

### Optional Field Defaults

If you leave any optional fields blank, the extension handles them gracefully:

| Column | Default Behavior |
|--------|------------------|
| `Player Name` | Ignored — only used for display |
| `Email` | Ignored — not required for login |
| `Old Pass` | Ignored — only needed for password changes |
| `Tab` | Defaults to `"IW Accounts"` — all accounts grouped together |
| `Position` | Ignored — accounts process in spreadsheet row order |
| `Color` | Defaults to `"blue"` for the tab group color |

At minimum, you only need to fill in `User Name` and `Password` per account.

### Example

| User Name | Player Name | Email | Password | Old Pass | Tab | Position | Color |
|-----------|-------------|-------|----------|----------|-----|----------|-------|
| player1 | Hero1 | p1@email.com | pass123 | old1 | GroupA | 1 | blue |
| player2 | Hero2 | p2@email.com | pass456 | old2 | GroupA | 2 | blue |

## Changelog

| Version | Date | Changes |
|---------|------|---------|
| [v1.0.16](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.16) | 2026-06-14 | Remove dead auto-click code from background.ts, content.ts, and utils.ts |
| [v1.0.15](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.15) | 2026-06-14 | Update release workflow to auto-generate release notes from commit messages |
| [v1.0.14](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.14) | 2026-06-14 | Cross-platform compatibility — Mac/Linux path examples, update-version.js symlink, manifest cleanup |
| [v1.0.13](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.13) | 2026-06-14 | Add changelog section to README documenting all releases |
| [v1.0.12](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.12) | 2026-06-14 | Remove Auto-Click Automation section from README |
| [v1.0.11](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.11) | 2026-06-14 | Remove duplicate `InstantWar-Auto-Login/` subdirectory |
| [v1.0.10](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.10) | 2026-06-14 | Make Player Name, Email, Old Pass, Tab, Position optional; update xlsx template to only require User Name and Password; add Optional Field Defaults docs |
| [v1.0.5](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.5) | 2026-06-14 | Fix `update-version.js` to keep source manifest in sync; rename release zip to `iw-auto-login-dist.zip`; add GitHub Actions release workflow |
| [v1.0.4](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.4) | 2026-06-14 | Brave Browser compatibility; README docs for File System Access API behavior |
| [v1.0.3](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.3) | 2026-06-14 | Fix `showOpenFilePicker` fallback for Chrome extension popups; consolidate file handlers |
| [v1.0.2](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.2) | 2026-06-13 | Rename to InstantWar-Auto-Login; remove legacy helpers; update README with badges |
| [v1.0.1](https://github.com/markvarvel/InstantWar-Auto-Login/releases/tag/v1.0.1) | 2026-06-13 | Initial release — dynamic xlsx loading, Recent Files dropdown, schema validation, CI workflow |

## Prerequisites

You need these installed on your computer before you can build or modify the extension:

1. **Node.js** (version 20 or higher) — Download from [nodejs.org](https://nodejs.org)
2. **Git** — Download from [git-scm.com](https://git-scm.com)
3. A code editor (VS Code recommended — [download here](https://code.visualstudio.com))

## How to Build & Modify the Extension

### Step 1: Download the code

Open a terminal (Command Prompt or PowerShell on Windows, Terminal on Mac/Linux) and run:

```bash
git clone https://github.com/markvarvel/InstantWar-Auto-Login.git
cd InstantWar-Auto-Login
```

### Step 2: Install the tools

```bash
npm install
```
This downloads all the code libraries the extension needs. Run this once, or again if `package.json` or `package-lock.json` changes.

### Step 3: Build the extension

```bash
npm run build
```
This creates a `dist/` folder with the ready-to-use extension files.

### Step 4: Load it in Chrome

1. Open `chrome://extensions/` in your browser
2. Turn on **Developer mode** (toggle in top right)
3. Click **Load unpacked**
4. Select the `dist` folder from this project

### Step 5: Make changes and rebuild

If you edit the code, run `npm run build` again, then click the refresh button 🔄 on the extension card in `chrome://extensions/`.

### Debugging

To see errors or debug the extension:
- **Popup errors:** Right-click the extension icon → **Inspect popup**
- **Background errors:** Go to `chrome://extensions/` → find your extension → click the **"service worker"** link

### Other useful commands

| Command | What it does |
|---------|-------------|
| `npm run dev` | Starts a **live-reload server** — the extension updates automatically as you save changes (use this while editing code) |
| `npm run build` | Builds the extension into the `dist/` folder (use this when you're done editing, or before loading in Chrome). Also **automatically bumps the version number** |
| `npm run lint` | Checks your code for mistakes |

## How to Push Updates to GitHub

Every change goes through three steps: **stage** (pick what to save) → **commit** (save with a description) → **push** (upload to GitHub).

```bash
# Stage all changed files (tells Git what to save)
git add -A

# Commit your changes with a description of what you did
git commit -m "Describe what you changed"

# Push to GitHub (uploads your saved changes)
git push origin main
```

> ⚠️ **Tip:** Only run `git add -A` if you want to save ALL changes. To save specific files only, use `git add path/to/file.ts` instead.

## How to Create a Release

1. Make sure all changes are committed and pushed
2. Run `npm run build` — this **auto-increments the version number**
3. Check `package.json` for the new version number (e.g., `v1.0.28`)
4. Tag the release with that version:
   ```bash
   git add -A
   git commit -m "Bump version to v1.0.XX"
   git tag -a v1.0.XX -m "Release v1.0.XX: What changed"
   git push origin main --tags
   ```
5. **That's it!** GitHub Actions automatically builds the extension, creates a `.zip` file, and publishes the release — check the **Releases** tab on GitHub

## What This Extension Is Built With

| Tool | What it does |
|------|-------------|
| **React** | Builds the user interface (buttons, tabs, forms) |
| **TypeScript** | JavaScript with error-checking built in |
| **Vite** | Bundles all the code into fast, optimized files |
| **MUI** | Pre-built UI components (buttons, alerts, tabs) |
| **SheetJS (xlsx)** | Reads Excel files to extract your login data |
| **Chrome Extension Manifest V3** | Tells Chrome this is an extension and what it can do |

## Permissions

| Permission | Purpose |
|------------|---------|
| `tabs` | Query, create, and manage browser tabs |
| `storage` | Persist login data, logs, and settings |
| `cookies` | Clear cookies for fresh logins |
| `tabGroups` | Organize tabs into colored groups |
| `scripting` | Inject content scripts into tabs |
