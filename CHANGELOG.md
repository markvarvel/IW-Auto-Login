# Changelog

All notable changes to IW-Auto-Login will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [1.0.52] - 2026-06-18

### Added
- Settings Tab section to README Usage docs
- `showNotifications` setting now gates snackbar notifications (errors always show)

### Changed
- Release script (`release.sh`) with `--dry-run` and `--skip-tests` flags
- CONTRIBUTING.md documents full release process

## [1.0.51] - 2026-06-18

### Fixed
- Installation diagram uses generic `vX.X.X` placeholder (no more hardcoded versions)
- Diagram uses lowercase `iw-auto-login` to match actual zip filenames

### Changed
- README Features section now includes Settings tab, dark mode, confirm dialog, auto-reload

## [1.0.50] - 2026-06-18

### Added
- Auto-reload xlsx on every popup open (re-reads from stored file handle)
- Reload timestamp indicator moved into Login tab header alert (pulsing green dot)
- Troubleshooting section in README for common installation issues
- CONTRIBUTING.md with project structure, tech stack, and development guide

### Removed
- `autoReloadInterval` setting (auto-reload is now always-on)

## [1.0.49] - 2026-06-17

### Added
- Visual installation diagram in README (ASCII folder tree with step-by-step instructions)
- CONTRIBUTING.md with bundle size budget documentation

### Changed
- Updated dist folder naming clarifications

## [1.0.48] - 2026-06-17

### Added
- Settings Tab with auto-reload interval, default tab, confirm toggle, and clear data
- Smooth fade transitions between tabs
- MUI Dialog confirmation before starting automation (replaces `window.confirm`)

### Changed
- Vendor-mui bundle limit bumped from 250kB to 280kB

## [1.0.47] - 2026-06-17

### Added
- Dark mode toggle (system / dark / light) with Chrome storage persistence
- Icon tooltip on hover

### Changed
- Popup sizing and responsiveness improved

## [1.0.46] - 2026-06-17

### Added
- Pre-commit hooks (typecheck, tests, lint via Husky)
- CODEOWNERS file

### Changed
- CONTRIBUTING.md expanded with development workflow documentation

## [1.0.45] - 2026-06-17

### Added
- Initial public release

[Unreleased]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.52...HEAD
[1.0.52]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.51...v1.0.52
[1.0.51]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.50...v1.0.51
[1.0.50]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.49...v1.0.50
[1.0.49]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.48...v1.0.49
[1.0.48]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.47...v1.0.48
[1.0.47]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.46...v1.0.47
[1.0.46]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.45...v1.0.46
[1.0.45]: https://github.com/markvarvel/IW-Auto-Login/releases/tag/v1.0.45
