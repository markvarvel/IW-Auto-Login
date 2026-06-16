# Contributing to IW-Auto-Login

Thank you for your interest in contributing! Here's how to get started.

## Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/markvarvel/IW-Auto-Login.git
   cd IW-Auto-Login
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the dev server**
   ```bash
   npm run dev
   ```

4. **Load the extension in Chrome**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked" and select the `dist/` folder

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Build the extension |
| `npm run lint` | Run ESLint |
| `npm run test` | Run unit tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run test:coverage` | Run tests with coverage report |

## Project Structure

```
src/
├── App.tsx              # Main popup UI
├── background.ts        # Service worker (login automation, tab management)
├── content.ts           # Content script (form filling, page interaction)
├── main.tsx             # React entry point
├── utils.ts             # File handling, xlsx parsing, IndexedDB storage
├── login-utils.ts       # Pure utility functions (range parsing, validation)
├── login-utils.test.ts  # Unit tests for login-utils
└── components/
    ├── LoginTab.tsx      # Login tab UI
    ├── RefreshTab.tsx    # Refresh tab UI
    └── LogsTab.tsx       # Logs tab UI
public/
├── manifest.json        # Chrome extension manifest
├── IW-Logins-Template.xlsx  # Template spreadsheet
└── icon*.png            # Extension icons
```

## Guidelines

- **Security first**: Never commit sensitive files (`.xlsx` credentials, `.zip` archives, `.env` files). The `.gitignore` is configured to block these.
- **Test your changes**: Run `npm run test` before submitting.
- **Follow existing patterns**: Match the code style of the surrounding files.
- **Keep PRs focused**: One feature or fix per pull request.

## Reporting Issues

Open an issue on GitHub with:
- Steps to reproduce
- Expected vs actual behavior
- Browser version and OS
