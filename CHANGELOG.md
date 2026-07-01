# Changelog

All notable changes to IW-Auto-Login will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [Unreleased]

## [1.0.58] - 2026-06-30

### Changed
- Fix Logs tab icon (Help → Article) for better semantic match
- Rename 'Automation' section header to 'Notifications' in Settings

## [1.0.57] - 2026-06-30

### Removed
- `confirmBeforeStart` confirmation dialog before starting login/refresh automation
- `confirmBeforeStart` setting from ExtensionSettings interface and Settings UI

### Changed
- Simplified `handleStartRefresh` — now passes `doStartRefresh` directly to RefreshTab

## [1.0.56] - 2026-06-18

### Changed
- Parallelize CI: move release script tests to separate `release-tests` job
- Move `--skip-tests` into `run_release` helper for cleaner test calls

### Fixed
- Validation test grep patterns to match actual release.sh output format

### Removed
- Slow typecheck/lint execution tests from test_release.sh (CI steps already cover these)

## [1.0.55] - 2026-06-18

### Added
- `--skip-typecheck` and `--skip-lint` flags to release.sh
- `lint:changelog`, `test_release.sh`, and `test_changelog_update.sh` as CI steps

### Removed
- Dry-run integration test from test_changelog_update.sh (duplicates test_release.sh)

## [1.0.54] - 2026-06-18

### Added
- `test_release.sh`: comprehensive release script test suite
- `test_changelog_update.sh`: validate CHANGELOG.md auto-update format
- `lint-changelog.sh`: validate CHANGELOG.md format consistency
- `--no-monitor` flag to release.sh: skip workflow monitoring for faster completion

### Fixed
- Dry-run revert trap in release.sh to keep working tree clean

## [1.0.53] - 2026-06-18

- Fix changelog links: auto-update comparison URLs on release
- Add CHANGELOG.md with release history; auto-generate entries in release.sh
- Add --skip-tests flag to release.sh and document in CONTRIBUTING.md
- Document --dry-run flag in CONTRIBUTING.md release process
- Fix dry-run: revert version files before exit to keep working tree clean
- Add --dry-run flag to release.sh: preview release without committing
- Update CONTRIBUTING.md: document release.sh usage in release process
- Add semver validation to release.sh: reject invalid formats and downgrades
- Add release.sh: automated release script with validation, version bump, tag, push, and workflow monitoring
- Move Dark Mode docs to end of Setup section; remove duplicate from Settings Tab
- Add Dark Mode section to README Setup docs

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

[1.0.58]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.57...v1.0.58
[1.0.57]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.56...v1.0.57
[1.0.56]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.55...v1.0.56
[1.0.55]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.54...v1.0.55
[1.0.54]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.53...v1.0.54
[1.0.53]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.52...v1.0.53
[Unreleased]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.58...HEAD
[1.0.52]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.51...v1.0.52
[1.0.51]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.50...v1.0.51
[1.0.50]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.49...v1.0.50
[1.0.49]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.48...v1.0.49
[1.0.48]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.47...v1.0.48
[1.0.47]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.46...v1.0.47
[1.0.46]: https://github.com/markvarvel/IW-Auto-Login/compare/v1.0.45...v1.0.46
[1.0.45]: https://github.com/markvarvel/IW-Auto-Login/releases/tag/v1.0.45
