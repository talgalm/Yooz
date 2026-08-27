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
npm run build:client     # Build React app into client/dist
npm start                # Production: Express serves API + built client on :3000
```

There is no lint script and no test runner script. Five `node:test` self-checks exist and are
run by hand:

```bash
npx tsx --test client/src/utils/inAppBrowserEscape.test.ts
npx tsx --test server/src/utils/participantAuth.test.ts
npx tsx --test server/src/utils/mediaInUse.test.ts
npx tsx --test server/src/utils/mediaFolders.test.ts
npx tsx server/src/utils/groupRewardConfig.test.ts
```

To typecheck the client, run `npm run build --prefix client`. A bare `tsc --noEmit` inside
`client/` checks **nothing** — `client/tsconfig.json` is solution-style (`"files": []`), so it
always passes.

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
- **Game configs live in `game.settings`** as `Record<string, unknown>` server-side, typed per game type client-side. When adding a new game type, add the settings interface in `server/src/types/index.ts`, the type to `validTypes` in `AdminGameConfigPage/index.tsx`, and the matching config form beside it. (`StationType` is a real union, but it lives in `server/src/models/Station.ts`.)
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
