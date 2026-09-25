# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Canonical reference

`MEMORY.md` (~73KB at repo root) is the source of truth for data models, game configs, every API endpoint, every client route, the popup/hint/opening systems, and current feature status. **Read it before answering architectural questions or designing new features** — it documents schemas, defaults, and conventions that aren't obvious from the code.

## Development commands

Run from the repo root unless noted:

```bash
npm run install:all      # one-time: installs both server and client
npm run dev              # Express on :3000 (tsx watch) — terminal 1
npm run dev:client       # Vite on :5173, proxies /api → :3000 — terminal 2
npm run build:client     # Typecheck + build React app into client/dist
npm start                # Production: Express serves API + built client on :3000
```

**`npm run check` is the gate.** Run it before and after any change:

```bash
npm run check       # typecheck (server + client), node:test self-checks, then the guidelines
npm run typecheck   # types only
npm test            # the node:test self-checks only
npm run guidelines  # the conventions below, checked mechanically
```

All three are clean — **zero** type errors, all tests passing, no guideline violations. Any
error you see is yours; there is no baseline to diff against.

**CI runs exactly this**, as the `check` job in `.github/workflows/deploy.yml`, on every pull
request and every push to `main`. The deploy job `needs: check`, so a red gate never reaches
EC2. `scripts/guidelines.mjs` enforces: i18n out of components, no CSS files, no comments in
`client/src` / `server/src` (directives like `@ts-expect-error` aside), no TODO/FIXME or
commented-out code, no `console.log` in client code, a frozen top-level structure, SVG out of
components, and MEMORY.md updated alongside a new route/model/page. Counted rules carry a
per-file baseline in `scripts/guidelines-baseline.json` — an existing file may not get worse
and a clean file may not regress at all. When you fix violations the baseline rewrites itself
locally; commit it. To document a feature later, put `[skip-docs]` in the commit message.

`npm test` globs `client/src/**/*.test.ts` and `server/src/**/*.test.ts`, so a new `.test.ts`
file is picked up with no wiring. There is still no lint script.

Client typechecking has one trap: a bare `tsc --noEmit` inside `client/` is empty, because
`client/tsconfig.json` is solution-style (`"files": []`) and always passes. The real check is
`tsc -p tsconfig.app.json --noEmit`, which is what `npm run typecheck --prefix client` runs. It
must run from `client/` — the root `typescript` is older and rejects
`noUncheckedSideEffectImports`. `client`'s `build` script now runs it before `vite build`, so a
type error fails the build (and the deploy) instead of shipping silently.

Everything else is Playwright walkthroughs (UI flow recordings, not assertions):

```bash
npm run walkthrough             # record all walkthroughs + add voice narration
npm run walkthrough:record      # record videos only
```

When running a single Playwright spec: `npx playwright test walkthroughs/02-create-activity.spec.ts --project=walkthroughs`.

## High-level architecture

**Monorepo, single-host deployment.** `/server` and `/client` are two npm packages with their own `node_modules` and TS configs. In production, the Express server serves the built React app *and* the API from port 3000 — there is no separate frontend host.

- **Server**: Express 4 + TypeScript (`tsx` for dev, `tsc` for build), Mongoose 9 on MongoDB Atlas (cluster `Yooz-Cluster`, db `yooz`). Entry point `server/src/index.ts` wires ~30 route modules under `/api/*`, then falls back to SPA `index.html` for any non-API path. Connects to DB → runs migrations + seeds super-admin + built-in mission → listens.
- **Client**: React 19 + Vite 6 + TypeScript, MUI v7 with `@emotion/styled` (no CSS files — only `App.css` for the global reset). React Router v7. No state library — context per auth realm.
- **Storage**: Cloudinary for all uploaded media (images, video, audio). Uploaded via `POST /api/admin/upload` (multer memory storage → Cloudinary SDK). Reusable client component: `FileUploadButton`.

**Three independent auth realms** — this is the #1 thing to know before touching anything auth-related:

| Realm | Login | JWT role | localStorage key | API helper |
|---|---|---|---|---|
| Admin | hardcoded email+password (`.env`) | `admin` | `yooz_admin_token` | `adminApi.ts` |
| Participant | activity code (anonymous) | n/a | `yooz_token` | `api.ts` |
| Manager | per-activity email + bcrypt password | `manager` | `yooz_manager_token` | `managerApi.ts` |

Each has its own React context (`AdminAuthContext`, `AuthContext`, `ManagerAuthContext`) and its own `apiFetch` wrapper. Don't mix them.

**Domain model (full schemas in MEMORY.md).** The core entities are `Game` (reusable template, type-specific `settings`) → `Station` (groups games, or info/media station) → `Activity` (top-level: code, login config, optional `module` that references ordered stations) → `Report` (one per participant join, holds final scores). Activities are addressed publicly by 6-char `code`, not `_id`.

