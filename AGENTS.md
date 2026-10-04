# AGENTS.md

Chrome MV3 extension (React 19 + Vite 7 + TS) for InstantWar login/refresh automation.
See `CONTRIBUTING.md` for structure, tech stack, and release flag docs. This file covers only
things that are easy to get wrong.

## Verify before you claim done

```bash
npm run typecheck && npm run test && npm run lint
```

That is exactly what `.husky/pre-commit` runs, in that order. All three must pass.
Single test file: `npx vitest run src/utils.test.ts` (add `-t "name"` for one test).

**`npm run build` has a side effect:** it is `vite build && node update-version.js`, which
auto-increments the patch version in **both** `package.json` and `public/manifest.json`.
Never run `npm run build` just to check that your change compiles — it dirties the tree.
Use `npx vite build` for a throwaway verification build.

## Gotchas that will bite you

- **The `vendor-mui` bundle budget is nearly exhausted.** Both `ci.yml` and `release.yml`
  fail the build if `vendor-mui` exceeds **280kB**, and it currently measures ~260kB. Adding
  new MUI components will likely require trimming existing ones. Use deep imports
  (`@mui/material/Button`, never the barrel) and re-check with `npx vite build`.
- **Vitest only collects `src/**/*.test.ts`.** A `.test.tsx` file will silently never run
  and `npm run test` will still pass. If you add component tests, name them `.test.ts`.
- **`vitest.config.ts` has `setupFiles: []`** — Chrome APIs are not globally mocked. Every
  test file must do `import { setupChromeMock } from './__mocks__/chrome'` and call it in
  `beforeEach`. `background.ts` and `content.ts` register listeners / run init at module
  scope, so their tests use `vi.resetModules()` plus a dynamic `await import('./background')`
  per test group. Copy the existing pattern in `src/background.test.ts`.
- **`assets/background-v1.js` is an unhashed filename** hardcoded in *both*
  `vite.config.ts` (`entryFileNames`) and `public/manifest.json` (`service_worker`).
  Renaming the `background` rollup entry or adding a hash breaks MV3 service worker loading
  silently — no build error, extension just fails to load.
- **`*.xlsx` is gitignored** except `public/IW-Logins-Template.xlsx`. Login spreadsheets hold
  real credentials; never commit or move one into the repo.
- **Bash is required** on Windows for `npm run lint:changelog`, `release.sh`,
  `test_release.sh`, `test_changelog_update.sh`. Use Git Bash / WSL, not PowerShell.

## Lint will not catch these

`eslint .` runs with no `--max-warnings`, and `no-explicit-any`, `no-unused-vars`, and
`react-refresh/only-export-components` are all **`warn`**. Lint exits 0 despite them.
Also note `tsconfig.app.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`, and
`noFallthroughCasesInSwitch`, but **not** `noUncheckedIndexedAccess` — `CONTRIBUTING.md` claims
it is on; it is not. Don't write code that assumes indexed access is checked.

## CI runs more than `CONTRIBUTING.md` lists

`ci.yml` has a second job (`release-tests`) that runs `npm run lint:changelog`,
`bash test_release.sh`, and `bash test_changelog_update.sh`. If you touch `release.sh`,
`lint-changelog.sh`, or `CHANGELOG.md`, run those three locally — the first job will pass
while this one fails.

`release.yml` also greps `README.md`: it must contain `iw-auto-login-v` and must **not**
contain the legacy `iw-auto-login-dist.zip`.

## Releasing

`release.sh` bumps the version itself. Do not run `npm run build` first — that would bump
twice. `release.yml` relies on the tag matching `package.json` *before* build runs, then
patches `dist/manifest.json` back to the tag afterwards.
