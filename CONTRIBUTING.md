# Contributing to IW-Auto-Login

Thank you for your interest in contributing! This guide will help you get set up and familiar with the project.

## Prerequisites

- **Node.js** 20 or higher — [Download](https://nodejs.org)
- **Git** — [Download](https://git-scm.com)
- A code editor (VS Code recommended)
- Google Chrome or Brave Browser

## Getting Started

```bash
# Clone the repository
git clone https://github.com/markvarvel/IW-Auto-Login.git
cd IW-Auto-Login

# Install dependencies
npm install
```

## Development

### Live Reload

```bash
npm run dev
```

This starts a Vite dev server with hot reload. The extension updates automatically as you save changes. Load the `dist` folder in Chrome via `chrome://extensions/` (Developer mode → Load unpacked), then click the extension card's refresh button whenever Vite rebuilds.

### Build

```bash
npm run build
```

Creates a production build in the `dist/` folder. Also auto-increments the version number in `package.json` and `manifest.json`.

> **Note:** `npm run build` has the side effect of bumping the version in `package.json` and `public/manifest.json`. To verify a change compiles without dirtying your working tree, use `npx vite build` instead.

### Typecheck

```bash
npm run typecheck
```

Runs the TypeScript compiler in type-check mode. Must pass with zero errors.

### Lint

```bash
npm run lint
```

Runs ESLint with TypeScript and React hooks rules. Must pass with zero errors.

### Tests

```bash
npm run test          # Run all tests once
npm run test:watch    # Run tests in watch mode
npm run test:coverage # Run with coverage report
```

Tests use Vitest and jsdom. Mock Chrome APIs are in `__mocks__/chrome.ts`.

Run a single test file or test:

```bash
npx vitest run src/utils.test.ts    # one file
npx vitest run -t "getBrowserAPI"   # one test by name
```

Two things to know when adding tests:

- Vitest only collects `src/**/*.test.ts`. A `.test.tsx` file will **not** run and `npm run test` will still pass — name component tests `.test.ts`.
- `vitest.config.ts` sets `setupFiles: []`, so Chrome APIs are not mocked globally. Each test file must `import { setupChromeMock } from './__mocks__/chrome'` and call it in `beforeEach`. Because `background.ts` and `content.ts` register listeners and run init at module scope, their tests use `vi.resetModules()` plus a dynamic `await import(...)` per test group — see `src/background.test.ts` for the pattern.

### CHANGELOG lint

```bash
npm run lint:changelog
```

Validates that `CHANGELOG.md` follows the [Keep a Changelog](https://keepachangelog.com/) format. Checks header lines, version headers, bullet items, and comparison links. Run this after editing the changelog manually.

## CI Pipeline

Every push to `main` and every pull request runs two jobs.

**Job 1 — `build-and-lint`:**

1. **Typecheck** — `npm run typecheck`
2. **Test** — `npm run test`
3. **Lint** — `npm run lint`
4. **Build** — `npm run build`
5. **Bundle size check** — Fails if the `vendor-mui` chunk exceeds **280kB**
6. **Zip** — Creates a versioned zip artifact (`iw-auto-login-vX.X.X.zip`)

**Job 2 — `release-tests`:**

1. **CHANGELOG lint** — `npm run lint:changelog`
2. **Test release script** — `bash test_release.sh`
3. **Test changelog update** — `bash test_changelog_update.sh`

All steps must pass before merging. If you modify `release.sh`, `lint-changelog.sh`, or `CHANGELOG.md`, run the Job 2 commands locally — Job 1 will pass while Job 2 fails.

Both `ci.yml` and `release.yml` enforce a **280kB** limit on the `vendor-mui` chunk. It currently sits at roughly 260kB, so there is limited headroom — adding new MUI components will require trimming existing ones.

## Project Structure

```
src/
├── App.tsx                 # Main popup UI with tab navigation
├── main.tsx                # React entry point
├── background.ts           # Service worker (login automation, tab management)
├── content.ts              # Content script (runs on InstantWar pages)
├── utils.ts                # Shared utilities, types, Chrome API helpers
├── login-utils.ts          # Login-specific helpers (range parsing, display names)
├── global.d.ts             # File System Access API type definitions
├── components/
│   ├── LoginTab.tsx         # Login automation tab UI
│   ├── RefreshTab.tsx       # Tab refresh tab UI
│   ├── LogsTab.tsx          # Activity logs tab UI
│   └── SettingsTab.tsx      # Extension settings/preferences UI
└── __mocks__/
    └── chrome.ts            # Chrome API mocks for testing

public/
├── manifest.json           # Chrome extension manifest (V3)
└── *.png                   # Extension icons

.github/
├── workflows/
│   ├── ci.yml              # CI pipeline (push/PR to main)
│   └── release.yml         # Automated release (triggered by v* tags)
└── CODEOWNERS              # Auto-assigns @markvarvel as reviewer

.husky/
└── pre-commit              # Runs typecheck + tests before every commit
```

## Tech Stack

| Library | Purpose |
|---------|---------|
| React 19 | UI components |
| TypeScript 5.8 | Type safety |
| Vite 7 | Build tooling and bundling |
| MUI v9 (deep imports) | UI component library |
| SheetJS (xlsx) | Excel file parsing |
| Vitest | Unit testing |
| ESLint | Code linting |

## Making Changes

1. Create a branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
2. Make your changes
3. Ensure all checks pass:
   ```bash
   npm run typecheck && npm run test && npm run lint && npm run build
   ```
4. Commit with a descriptive message
   - The **pre-commit hook** automatically runs typecheck, tests, and lint before each commit
   - If any check fails, the commit is blocked — fix the issues first
5. Push and open a pull request

### Code Style

- Use **deep MUI imports** (e.g., `import Button from '@mui/material/Button'`) — not barrel imports
- Keep the `vendor-mui` chunk under 280kB (enforced by both `ci.yml` and `release.yml`)
- All TypeScript strict checks are enabled (`strict`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`). Note that `noUncheckedIndexedAccess` is **not** enabled, so indexed access is not type-checked.
- `npm run lint` uses no `--max-warnings`, and `no-explicit-any`, `no-unused-vars`, and `react-refresh/only-export-components` are configured as warnings. Lint will exit 0 even when they fire — watch the output.
- `*.xlsx` files are gitignored except `public/IW-Logins-Template.xlsx`. Login spreadsheets contain real credentials; never commit one.
- The MV3 service worker output `assets/background-v1.js` is an unhashed filename hardcoded in both `vite.config.ts` and `public/manifest.json`. Renaming the `background` rollup entry breaks the extension silently at load time.
- `npm run lint:changelog` and the release scripts require Bash (Git Bash or WSL on Windows)
- Follow existing patterns for component structure and naming

## Release Process

Releases are automated via `release.sh`. The script handles validation, versioning, tagging, and workflow monitoring in one step.

### Using release.sh (recommended)

```bash
# Auto-increment patch version (1.0.52 → 1.0.53)
./release.sh

# Set an explicit version
./release.sh 1.1.0

# Preview what would happen without committing or pushing
./release.sh --dry-run
./release.sh 1.1.0 --dry-run

# Skip tests (for quick releases when tests were already run)
./release.sh --skip-tests
./release.sh 1.1.0 --skip-tests

# Skip typecheck or lint (for faster releases)
./release.sh --skip-typecheck
./release.sh --skip-lint

# Skip workflow monitoring (faster completion)
./release.sh --no-monitor

# Combine flags
./release.sh --dry-run --skip-tests --skip-typecheck --skip-lint --no-monitor
```

The script performs:
1. **Pre-flight checks** — clean working tree, on `main` branch (warns if not)
2. **Semver validation** — rejects invalid formats and version downgrades
3. **Validation** — runs `typecheck`, `test`, and `lint`
4. **Version bump** — updates `package.json` and `public/manifest.json`
5. **Commit & tag** — commits the version bump, creates an annotated `vX.X.X` tag
6. **Push** — pushes the commit and tag to origin
7. **Workflow monitoring** — polls GitHub Actions until the release completes (or times out after 5 minutes)

**`--dry-run`**: Runs steps 1–4 (pre-flight checks, semver validation, typecheck/test/lint, version bump preview) but skips commit, tag, push, and workflow monitoring. Reverts version files before exit so the working tree stays clean. Useful for verifying everything is ready before actually releasing.

**`--skip-tests`**: Skips the `npm run test` step but still runs typecheck and lint. Use when you've already verified tests pass and want a faster release.

**`--skip-typecheck`**: Skips the `npm run typecheck` step. Use when you've already verified types pass.

**`--skip-lint`**: Skips the `npm run lint` step. Use when you've already verified lint passes.

**`--no-monitor`**: Pushes the tag but skips polling the GitHub Actions workflow. The release will still run in the background. Use when you don't want to wait for the workflow to finish.

On success, the script prints the release URL and lists the published assets.

> **Note:** `release.sh` bumps the version itself, so do not run `npm run build` beforehand — that would bump twice. `release.yml` validates that the tag matches `package.json` *before* its own build runs, then patches `dist/manifest.json` back to the tag version afterwards.

### Manual release (alternative)

If you prefer to release manually:

1. Ensure all changes are committed and pushed to `main`
2. Update `package.json` version (or let `npm run build` auto-bump it)
3. Verify the tag version matches `package.json`:
   ```bash
   node -p "require('./package.json').version"  # Should match your tag
   ```
4. Create and push the tag:
   ```bash
   git tag -a vX.X.X -m "IW-Auto-Login vX.X.X"
   git push origin vX.X.X
   ```

### CHANGELOG auto-update

`release.sh` automatically updates `CHANGELOG.md` during each release. It:

1. Collects commit messages since the previous tag
2. Replaces the `[Unreleased]` header with a new `[X.Y.Z] - YYYY-MM-DD` section
3. Inserts the commit messages as a bullet list under the new version
4. Updates the comparison links at the bottom of the file

If you want to add custom notes to a release, edit the `[Unreleased]` section in `CHANGELOG.md` before running `release.sh`. Any items listed there will be included in the new version's entry.

### What the release workflow does

The **release workflow** (`release.yml`) automatically:
- Validates the tag matches `package.json` version
- Validates `README.md` references the correct zip filename
- Runs typecheck, tests, lint, and build
- Checks bundle size (vendor-mui ≤ 280kB)
- Resets the version in `dist/manifest.json` to the tag version
- Creates a GitHub Release with `iw-auto-login-vX.X.X.zip`

## Bundle Size Budget

| Chunk | Max Size | Notes |
|-------|----------|-------|
| `vendor-mui` | 280kB | MUI components + Emotion styling engine. Currently ~260kB, so headroom is tight. |
| `main` | — | Application code (~15kB) |
| `vendor-react` | — | React + ReactDOM (~195kB) |
| `vendor-xlsx` | — | SheetJS library (~333kB) |

The `vendor-mui` limit is enforced in CI. If you add a new MUI component, check the chunk size with `npx vite build` (not `npm run build`, which bumps the version) and verify it stays within budget.