**Two layout worlds.** Participant pages are mobile-only and wrapped in `MobileContainer` (max-width 480px). Admin/manager pages are full-width desktop. Don't reuse components across this boundary without checking — many are styled for one only.

## Conventions worth knowing

- **Use `_id`, not `id`**, for Mongoose document references on the client. Population is one level deep for activity module endpoints.
- **i18n is co-located**: every page/component that has user-facing text has a sibling `.i18n.ts` file exporting Hebrew (default) + English strings, consumed via `useTranslations(texts)`. Hebrew is the *default* language and the app supports RTL.
- **Adding a language is one row on each side.** `client/src/utils/languages.ts` (`code`, `label`,
  `short`, `flag`, `dir`, `locale`) and `server/src/utils/languages.ts` (`code`, `name`, `locale`,
  `voices`). Everything else derives from those two: `Lang`, `SUPPORTED_LANGS`, both language
  switchers, the translation tabs, the TTS voice, and the line that tells an AI character which
  language to answer in. `LanguageContext` re-exports `LANGS`, so existing imports keep working.
  `languages.test.ts` fails if a row is missing a field or if the two sides disagree — they used
  to, and the symptom was a participant hearing silence. **No edits to the ~59 existing
  `.i18n.ts` files**: `Texts<T>` requires a complete `he` and accepts a *deep-partial* object for
  every other language, and `useTranslations` fills the gaps from Hebrew per key (`fillFrom`,
  covered by `LanguageContext.test.ts`). Functions and arrays are taken whole, never merged into.
  Verified by adding a third language (Arabic, RTL) and running the gate: nothing else changed.
- **Game configs live in `game.settings`** as `Record<string, unknown>` server-side, typed per game type client-side. When adding a new game type, add the settings interface in `server/src/types/index.ts`, the type to `validTypes` in `AdminGameConfigPage/index.tsx`, and the matching config form beside it. (`StationType` is a real union, but it lives in `server/src/models/Station.ts`.)
- **No comments in code.** Say it with a name — a well-named function, variable or type. The
  why of a change goes in the commit message, how the system works goes in MEMORY.md. The
  codebase is at zero, so a single comment fails the gate. Only `@ts-` directives and
  `/// <reference>` are allowed; there is no ESLint, so `eslint-disable` lines do nothing.
- **SVG never sits inline in a component.** Static art goes in a `.svg` asset under `client/public` (85 already there); anything parameterised by props, colour or state goes in a sibling `*.icons.tsx`, the same co-location shape as `*.i18n.ts`. 131 inline tags predate the rule and are held at their current count by the baseline — leave them or drain them, but do not add to them.
- **Drag-and-drop is hand-rolled** (HTML5 drag API + tap-to-swap fallback for touch). No dnd library — match this pattern if adding a new draggable game.
- **API surface convention**: admin endpoints under `/api/admin/*` require admin JWT; manager endpoints under `/api/manager/*` require manager JWT; participant endpoints under `/api/activities/:code/*` are mostly public, except `/scores` which needs participant JWT.
- **Public OG share page**: `server/src/index.ts` has a Facebook-crawler short-circuit before the SPA fallback (`/play/:code` returns server-rendered OG HTML to social crawlers). Don't move it.

## Deployment

Push to `main` triggers `.github/workflows/deploy.yml`:
1. Syncs every GitHub Secret named `SM_*` into AWS Secrets Manager (`yooz/production`, region `eu-west-1`) — **add a new prod env var by creating `SM_<NAME>` in GitHub Secrets; no workflow edit needed**.
2. rsyncs code to EC2 (`/opt/yooz`), runs `npm install` + `npm run build` for both server and client.
3. Writes `/etc/yooz/prod.env` from Secrets Manager, regenerates PM2 ecosystem config, restarts PM2 (`yooz` app).
4. Patches `/etc/nginx/sites-available/yooz` for 200MB upload + 900s timeouts (collage ffmpeg jobs are slow on t3.medium).

Local `deploy/*.sh` scripts (`1-create-secret.sh`, `2-launch-ec2.sh`, `3-deploy.sh`, `ssh.sh`, `logs.sh`) are for first-time setup and manual ops — day-to-day deploys go through GitHub Actions.

## When extending the codebase

- New game type → MEMORY.md "Order Game" / "Trivia Game" sections show the full pattern: settings schema, participant flow, scoring, admin config form. Mirror it.
- New media upload field → use `FileUploadButton`, don't roll your own form-data POST.
- New admin tab → `AdminDashboardPage.tsx` fetches activities/games/stations in parallel on mount and passes them as props; tabs call `onRefresh` after mutations.
- New popup trigger point → extend the `trigger.point` union in `Activity.module.popups` (model + client) and add the call site in `StoryModulePage`.

When in doubt, grep MEMORY.md first.
