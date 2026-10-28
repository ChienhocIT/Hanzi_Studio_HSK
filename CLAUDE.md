# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Hanzi Studio is a Vietnamese-language Chinese (HSK) learning PWA deployed on Vercel. UI strings, docs (`README.md`, `docs/`), and error messages are in Vietnamese — keep new user-facing text in Vietnamese. See also `AGENTS.md` (same conventions) and `docs/DEPLOYMENT.md` / `docs/IMPLEMENTATION.md` for Supabase setup and feature-status tables.

## Commands

Node.js >= 22; install with `npm ci`.

- `npm run dev` — build into `dist/` and serve it at http://127.0.0.1:8000 (`PORT` overrides). The server serves `dist/` only, so **re-run after every edit** to root files or `src/`.
- `npm run build` — copy public assets to `dist/`, bundle `src/cloud.js`, stamp the service-worker cache name. Reads `.env.local` if present (`--env-file-if-exists`). Vercel runs `npm run vercel-build` (`scripts/release-build.mjs`), which falls back to `config/public-cloud.json` in production.
- `npm test` — Node unit tests (`tests/*.test.mjs`). Single test: `node --test --test-name-pattern="CAS" tests/progress.test.mjs`.
- `npm run test:db` — starts a disposable `postgres:16-alpine` Docker container, stubs Supabase's `auth` schema/roles, applies **every** migration through the production runner (`scripts/migrate.mjs`), then runs `tests/database.mjs`, `quiz-`, `live-`, `vocabulary-` and `lifecycle-database.mjs` (last, because it deletes fixture accounts). Requires Docker.
- `npm run test:e2e` — Playwright (`tests/e2e/`), auto-starts `npm run dev` on port 18941. Locally uses installed Chrome (`channel: 'chrome'`); CI uses bundled Chromium. Single test: `npx playwright test -g "Student joins"`.
- `npm run check` — `npm test && npm run build`. CI (`.github/workflows/ci.yml`) runs check, test:db, then e2e.
- Other scripts: `db:migrate` (ledger runner for fresh installs only; production migrations are applied by the Supabase GitHub integration on push to `main`), `check:cloud` (GET-only Auth/RLS probe), `data:import-reference` (HSK 2.0 reference bank), `data:import-hsk3` + `db:seed-vocabulary` (HSK 3.0 CLEC 2025 list into `.sources/`, then into `vocab_entries` as drafts; needs Python + PyMuPDF and `POSTGRES_URL`).

There is no linter or formatter; avoid broad reformatting.

## Architecture

Two layers coexist in one page:

**1. Legacy static app (root directory).** Classic (non-module) scripts sharing globals, loaded in a fixed order from `index.html`: `content.js → advanced.js → video.js → curriculum.js → situations.js → app.js → backup.js → cloud-config.js → cloud.bundle.js`. `index.html` also inlines the 500-word HSK 3 `DECK` array and much of the CSS. `app.js` owns the shell, hash-based routing (`location.hash` → view id, default `home`) and flashcards/SRS; other scripts add feature views (exercises, video lab, curriculum/HSK 1–9 roadmap, conversations, JSON backup). Content lives in root `*.json` files. Routes `welcome` (landing, shown on a first visit with no saved state), `auth` (sign-in/sign-up/reset) and `classroom` (workspace) are registered in `NAV`; `nav()` toggles `body.public-mode`, which hides the sidebar/topbar for `welcome` and `auth`, and dispatches a `hanzi:route` event. These scripts are compact/minified-style — patch them in place matching their style, and keep hash routes, element IDs and script order stable.

**2. Optional cloud layer (`src/`, ES modules).** Bundled by esbuild into `dist/cloud.bundle.js` (IIFE). Uses Supabase Auth + PostgreSQL. `src/cloud.js` renders the sign-in forms into `#auth-panel`, account/sync into `#cloud-panel` (settings) and the workspace into `#workspace-panel` (classroom); after sign-in, students go to `home`, teachers/admins to `classroom`.
- `src/progress.js` — syncs the legacy app's state as a snapshot of exactly four localStorage keys (`KEYS`: `hanzi-studio-hsk3-prod-v1`, `-curriculum-v4`, `-video-lab-v1`, `-situations-v4`). Renaming a legacy storage key breaks sync/backup. Handles per-account isolation (`switchOwner` archives to `hanzi-cloud-archive:<user|guest>`), atomic apply with rollback, and compare-and-swap uploads via the `save_progress` RPC (`expected_revision`; conflicts must never mutate local state). After applying a snapshot the page reloads so legacy scripts re-read storage.
- `src/workspace.js` — teacher/admin/student workspace (content authoring → review → publish, classes, assignments, grading); `src/quizzes.js` and `src/live.js` (live exam rooms) plug into it. `src/ui.js` exports the `h()` HTML-escaper; escape all user content before building HTML strings.
- `src/shell.js` / `src/mascot.js` — public-page behaviour (scroll reveal, role tabs, theme toggle mirror) and the Mây Long mascot that reacts to the auth form.
- `src/cloud.js` — client creation, auth flows, sync UI, wiring.

**Database (`supabase/migrations/*.sql`, applied in filename order).** All tables have RLS with read-only `select` policies; all writes go through `security definer` RPCs that enforce role, ownership, revision and deadline checks. Helpers live in the `private` schema (`has_role`, `teaches` — which also requires a current teacher/admin role — `enrolled`). Authorization belongs in SQL, not the frontend. Migrations are one-shot: never edit one that is already applied in production (check with the Supabase MCP `list_migrations`); add a new `NNNNNNNNNNNN_snake_name.sql` wrapped in `begin;`/`commit;`. Foreign keys to `profiles` cascade for owned rows and `set null` for shared ones (content, audit, reviews), so deleting an Auth user works.

**Build & deploy.** Vercel publishes `dist/` only. `scripts/build.mjs` has an explicit `assets` list and `sw.js` has a `CORE` precache list — **a new root asset must be added to both** (files under `assets/` are copied automatically, except the design-source pack `assets/Hanzi_Studio_MayLong_Mascots_Asset/`; add anything needed offline to `CORE`). Styling: legacy CSS inline in `index.html` plus `*.css`; `theme.css` (loaded last) holds the brand tokens and the welcome/auth/classroom styles, `fonts.css` self-hosts Be Vietnam Pro. The build replaces `__BUILD__` in `sw.js` with a content hash. The service worker must never cache `/api/`, query-string URLs (auth callbacks) or cross-origin (Supabase) responses.

**Cloud config.** `HANZI_SUPABASE_URL` and `HANZI_SUPABASE_PUBLISHABLE_KEY` are read from the environment at build time (the build does **not** read `.env`) and written to `dist/cloud-config.js`. The build rejects `sb_secret_*` keys, non-`anon` JWTs, non-HTTPS URLs (except localhost) and half-set config. With no config the app runs in guest mode, and all legacy features must keep working without a backend.

## Testing notes

- E2E tests never hit a real Supabase: they intercept `**/cloud-config.js` and `https://demo.supabase.co/**` with `page.route` and seed a fake session in localStorage (see `mockCloud` in `tests/e2e/training.spec.mjs`). Service workers are blocked.
- DB tests set `request.jwt.claim.sub` to impersonate users; cover RLS, account isolation, stale revisions, review transitions, deadlines and unauthorized writes.

## Content rules

Record source, license, syllabus version and review status for learning content. Never present sample/seed material as an official HSK curriculum, and don't generate bulk fake HSK items to fill gaps.
