# WARP.md — IW-Auto-Login

## What is this project?

A Chrome extension that automates login and tab management for InstantWar (instantwar.com). It reads account credentials from an xlsx spreadsheet, opens tabs, fills login forms, and organizes tabs into Chrome tab groups.

## Tech Stack

- **Language**: TypeScript
- **UI Framework**: React 19 + Material UI 7
- **Build Tool**: Vite 7
- **Testing**: Vitest + jsdom
- **Linting**: ESLint 9
- **Extension API**: Chrome Extensions Manifest V3

## Key Architecture

- **popup/**: React UI rendered in the extension popup (400×550px fixed size)
- **background.ts**: Service worker that manages login queue, tab creation, tab grouping, and refresh automation
- **content.ts**: Injected into InstantWar pages to interact with DOM elements (fill forms, click buttons)
- **utils.ts**: File handling (File System Access API + IndexedDB), xlsx parsing, Chrome storage helpers
- **login-utils.ts**: Pure stateless utility functions (range parsing, validation, formatting)

## Security Rules

- Never commit `.xlsx` files (except the template in `public/`)
- Never commit `.zip` files
- Never commit `.env` files or API keys
- The `.gitignore` blocks `*.xlsx`, `*.zip`, and `.env` files
- The template `public/IW-Logins-Template.xlsx` is explicitly allowed via `!public/IW-Logins-Template.xlsx`

## Build & Test

```bash
npm install          # Install dependencies
npm run build        # Build extension to dist/
npm run test         # Run unit tests
npm run lint         # Run ESLint
```

## Chrome Extension Loading

1. Run `npm run build`
2. Open `chrome://extensions/`
3. Enable Developer mode
4. Click "Load unpacked" → select the `dist/` folder

## Common Patterns

- Chrome extension messaging: `chrome.runtime.sendMessage()` / `chrome.runtime.onMessage.addListener()`
- Storage: `chrome.storage.local.get()` / `chrome.storage.local.set()`
- Tab management: `chrome.tabs.create()`, `chrome.tabs.group()`, `chrome.tabGroups.update()`
- File handling: File System Access API (`showOpenFilePicker`) with IndexedDB fallback
