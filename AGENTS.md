# Repository Guidelines

## Project Structure & Module Organization

Hanzi Studio is a Vietnamese Chinese-learning PWA. `index.html` contains the application shell, inline styles, and HSK 3 deck. Root scripts cover flashcards/SRS (`app.js`), exercises (`advanced.js`), curriculum (`curriculum.js`), conversations (`situations.js`), video (`video.js`), and backups (`backup.js`). JSON files hold learning content; root icons and `manifest.webmanifest` provide PWA assets.

`src/` contains the optional Supabase account, progress synchronization, and teaching workspace modules. PostgreSQL migrations live in `supabase/migrations/`. `scripts/` contains build, development-server, and isolated database-test tools. Build output goes into ignored `dist/`; publish only that directory.

## Build, Test, and Development Commands

Use Node.js 22 or newer and `npm ci` to install locked dependencies.

- `npm run dev`: build and serve at `http://127.0.0.1:8000`; rebuild after editing. Set `PORT` if occupied.
- `npm run build`: copy public assets and bundle cloud modules into `dist/`.
- `npm test`: run Node's progress synchronization tests.
- `npm run test:db`: run migration and authorization checks in a disposable PostgreSQL Docker container.
- `npm run test:e2e`: run Playwright browser flows. Local execution uses installed Chrome; CI uses Chromium.

## Coding Style & Naming Conventions

Use JavaScript, single quotes, and descriptive camelCase identifiers. New modules use two-space indentation and explicit imports; match surrounding conventions when patching compact legacy scripts. Keep existing hash routes, element IDs, and script load order stable. Escape user content before assigning HTML. There is no configured formatter or linter; avoid broad formatting changes.

## Testing Guidelines

Put unit tests in `tests/*.test.mjs`, database scenarios in `tests/database.mjs`, and browser scenarios in `tests/e2e/*.spec.mjs`. Cover account isolation, stale revisions, RLS, review transitions, deadlines, and unauthorized writes. No numerical coverage threshold is configured. Use synthetic accounts and mocked external APIs; distinguish these checks from live OAuth, microphone, and production acceptance.

## Commit & Pull Request Guidelines

History is short (`first commit`, `release: sync ...`); prefer concise `feat:`, `fix:`, `test:`, or `docs:` subjects. PRs should explain behavior, link relevant issues, list verification, describe migration/configuration steps, and include screenshots for UI changes.

## Configuration & Content Safety

Only public Supabase URL and publishable/anon keys belong in browser configuration. Keep secrets out of Git. Enforce permissions in PostgreSQL, preserve local progress during migration, and record content sources, rights, syllabus, and review status. Never label sample material as an official HSK curriculum.
