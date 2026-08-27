# MEMORY.md — Yooz Platform Canonical Reference

> Source-of-truth reconstruction of the Yooz codebase: data models, API surface, client
> architecture, game/station systems, and conventions. Read this before answering
> architectural questions or designing features. Pairs with `CLAUDE.md` (dev commands +
> deployment) and `QA_REQUIREMENTS_AND_TESTS.md` (per-feature requirements + manual tests).
>
> **This file is `.gitignore`d** (intentionally local per-developer). It is not committed —
> keep it updated locally as the system evolves.

---

## 1. What Yooz is

A gamified marketing/education platform ("Marketing Engine"). An **Activity** is a mobile
experience a participant joins with a 6-char **code**. It runs an ordered **module** of
games and info **stations** (a story roadmap, a mission, or a "spiders" graph). Participants
are anonymous (or portal-authenticated); scores go into **Reports**; admins build content and
read analytics; per-activity **managers** run live sessions.

Three core value "boosters": **Share** (auto-generated video collages participants share),
**Stay** (immersive gameplay), **Spend** (SMS discount coupons).

---

## 2. Architecture at a glance

**Monorepo, single-host.** `/server` and `/client` are separate npm packages (own
`node_modules`, own tsconfig). In production one Express process on **:3000** serves both the
API and the built React SPA — no separate frontend host.

- **Server**: Express 4 + TypeScript (`tsx` dev, `tsc` build), Mongoose 9 → MongoDB Atlas
  (cluster `Yooz-Cluster`, db `yooz`). Entry `server/src/index.ts`.
- **Client**: React 19 + Vite 6 + TS, MUI v7 with `@emotion/styled` (no CSS files except
  `App.css` global reset), React Router v7. No state library — React context per auth realm.
- **Media**: Cloudinary for all uploads (image/video/audio), via `POST /api/admin/upload`
  (multer memory → Cloudinary SDK). Client component: `FileUploadButton`.
- **Video collages**: ffmpeg encode offloaded to AWS Lambda (see `LAMBDA_SETUP.md`,
  `server/src/lambda/collageHandler.ts`), with a local fallback processor.
- **AI**: Google Gemini (`GEMINI_MODEL`, default `gemini-2.5-flash-lite`) for help/report/
  avatar chat + answer checking. Azure Speech for TTS. TextMe (textme.co.il) for SMS.

### Dev commands (from repo root)
```bash
npm run install:all      # install server + client
npm run dev              # Express :3000 (tsx watch)          — terminal 1
npm run dev:client       # Vite :5173, proxies /api → :3000   — terminal 2
npm run build:client     # build React app into client/dist
npm start                # production: Express serves API + built client on :3000
```
No lint script, no test-runner script. Two `node:test` self-checks are run by hand
(`npx tsx --test client/src/utils/inAppBrowserEscape.test.ts`,
`npx tsx server/src/utils/groupRewardConfig.test.ts`). Everything else is Playwright
walkthroughs (`npm run walkthrough*`, `walkthroughs/*.spec.ts`) — UI-flow recordings, not
assertions. `npm run build --prefix client` is the only real typecheck: `client/tsconfig.json`
is solution-style (`files: []`), so a bare `tsc --noEmit` there checks nothing and always passes.

### Deployment
Push to `main` → `.github/workflows/deploy.yml`:
1. Syncs every GitHub Secret named `SM_*` into AWS Secrets Manager (`yooz/production`,
   `eu-west-1`). **Add a prod env var by creating `SM_<NAME>` in GitHub Secrets — no workflow edit.**
2. rsyncs to EC2 (`/opt/yooz`), `npm install` + `npm run build` for both packages.
3. Writes `/etc/yooz/prod.env` from Secrets Manager, regenerates PM2 ecosystem, restarts PM2 (`yooz`).
4. Patches nginx for 200MB upload + 900s timeouts (collage ffmpeg is slow on t3.medium).

`deploy/*.sh` (`1-create-secret.sh`, `2-launch-ec2.sh`, `3-deploy.sh`, `ssh.sh`, `logs.sh`)
are first-time setup / manual ops. Lambda deploy: `.github/workflows/deploy-lambda.yml`.

### Config / env (`server/src/config.ts`)
`PORT`(3000) · `JWT_SECRET` · `MONGODB_URI` · `ADMIN_EMAIL`/`ADMIN_PASSWORD` (super-admin seed)
· `CLOUDINARY_*` · `GEMINI_API_KEY`/`GEMINI_MODEL` · `AZURE_SPEECH_KEY`/`_REGION` ·
`TEXTME_API_TOKEN`/`_USERNAME`/`_SOURCE` · `CORS_ORIGIN` (comma list; unset = allow all).
In production, `JWT_SECRET`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` are **required** (throws otherwise).

---

## 3. Auth realms (the #1 thing to know)

Four JWT-bearing identities, each with its own React context, `apiFetch` wrapper, and
localStorage key. **Never mix them.**

| Realm | How they log in | JWT role | localStorage key | Client helper / context |
|---|---|---|---|---|
| **Admin** | email+password (super-admin from `.env`; others in `users`) | `viewer`/`admin`/`super_admin`/`customer` | `yooz_admin_token` | `adminApi.ts` / `AdminAuthContext` |
| **Participant** | activity code (anonymous) or portal login | n/a | `yooz_token` (+ cookie mirror) | `api.ts` / `AuthContext` |
| **Manager** | per-activity email + bcrypt password (or Google) | `manager` | `yooz_manager_token` | `managerApi.ts` / `ManagerAuthContext` |
| **Portal user** | portal code + username/password (bcrypt) | issues a participant token | `yooz_token` | via `PortalPage` |

- Middleware: `authenticateAdmin`+`requireRole(...)` (`middleware/adminAuth.ts`),
  `authenticateToken` (participant, `middleware/auth.ts`), `authenticateManager`
  (`middleware/managerAuth.ts`). All read `Authorization: Bearer <jwt>`, verify with `JWT_SECRET`.
- **Participant token** is mirrored to a `yooz_token` cookie (7-day) because in-app webviews
  can drop localStorage between opens (`AuthContext.tsx`). On login as a *different* user,
  local progress keys (`yooz_session_*`, `yooz_game_progress_*`, `puzzle_progress_*`,
  `yooz_avatar_chat_*`, `yooz_entering_text_*`, `yooz_start_*`) are wiped.
- **Admin roles**: `super_admin` = everything (users, tutorials, publicity, site content);
  `admin` = content + all analytics + publicity; `customer` = **scoped to their own
  activities** (see §7); `viewer` = minimal.

---

## 4. Domain model

Core chain: **Game / Station / Mission** (reusable templates) → referenced by an
**Activity.module.items[]** (ordered) → participants create **Report**s → analytics.
Activities are addressed publicly by 6-char **`code`**, not `_id`. **On the client, use
`_id` not `id`** for Mongoose refs. Module population is one level deep.

All models live in `server/src/models/` and are re-exported from `models/index.ts`.

### Activity (`activities`) — the top-level entity
6-char `code` (unique, auto-gen), `name`, `status` `'preview'|'live'`.
Login config: `loginFields: ('email'|'phoneNumber'|'name')[]`, `emailGoogle?`,
`connectionType: 'single'|'group'`, `groupEntryMode?: 'preset'|'selfService'`,
`groups: {name}[]` (preset/admin-defined static groups).
`opening?: {type:'video'|'image', url}` (splash before login).
`guidelines?`, `customInstructions?` (guidelines popup text — bilingual arrays).
`scheduledStart?`/`scheduledEnd?` (countdown / expiry gating).
`managerEmail?`/`managerPassword?` (bcrypt) — the manager realm login for this activity.
`createdByEmail?` + `customerEditLocked?` — customer-role scoping/lock.
`portalId?`, `isContinuous?` (portal-login continuous activity), `folderId?` (dashboard folder).

**Module** (`module: IModuleConfig`):
- `type: 'story'|'mission'|'spiders'`, `theme?` (e.g. `'spy'`), `backgroundImage?`.
- `items: IModuleItem[]` — ordered `{type:'game'|'station'|'mission', ref: ObjectId,
  groups?: string[] (only these groups see it), spiderSvg?, isFinal? (spiders lock),
  collageSplit? (split a collage station into N parts across the activity),
  revisitable? (completed item stays re-openable from the roadmap — see §11)}`.
- `missionRef?` (when `type='mission'`), `showStationNumbers?`, `showItemTitleNumbers?`.
- `popups?: IPopupMessage[]` — see §11.

**Leaderboard/scoring flags**: `leaderboardMode: 'points'|'time'|'both'`,
`leaderboardAsGrade?` (show points as 0-100 normalized grade), `hideLeaderboardInHeader?`,
`leaderboardCurrentDayOnly?` (**default true** — only today's Israel-time reports),
`activityDurationMinutes?` (time mode), `roadmapTimerMinutes?` (cosmetic count-up, turns red),
`passThreshold?` (0-100, **default 70**; null = no pass grade), `includeOnRoadmap?`.

**Stats sharing**: `statsShareToken?` (public read-only link), `excludedReportIds?`
(non-destructive exclusion from stats/exports).

**Analytics counters**: `shareClicks`, `shareCompleted`, `missionPuzzleCompletions`,
`missionTrashSortCompletions`, `missionTrashSortScoreSum`.

**Live session**: `lockedFromIndex?` (manager progress lock — items ≥ this are blocked),
`orderSurveySession?` (live order-game poll: itemIndex, gameId, roundIndex,
phase `'voting'|'results'`, resultsRevealed, aggregatedRanking[Borda]).

**Groups (self-service)**: `groupMinMembers?` (default 1), `groupMaxMembers?` (0/null = no cap).
**Group reward**: `groupReward?: {enabled, couponCode, messageTemplate?, attachmentUrl?,
attachmentType?:'image'|'pdf', downloadToken?}` — top scorer gets an SMS coupon after all finish.
**Collage SMS**: `smsForCollage?` (requires phone login), `smsForCollageMessage?` (`{link}`
placeholder), `smsForCollageShare?` (link → share landing page vs raw video).
Legacy: `stations[]`, `loginComponent` (migrated by `migrateActivities()`).

### Game (`games`) — reusable game template
`name`, `type` (`'trivia'|'order'|'ballGame'|'puzzle'|'trueFalse'|'trashSort'|'generic'…`),
`description?`, `customer?`, `theme?`, `tags[]`, `settings: Record<string,unknown>` (typed
per game type client-side — see §9), `createdByEmail?`, `folderId?`. Text index on
name/description/`settings.questions.text`.

### Station (`stations`) — info/media/interactive screen
`type: StationType` = `'text'|'video'|'image'|'narrative'|'badge'|'collage'|'feedback'|
'riddle'|'avatar'|'avatarQuiz'|'enteringText'` (11 types; union lives in `models/Station.ts`). Same shape as Game (`settings`, `customer`, `theme`,
`tags`, `folderId`). See §10.

### Mission (`missions`) — 3-part recycling-style activity
`explanationScreens: IMissionScreen[]` (header/description/buttonText/image/backgroundImage),
`puzzleConfig?` (completeHeader/Button), `trashSortConfig?` (many bilingual labels + badge
text). A mission is referenced by an activity (`module.type='mission'` or a mission item).
Built-in recycling mission is seeded if none exist (`seedBuiltInMission`).

### Report (`reports`) — one per participant join
`activityId`/`activityCode`, `participantName`, `email?`, `phoneNumber?`, `connectionType`,
`group?`, `joinedAt` (creation time — schema has **no timestamps**, so `joinedAt` is used as
"created"), `completionStatus: 'joined'|'in_progress'|'completed'`, session timing
(`sessionStartedAt/CompletedAt/DurationMs`), `totalItemsCompleted`, `totalItemsInModule?`,
`lastActiveItemIndex`.
`data: IReportData` = `{ totalScore, scores?: {gameName,score}[], itemResults?: IItemResult[] }`.
`IItemResult` = per game/station: itemIndex/Id/Type/Name, gameType?, score, maxPossibleScore?,
timing, hintUsed/hintPenalty, `questionAnswers?: IQuestionAnswer[]` (per-question detail:
selected/correct/isCorrect/points/time), attempts?, metadata?. Heavily indexed by
activityId/Code + joinedAt + group + totalScore + completionStatus.

### ActivityGroup (`activity_groups`) — self-service teams (day-scoped)
`activityId`/`activityCode`, `name`/`nameNormalized`, **`activityDay`** (Israel `YYYY-MM-DD`),
`inviteToken` (unique), `createdAt`, `createdByName?`, reward fields (`rewardProcessedAt?`,
`winnerReportId?`, `winnerCouponCode?`, `rewardTimerEndsAt?`). **Unique index
`{activityId, activityDay, nameNormalized}`** — names repeat across days. See §8.

### Portal (`portals`) — gated multi-activity access
`name`, `code` (8-char unique slug), `users: IPortalUser[]` (username, bcrypt password,
`status: 'pending'|'approved'|'denied'`, `mustChangePassword?`), `activities: ObjectId[]`,
`inviteToken` (32-char self-registration auto-approve link). Portal user passwords bcrypt-
hashed via a `pre('validate')` hook.

### Other models
- **User** (`users`): admin accounts — email (unique), bcrypt password?, `role`, googleId?, name?.
- **CustomTheme** (`custom_themes`): mainColor + roadmap/stations images + text/bg/node/path/
  header-icon colors. Applied to a module via `module.theme`.
- **LibraryItem** (`library_items`): reusable game/station templates (`kind`, `type`, `lang`,
  `settings`) — copied into an activity's own Game/Station via `POST /admin/library/:id/copy`.
- **Tutorial** (`tutorials`): AI-generated walkthrough videos (status pipeline + Cloudinary).
- **DevTask** (`dev_tasks`): in-app feature/bug/change tracker (admin help chat).
- **CollageJob** (`collagejobs`): async video/photo collage encode state machine (§12).
- **SmsNotification** (`sms_notifications`): group-reward SMS audit trail.
- **ContactLead** (`contactLeads`): marketing site "contact us" leads.
- **AdminAuditLog** (`admin_audit_logs`): admin action log (super_admin/admin only).
- **SiteContent** (`siteContent`): bilingual marketing landing-page content (singleton;
  `DEFAULT_SITE_CONTENT` shipped on first load).
- **Layout** (`layouts`): keyed bilingual layout presets.
- **Folders**: `ActivityFolder` / `StationFolder` / `GameFolder` / `MissionFolder` — dashboard
  organization (name + pastel color; `FOLDER_COLOR_HEXES`, `DEFAULT_FOLDER_COLOR`).

---

## 5. Server API surface

Router wiring in `server/src/index.ts`. Convention: `/api/admin/*` needs admin JWT;
`/api/manager/*` needs manager JWT; `/api/activities/:code/*` mostly public (except
participant-token ones). Global async error handler returns 500; `express-async-errors`
lets async handlers throw. `/api/health` (DB check) and `/api/load-status` are public gauges.

### Participant / activity — `/api/activities` (`activities.ts` + `activityGroups.ts`)
- `GET /:code` — public activity config (login fields, connection type, groups, opening, schedule).
- `GET /:code/module` — the ordered module (games/stations/missions populated); filters items
  by the participant's group (`item.groups`).
- `GET /:code/lock-stream` — SSE of `lockedFromIndex` (manager live lock).
- `GET /:code/leaderboard` — points/time/group standings; respects `leaderboardCurrentDayOnly`,
  `leaderboardAsGrade`; group standings = summed member scores (Borda not used here).
- `PATCH /:code/progress` *(participant JWT)* — incremental per-item progress save.
- `POST /:code/scores` *(participant JWT)* — final score submit → completes the Report.
- `DELETE /:code/my-report` / `GET /:code/my-progress` *(participant JWT)* — replay support.
- `GET /:code/order-survey/status` *(participant JWT)* — live order-survey phase.
- `POST /:code/mission-event`, `POST /:code/share-event` — analytics counters.
- **Groups** (mounted via `activityGroupsRouter`): `GET /:code/groups/check-name`,
  `/today`, `/by-name`, `/by-token/:token`, `/status` *(JWT)*, `POST /:code/groups` (create). §8.

### Participant auth — `/api/auth` (`auth.ts`)
- `POST /login` — participant login (name/email/phone + group/groupToken). Resolves group via
  `resolveGroupName` (day-scoped), enforces portal membership + group capacity, issues `yooz_token`.

### Admin — `/api/admin` (`admin.ts`, guarded by `authenticateAdmin`)
- `POST /login`, `POST /login/google` — admin login (super-admin from `.env`, others from `users`).
- Activities CRUD: `GET/POST /activities`, `PUT /activities/:id`, `GET /activities/:id`,
  `PATCH /activities/:id/status` (preview↔live; **going live wipes dynamic data**),
  `PATCH /activities/:id/folder`, `POST /activities/:id/duplicate`, `DELETE /activities/:id`
  (cascade-deletes its reports), `PATCH …/lock` (customer edit lock).
- `GET /search`, `GET /random-items`, `POST /sms/test`.
- **All list/read queries are customer-scoped** via `customerMongoFilter`/`customerOwnsDoc` (§7).

### Admin content
- `/api/admin/games` (`games.ts`), `/api/admin/stations` (`stations.ts`),
  `/api/admin/missions` (`missions.ts`) — CRUD + `/:id/folder` + `/:id/duplicate`.
- `/api/admin/library` — list/tags/copy/delete reusable templates.
- `/api/admin/{activity,station,game,mission}-folders` — folder CRUD.
- `/api/admin/portals` — portal CRUD + `parse-excel` (bulk users) + `/:id/users/:userId/status`
  + `/:id/regenerate-invite`. **Public** portal endpoints: `GET /public/:code`, `POST
  /public/:code/login`, `/google-login`, `/register`, `PATCH /public/:code/profile`,
  `GET /public/:code/history`.
- `/api/admin/themes` (CustomTheme CRUD), `/api/admin/tutorials` (super_admin; AI video gen),
  `/api/admin/users` (super_admin only, CRUD), `/api/admin/upload` (Cloudinary),
  `/api/admin/dev-tasks` (admin/super_admin).

### Admin analytics — `/api/admin/analytics` (`analytics.ts`, roles admin/super_admin/customer)
- `GET /overview`, `/overview/timeline` — global KPIs (customer-scoped).
- Per activity: `/activities/:id`, `/funnel`, `/items`, `/items/:index/questions`, `/groups`,
  `/anomalies`, `/export` (Excel), `/participants`, `PATCH …/participants/exclusions`,
  `GET/PATCH …/pass-threshold`, `GET/POST/DELETE …/share` (public share link).
- Combined: `/combined/report-card`, `/combined/report-card/export`, `/combined/export`.
- `GET /audit-log` — **admin/super_admin only** (customers get 403).
Every activity/report query is scoped to the customer's own activities (§7).

### Public read-only stats — `/api/shared/stats/:token` (`sharedStats.ts`)
Token-scoped mirror of analytics (overview/funnel/items/questions/groups/anomalies/export).
No admin auth — the `statsShareToken` is the credential.

### Manager — `/api/manager` (`manager.ts`, guarded by `authenticateManager`)
- `POST /login` (per-activity email+password or Google).
- `GET /reports`, `/sms-notifications`, `/activity` — read live session data.
- Order-survey control: `GET /order-survey/live`, `POST /order-survey/{start,close,reveal}`.
- `POST /lock` — set `lockedFromIndex` (live progress gate, broadcast via SSE).

### AI / media / misc
- `/api/help` (participant help chat, Gemini), `/api/avatar-chat` (avatar station chat),
  `/api/avatar-quiz` (avatarQuiz station answer grading + follow-ups),
  `/api/check-answer` (AI answer grading), `/api/tts` (Azure TTS),
  `/api/admin/report-assistant` (`/chat`+`/download`, analytics Q&A),
  `/api/admin/help-assistant` (`/chat`, admin how-to + dev-task creation).
- `/api/collage` — collage upload/encode/progress/share/SMS (§12; some routes `loadShed`-gated).
- `/api/reward-download/:token`, `/api/site-content` (+ `/leads`), `/api/alerts/history`.

---

## 6. Server services & utils

- **`services/collageProcessor.ts`** — encode queue + concurrency slots (drives `loadShedding`),
  schedules Lambda or local ffmpeg. `services/collage*`, `routes/collage.ts`, `lambda/collageHandler.ts`.
- **`services/groupRewardService.ts`** — after the last group member finishes (or a 5-min idle
  timer, polled every 30s from `index.ts`), SMS the top scorer a coupon. Day-scoped by the
  group's `createdAt` (§8). `processExpiredRewardTimers()`.
- **`services/sms/`** — `smsProvider` (stub default) / `textmeSmsProvider` (textme.co.il).
- **`services/activityAnalyticsService.ts`** — analytics aggregations (funnel/items/questions/
  groups/anomalies/report-card/export builders).
- **`services/reportContext.ts`** — builds LLM context for the report assistant.
- **`utils/customerScope`** is in `middleware/customerScope.ts` (§7).
- **`utils/israelTime.ts`** — `startOfTodayIsrael()` (UTC instant of Israel midnight) and
  `israelDayString()` (`YYYY-MM-DD` in `Asia/Jerusalem`). Used for day-scoping (groups, leaderboard).
- **`utils/scoreNormalization.ts`** — `normalizeScore`/`resolveCeiling`/`maxScoreForReport`/
  `clampPassThreshold` — the 0-100 grade normalization used across analytics + leaderboard grade mode.
- **`utils/participantAuth.ts`** — `resolveGroupName` (day-scoped), `checkGroupCapacity`
  (day-scoped), `createParticipantSession`, `buildReportLookupQuery`, `ownReportFilter`,
  `validateGroupName`.
- **`utils/groupStatus.ts`** — `getGroupStatus` (member/completion counts, **scoped to today**),
  `resolveGroupMinMembers`.
- **`utils/orderSurveyBorda.ts` / `orderSurveySession.ts`** — live order-game Borda aggregation.
- **`utils/shareOgPage.ts`** — server-rendered OG HTML for `/play/:code` (Facebook crawler
  short-circuit before the SPA fallback — **don't move it**). `isSocialCrawler`, `buildPlayOgHtml`.
- **`utils/lockBroadcaster.ts`** — SSE broadcast of manager progress lock.
- **`utils/analyticsExcelExport.ts`** — ExcelJS workbook builders for exports.
- **`utils/participantCountCache.ts`** — cached participant counts (popup participantCount trigger).
- **`db/seed.ts`** — `migrateActivities` (legacy loginComponent → loginFields),
  `migrateActivityGroups` (backfill `activityDay` + drop legacy group index), `seedSuperAdmin`,
  `seedBuiltInMission`. Run in order at startup after `connectDB`.

---

## 7. Customer-role scoping (`middleware/customerScope.ts`)

A `customer` admin sees **only activities they created (`createdByEmail`) or manage
(`managerEmail`)**. Helpers:
- `isCustomerRole(req)`, `customerOwnerEmail(req)` (lowercased).
- `customerMongoFilter(req)` → `{$or:[{createdByEmail},{managerEmail}]}` for list queries
  (empty `{}` for non-customers).
- `customerOwnsDoc(req, doc)` → per-doc gate (non-customers always true).
- `customerIsAssignedManager(req, doc)` — manages but didn't create.
- `assertModuleOwnedByCustomer(...)` — on save, new module refs must be customer-owned
  (existing refs grandfathered).
- `createdByEmailForNewResource(req)` — stamps ownership on create.

Applied throughout `admin.ts`, `analytics.ts`, `reportAssistant.ts`, `adminHelpAssistant.ts`.
**Client**: `AdminDashboardPage` shows the Statistics tab to customers; the activities list it
passes to analytics is already the scoped set. The Audit Log button/endpoint is admin-only.

---

## 8. Self-service groups — **day-scoped** (recent feature)

Applies when `connectionType==='group'` && `groupEntryMode==='selfService'`. Participants
create/join their own teams (vs `preset` admin-defined static `activity.groups`).

- Each `ActivityGroup` is stamped with **`activityDay`** = Israel `YYYY-MM-DD` at creation.
- **A group is only visible/joinable on its own day.** Later days treat it as non-existent for
  creation, listing (`/today`), name lookup (`/check-name`, `/by-name`), the join path
  (`resolveGroupName`), and invite links (`/by-token`, `resolveGroupName` → **410 Gone**).
- Name uniqueness is **per activity per day** (unique index
  `{activityId, activityDay, nameNormalized}`) — the same name can be reused a new day.
- Groups are **never deleted** — previous days' docs + all their reports stay for reporting.
- Member/completion counts (`getGroupStatus`) and capacity (`checkGroupCapacity`) count **only
  today's** members (`joinedAt >= startOfTodayIsrael()`), so a reused name doesn't inherit prior members.
- Group reward selection is scoped to the group's own `createdAt` (`groupRewardService.ts`).
- Migration `migrateActivityGroups()` backfills `activityDay` from `createdAt` and drops the
  legacy global-unique `{activityId, nameNormalized}` index at startup.
- Client flow: `components/groupEntry/*` (`GroupEntryChoice` → `CreateGroupForm` /
  `JoinExistingGroupForm` → `GroupCreatedSuccess` / `JoinGroupLogin`), `useDebouncedGroupNameCheck`.
  The join screen's "today's groups" picker calls `/groups/today`.

Documented with test cases in `QA_REQUIREMENTS_AND_TESTS.md` §33.

---

## 9. Game types (`game.settings`, typed in `server/src/types/index.ts`)

Add a new type: add the union in `types/index.ts`, a client config form in
`AdminGameConfigPage/*Config.tsx`, and a player in `components/games/`. Drag-and-drop is
hand-rolled (HTML5 drag API + tap-to-swap touch fallback) — no dnd library.

- **Order** (`OrderGameSettings`): `mode:'quiz'|'survey'` (default quiz), `rounds:{title?,
  cards[] in correct order}[]`, `scoring:{firstAttemptPoints(100), retryPoints(50), speedBonus,
  timeLimitSeconds?}`. `survey` mode = live class-ranking poll (no scoring; Borda aggregation
  driven by the manager, see `orderSurveySession`). Player: `components/games/OrderGame/`
  (`index.tsx`, `OrderSurveyGame.tsx`, `GolfChallenge.tsx`).
- **Trivia** (`TriviaGameSettings`): `questions:{text,hint?,media?,answers:{text,isCorrect,
  explanation?}[]}[]`, `scoring:{correctAnswerPoints, wrongAnswerPenalty, timeLimitSeconds?}`,
  `shuffleAnswers?`, `includeHelpers?` (one-time 1/2 or 3/4 eliminations). `components/games/TriviaGame/`.
- **Ball Game** (`BallGameSettings`): Phaser physics quiz — `questions:{text,answers[4] one
  correct}[]`, `scoring:{timeLimitSeconds}`. `components/games/BallGame/` (Phaser assets in
  `client/public/assets/games/ballgame/`).
- **Puzzle**: slide/drag puzzle over an image + optional per-question timer + speed bonus.
  `components/games/PuzzleGame/`.
- **True/False**: per-statement countdown, correctPts/wrongPenalty. `components/games/TrueFalseGame/`.
- **Trash Sort**: sort falling items into correct bins (also embedded in Missions).
  `components/games/TrashSortGame/`.

**Scoring summary** (full table in `QA_REQUIREMENTS_AND_TESTS.md` Appendix A): each game reports
a per-item `score` + `maxPossibleScore`; hints deduct `GAME_CONSTANTS.HINT_PENALTY` (**4**, though
the warning copy in the game `.i18n.ts` files still says 5 — known mismatch). Cross-activity averages
normalize every report to 0-100 against its own achievable max (`scoreNormalization.ts`).

Shared game UI: `GameInstructionsScreen`, `GameCompleteScreen`, `HintButton`/`HintModals`
(hook `useGameHint`), `MuteButton` (hook `useGameSounds`).

---

## 10. Station types (`StationType`)

Rendered in `pages/StoryModulePage/PlayingPhase.tsx` (story) / `StationStage` / dedicated
`components/stations/*`. Config forms in `pages/admin/AdminStationConfigPage`.

- **text** — title + description (`descPosition:'before'|'after'`).
- **video** — `settings.mediaUrl`; HTML5 `<video>` (autoplay+controls) or YouTube/Vimeo
  `iframe` (via `utils/videoSource.resolveVideoSource`). Replay overlay on end. **Continue is
  disabled until the video ends** (`onEnded`); iframes can't report end so Continue stays enabled
  (`VideoStationPlayer`). Direct files are preloaded via `MediaGateWrapper`.
- **image** — `settings.mediaUrl`, fullscreen tap, preload-gated Continue.
- **narrative** — themed story screen (background/image + narration; optional TTS).
- **badge** — award/achievement badge screen (curve text, award text).
- **collage** — participant photo capture → async video/photo collage (§12). `CollageStation`,
  can be split across the activity via `module.items[].collageSplit`.
- **feedback** — feedback/survey capture (`FeedbackStation`).
- **riddle** — riddle with media + checked answer (`RiddleStation`, may use `/api/check-answer`).
- **avatar** — AI chat with a character (`AvatarStation` → `/api/avatar-chat`).
- **avatarQuiz** — a character *asks* the participant questions and an AI grades each free-text
  answer 0-100 (`AvatarQuizStation` → `/api/avatar-quiz`). Settings: `characterName`,
  `characterImageUrl`, `voiceType:'man'|'woman'` (TTS), `topic`, `introText`/`outroText`,
  `personaInstructions`, `strictness:'lenient'|'balanced'|'strict'`, `pointsPerQuestion`,
  `questionCount` (drawn from the bank), behaviour toggles (shuffle / retry / skip / auto-advance),
  `questions[]: {text, idealAnswer, keywords[], teachingPoint, hint?, points?, learnMoreUrl?,
  level?1|2|3}`, and optional `reactionVideos{asking,correct,partial,incorrect}`.
- **enteringText** — free-text entry station (`EnteringTextStation`).

Shared: `StationDescriptionPopup`, floating clue button for info stations.

---

## 11. Popup / hint / opening / leaderboard systems

- **Popups** (`Activity.module.popups[]`, model `IPopupMessage`): `title`, `contentType:
  'text'|'image'`, `text?`/`image?`, `includeUsername?`, `trigger.point:
  'afterLogin'|'beforeItem'|'afterItem'|'endOfActivity'` (+ `itemIndex` for before/after),
  optional `condition:{type:'participantCount', threshold}`, `enabled`. New trigger point → extend
  the union in model + client and add the call site in `StoryModulePage`. Editor:
  `AdminCreateActivityPage/PopupMessagesSection.tsx`.
- **Hints**: per-question `hint` (trivia) or station clue; using a hint applies a points penalty
  recorded in `IItemResult.hintUsed/hintPenalty`. `HintButton`/`HintModals`/`useGameHint`.
- **Opening**: optional `activity.opening` (video/image splash before login) → `WelcomeScreen`.
- **Guidelines popup**: `guidelines` / `customInstructions` → `GuidelinesPopup`.
- **Leaderboard**: `GET /:code/leaderboard`; modes points/time/both, optional 0-100 grade,
  default today-only. `LeaderboardView` (participant) + `ManagerDashboardPage/AnimatedLeaderboard`.
- **Roadmap**: `RoadmapView` (story path) / `SpidersView` (graph, `isFinal` lock) — themed via
  `CustomTheme` (`ThemedBackground`, `themes/SpyThemeWrapper`).
- **Re-entry** (`module.items[].revisitable`): a completed item stays tappable on the roadmap and
  renders with a brighter, ringed node so it reads as still-open. A revisit is read-only —
  `revisitReturnIndex` in `StoryModulePage` holds the real progress index, and `endRevisit()`
  restores it without persisting progress, re-awarding points, or advancing. Toggled per item in
  `AdminCreateActivityPage` → Module Items → "Re-entry / כניסה חוזרת".

---

## 12. Collage / video system

Participant photos → Cloudinary → an ffmpeg collage (video or static). State machine in
`CollageJob` (`collecting→queued→preparing→encoding→uploading→done|error`, `percent`,
`resultUrl`, `isVideo`). Encoding runs on **AWS Lambda** (`lambda/collageHandler.ts`,
`LAMBDA_SETUP.md`) with a local fallback (`services/collageProcessor.ts`), concurrency-limited
and protected by `loadShed` (503 + Retry-After when event-loop lag / RSS / queue depth trips).
Boot recovery in `index.ts` resurrects jobs 30s–15min stale, aborts older ones. A split collage
(`module.items[].collageSplit`) spreads photo capture across several stations. Optional SMS
delivery of the finished video (`smsForCollage*`, polled every 15s). Client:
`components/stations/CollageStation.tsx` + `collageJobStorage`/`collageSplitStorage`/
`backgroundCollageJob` + `utils/collageApi`/`collagePhotoCompress`.

**Logos** (station `settings.logoUrl` / `settings.logoRightUrl`, both optional). The left logo
is drawn *behind* the template and shows through the template's yellow placeholder box
(`TEMPLATES[id].logo`), which is chromakey'd out. The right logo is drawn *on top* of the
composited foreground at the mirrored box (`width - logo.x - logo.w`) since no second yellow
region exists in the source MP4. Templates with `logo: null` (e.g. `gan-yehoshua`) draw neither.
Self-check: `npx tsx server/src/routes/collageFilter.check.ts`.

---

## 13. Client architecture

### Routes (`App.tsx`)
- **Admin** (`/admin/*`, desktop): login, dashboard, activities new/`:id`/edit/view, games,
  missions, stations, portals config.
- **Manager** (`/manager`, `/manager/dashboard`, `/manager/present`, desktop).
- **Participant** (mobile, wrapped in `MobileContainer` max-width 480, `ParticipantActivityScope`
  + `HelpChatProvider`): `/play/:code`, `/play/:code/join/:inviteToken`, `/home`, `/story/:code`,
  `/mission/:code`. `ProtectedRoute` redirects unauthenticated participants back to `/play/:code`.
- **Public**: `/portal/:code`, `/privacy`, `/stats/:token` (shared stats), `/` (landing/redirect).
- `FallbackRedirect` keeps unknown participant paths on their activity login (not the marketing page).

### Two layout worlds
Participant pages are **mobile-only** (`MobileContainer`, ≤480px). Admin/manager pages are
full-width desktop. **Don't reuse components across this boundary** without checking styling.

### Contexts
`AuthContext` (participant, cookie-mirrored token), `AdminAuthContext`, `ManagerAuthContext`,
`LanguageContext` (i18n + RTL), `activityPlayingHeaderContext`, `themedSceneOverlayContext`,
`HelpChat/HelpChatContext`.

### API helpers (`utils/`)
`api.ts` (participant `apiFetch`/`apiFetchWithRetry` — retries 503; offline queue),
`adminApi.ts`, `managerApi.ts`, `collageApi.ts`. JWT decode: `utils/jwt.ts`. Offline support:
`offlineQueue`, `storageHealth`, `storySession`, `moduleCache`, `earlyModulePrefetch`,
`mediaPreloader`/`participantMedia` (+ hook `useMediaPreload`). In-app webview handling:
`inAppBrowserEscape` (escape to real browser for QR/camera), `googleAuth`, `facebookSdk`.

### i18n convention (important)
Every page/component with user-facing text has a **sibling `.i18n.ts`** exporting `{he, en}`
(Hebrew default, RTL supported), consumed via `useTranslations(texts)` from `LanguageContext`.
Add new UI strings there — both languages.

### Admin dashboard (`pages/admin/AdminDashboardPage`)
Fetches activities/games/stations/folders in parallel on mount, passes as props to tabs; tabs
call `onRefresh` after mutations. Tabs by role: **activities** (all), **statistics**
(admin/super_admin/**customer**), **stations** (stations+games+missions), **library**,
**portals** (all); **publicity** (admin/super_admin), **users**+**tutorials** (super_admin).

### Manager dashboard (`pages/manager/ManagerDashboardPage`)
Live session control: `AnimatedLeaderboard`, `ControlFlowTab` (progress lock), order-survey
present view (`OrderSurveyPresentPage` / `manager/present`).

---

## 14. Conventions worth knowing

- Use **`_id`, not `id`** for Mongoose refs on the client. Module population is one level deep.
- **Game/Station/Mission configs live in `settings`** as `Record<string,unknown>` server-side,
  typed per type client-side.
- **i18n co-located** in sibling `.i18n.ts`; Hebrew default; RTL.
- **Drag-and-drop hand-rolled** (HTML5 + tap-to-swap). Match the pattern for new draggables.
- **New media upload field** → use `FileUploadButton`, don't roll your own form-data POST.
- **New admin tab** → `AdminDashboardPage` parallel-fetch + props + `onRefresh`.
- **New game type** → union in `types/index.ts` + `*Config.tsx` + `components/games/*`.
- **New station type** → `StationType` union (model + client) + `AdminStationConfigPage` +
  `components/stations/*` + `PlayingPhase.tsx` branch.
- **New popup trigger** → extend `trigger.point` union (model + client) + `StoryModulePage` call site.
- **Day-scoping** uses `israelTime.ts` (`startOfTodayIsrael`, `israelDayString`) — reuse for any
  "today in Israel" logic.
- **OG crawler short-circuit** in `index.ts` before the SPA fallback — don't move it.
- Reports have **no timestamps** — use `joinedAt` as the creation/"today" field.
- Going **live wipes dynamic data** (reports/scores/session state); deleting an activity
  cascade-deletes its reports.

---

## 15. Feature status / notes

- **Groups are day-scoped** (§8) — recent change; QA §33. Invite links from a previous day
  return **410**.
- **Customers can view reports** (Statistics tab) scoped to their own/managed activities (§7);
  audit log stays admin-only.
- **Video stations gate Continue** until the video ends (§10); iframes exempt. A bottom-left "skip the video" button (`SkipVideoButton`, PlayingPhase) bypasses the gate.
- **Per-item re-entry** (§11) — completed roadmap items flagged `revisitable` stay open and are
  tinted brighter than locked-behind ones; revisits never re-score.
- Collage encode is the main scaling pressure point (Lambda + load shedding + boot recovery).
- AI features (help/report/avatar chat, answer check) use Gemini; TTS uses Azure; SMS uses TextMe
  (stub when creds absent).

---

_When something here is stale or missing, fix it locally — this file is the fast path that
saves re-reading the whole codebase._

---
---

# PART B — Detailed Function / Endpoint / Component Reference

Exhaustive per-file catalog: every exported function, endpoint handler, React component,
hook, and utility, with signatures, behavior, and side effects. Part A (above) is the
conceptual map; Part B is the line-level reference. Paths are relative to repo root.

## B0. Shared server patterns

**Admin CRUD route pattern** (games / stations / missions / themes / folders / library /
users / dev-tasks all follow it):
1. `authenticateAdmin` guard (JWT → `req.admin`); some add `requireRole(...)`.
2. Validate `name.trim().length >= 2` on create/update → 400 otherwise.
3. **List** uses `customerMongoFilter(req)` so customers only see their own docs.
4. **Get/Update/Delete/Duplicate** load the doc then `customerOwnsDoc(req, doc)` — a customer
   hitting someone else's doc gets **404** (not 403, to avoid leaking existence).
5. Create stamps `createdByEmail: createdByEmailForNewResource(req)`.
6. `PATCH /:id/folder` accepts `{folderId: string|null}`; validates folder ownership; null =
   move to ungrouped root.
7. Duplicate suffixes the name with `" (עותק)"` (Hebrew "copy") and clears ownership to caller.

Error convention: `res.status(n).json({ error })`; success often `{ success: true }` or the
mutated doc. Async throws are caught by the global handler in `index.ts` (500).

## B1. Server routes

### `routes/auth.ts` — participant login
- `POST /api/auth/login` — Body `LoginRequest {activityCode, participantName?, email?,
  phoneNumber?, group?, groupToken?}`. Loads activity by code (404 if none). Validates each
  configured `loginField` (email present; name 2–50 chars; phone present) → 400. For group
  activities: `resolveGroupName(activity,{group,groupToken})` (day-scoped; 404/410 on stale),
  then `checkGroupCapacity(...)` → 409 `group_full`. For continuous/portal activities: verifies
  the identifier matches an **approved** portal user → 403 `not_portal_user`/`portal_not_found`.
  Builds `displayName` (name → email → phone → "Participant"), calls
  `createParticipantSession(...)` (issues JWT + upserts Report), and for self-service groups
  attaches `getGroupStatus`. Returns `{token, participant, groupStatus?}`.

### `routes/activityGroups.ts` — self-service groups (mounted under `/api/activities`)
All require `connectionType==='group'` && `groupEntryMode==='selfService'` (else 404/400).
- `GET /:code/groups/check-name?name=` — validates name; returns `{available}` = no **today's**
  group with that normalized name (day-scoped via `israelDayString()`). `{available:false,
  reason:'invalid'}` on bad name.
- `GET /:code/groups/today` — today's groups `[{name, inviteToken}]` (≤200, newest first) —
  the join-screen picker.
- `GET /:code/groups/by-name?name=` — resolve today's group name → `{name, inviteToken, valid}`;
  404 if not found today.
- `GET /:code/groups/by-token/:token` — resolve invite token → `{name, valid}`; 404 invalid;
  **410** if the group's `activityDay` ≠ today (expired link).
- `GET /:code/groups/status` *(participant JWT)* — current participant's `getGroupStatus`
  (memberCount/minMembers/canProceed/completedCount/allMembersCompleted). 403 on code mismatch.
- `POST /:code/groups` — create group + log in creator. Validates name + login fields + portal
  membership; creates `ActivityGroup` (stamps `activityDay`), 409 on duplicate-name-today;
  `createParticipantSession`; returns `{token, participant, group:{name,inviteToken,inviteUrl},
  groupStatus?}`. `inviteUrl = <origin>/play/:code/join/:inviteToken`.

### `routes/games.ts`, `routes/stations.ts`, `routes/missions.ts`
Standard admin CRUD (B0). Endpoints: `GET /` (list, customer-scoped, newest first),
`POST /` (create), `GET/PUT/DELETE /:id`, `PATCH /:id/folder`. Stations & missions also
have `POST /:id/duplicate` (games do **not**). Station create/update whitelists `type` to the
10 `StationType`s (defaults to `text`). Game `type` defaults to `generic`. All under
`/api/admin/{games,stations,missions}`.

### `routes/activities.ts` — participant-facing activity API (mounts `activityGroupsRouter`)
Module-level: `activityConfigCache` (Map, 30s TTL) memoizes `GET /:code`.
- `GET /:code` — public login config (`ActivityConfigResponse`). Backfills legacy
  `loginComponent`→`loginFields`. Cached 30s. Includes `moduleType`, `groupEntryMode`,
  `opening`, `scheduledStart/End`, `isContinuous`.
- `GET /:code/module` — the full playable module. For **self-service group** activities it
  **requires** the participant JWT and that `getGroupStatus(...).canProceed` (min members met),
  else `401 group_auth_required` / `403 group_not_ready`. For `mission` modules returns the
  mission directly. Otherwise batch-fetches games/stations/missions by id, **filters items by
  `item.groups` vs the participant's group**, populates each item (gameType/stationType,
  settings, spiderSvg, isFinal, collageSplit), filters popups (enabled + `participantCount`
  threshold via `getParticipantCount`), embeds the `CustomTheme` if `module.theme` is an
  ObjectId, and returns module + guidelines/customInstructions + leaderboard flags +
  `lockedFromIndex`. `Cache-Control: no-store`.
- `GET /:code/lock-stream` — **SSE**. Emits current `lockedFromIndex`, subscribes via
  `lockBroadcaster.subscribe`, 25s heartbeat, cleans up on `req.close`. `X-Accel-Buffering: no`.
- `GET /:code/leaderboard` — public. Three modes: **time** (completed reports by
  `sessionDurationMs` asc), **both** (by `data.totalScore` desc + duration shown), **points**
  (by totalScore desc). Top 50. Optional 0-100 grade (`leaderboardAsGrade`, monotonic
  `normalizeScore`). Day-scoped by default (`leaderboardCurrentDayOnly`, `startOfTodayIsrael`).
  For group activities also returns per-group standings (aggregate: sum of member scores).
- `PATCH /:code/progress` *(JWT)* — incremental save. `$set` completionStatus=`in_progress`,
  `lastActiveItemIndex`, `totalItemsCompleted`, `data.totalScore` (runningTotal); `$push`
  `data.itemResults` unless `progressOnly`. Matches the token's own report
  (`ownReportFilter`). 403 on code mismatch.
- `DELETE /:code/my-report` *(JWT)* — continuous activities only; `deleteMany` on
  `ownReportFilter` (early-exit replay).
- `GET /:code/my-progress` *(JWT)* — resume payload (completionStatus, lastActiveItemIndex,
  totalItemsCompleted, scores, itemResults) for the token's own report (`ownReportFilter`).
- `GET /:code/order-survey/status` *(JWT)* — live order-survey state (`getOrderSurveyLiveState`).
- `POST /:code/scores` *(JWT)* — **final submit**: validates `scores[{gameName,score}]`, sums
  `totalScore`, upserts on `ownReportFilter` (`$setOnInsert` adds activityCode/participantName
  only when filtering by `_id`), `$set` completed + `sessionCompletedAt` + `sessionDurationMs`. Fires
  `onGroupMemberCompleted` (fire-and-forget) for self-service group members → reward flow.
- `POST /:code/mission-event` — public counter `$inc` (`puzzle_completed` /
  `trashsort_completed` + score sum).
- `POST /:code/share-event` — public counter `$inc` (`shareClicks` / `shareCompleted`).

### `routes/admin.ts` — admin activity management + auth
**Exported helper**: `logAdminAction(req, action, targetType?, targetId?, targetName?,
details?)` — fire-and-forget `AdminAuditLog.create` with admin email + IP. Called across all
admin routes.
**Internal helpers**:
- `validateActivityPayload(body, {isCreate?})` — name 2–100, ≥1 valid loginField, connectionType
  single|group, manager password required on create when managerEmail set.
- `provisionActivityManager(email, pw)` → `provisionManagerCustomer` (creates/links a
  `customer`-role User for the manager email).
- `buildActivityData(body, existingPwHash?, existing?)` — the **big normalizer**: maps request
  → stored activity doc. Handles emailGoogle (only if email login), groups (selfService → clear
  groups + min/max/reward via `resolveGroupRewardForSave`; preset → `{name}[]`), opening
  (null clears), module (mission vs story; filters items to valid game/station/mission refs;
  normalizes popups, dropping empties), scheduling, guidelines, customInstructions,
  leaderboard mode/grade/currentDayOnly, activityDurationMinutes (time/both only),
  roadmapTimerMinutes (null clears), continuous/portalId, smsForCollage (requires phone login),
  passThreshold (`clampPassThreshold`; only when present), and manager credentials
  (bcrypt-hash new password, else keep existing hash).
- `stripManagerPassword(activity)` — removes `managerPassword`, adds `managerHasPassword: bool`.
- `populateActivityItems(activities[])` — batch-populates each activity's module items with the
  referenced game/station/mission doc under `item.data`.

**Endpoints** (all `authenticateAdmin`):
- `POST /login` — bcrypt password check against `users`; issues 7d admin JWT `{email,role,userId}`.
- `POST /login/google` — verifies Google access token via userinfo; matches existing User by
  email (no auto-create); links googleId; issues JWT.
- `GET /activities` — customer-scoped list, populated, manager password stripped.
- `POST /activities` — validate + `assertModuleOwnedByCustomer` + `buildActivityData` + create
  + provision manager. Returns `{activity, managerProvision}`.
- `PUT /activities/:id` — same, blocked if `customerEditLocked` for customers; `$unset opening`
  when cleared.
- `GET /activities/:id` — single populated (ownership-gated).
- `PATCH /activities/:id/status` — preview↔live. **Going live wipes** all reports +
  session/share/mission counters.
- `PATCH /activities/:id/folder` — file into folder (allowed even when edit-locked — it's
  organizational).
- `POST /activities/:id/duplicate` — clone with fresh `_id`/`code`, reset counters, `" (עותק)"`
  suffix, status preview, unlock.
- `DELETE /activities/:id` — delete + cascade-delete its reports.
- `PATCH /activities/:id/customer-lock` *(admin/super_admin)* — set `customerEditLocked`.
- `GET /search?q=&filter=&tag=&limit=` — regex search games/stations by name/description/tags/
  customer (+ game `settings.questions.text`), customer-scoped.
- `GET /random-items?games=&stations=` — `$sample` random items, interleaved station→games, for
  quick activity building.
- `POST /sms/test` — sends a test SMS via the current provider using `renderWinnerSms` +
  the `/api/reward-download/test_<base64url>` proxy link (no DB write).

### `routes/manager.ts` — per-activity live session control
- `POST /login` — password (bcrypt vs `activity.managerPassword`) or Google (userinfo email
  must match `activity.managerEmail`). Issues a **4h** manager JWT `{email, activityCode,
  activityId, role:'manager'}`. 401 if no manager configured.
- `GET /reports` *(mgr JWT)* — participant roster (name/email/phone/group/joinedAt/scores/
  totalScore) + group standings (summed member scores, preset groups pre-seeded to 0).
- `GET /sms-notifications` *(mgr)* — `{enabled, notifications[]}` from `SmsNotification`.
- `GET /activity` *(mgr)* — Control-Flow tab data: module items (`{index,type,name,subType,
  orderMode('quiz'|'survey' for order games),gameId}`) + `lockedFromIndex` + `orderSurveySession`.
- `GET /order-survey/live` *(mgr)* — presenter live state (`getOrderSurveyLiveState`).
- `POST /order-survey/start` *(mgr)* — open voting for item (sets `orderSurveySession`
  phase='voting'). 400 if item isn't a game.
- `POST /order-survey/close` *(mgr)* — `closeOrderSurveyVoting` → Borda `aggregatedRanking`,
  phase='results'.
- `POST /order-survey/reveal` *(mgr)* — set `resultsRevealed=true` (enables participant
  Continue). 400 unless phase already 'results'.
- `POST /lock` *(mgr)* — set `lockedFromIndex` (0..itemCount, or null to unlock); persists +
  `broadcastLock` (SSE push to all participants).

### `routes/library.ts` — reusable template catalog (`/api/admin/library`)
- `GET /` — filtered list (`kind`, `type`, `tag`/`tags` ($all), `customer`, `q` regex, paged
  `skip`/`limit`≤500), customer-scoped; returns `{items, total}`.
- `GET /tags` — distinct `tags`/`customers`/`types` (customer-scoped) for filter dropdowns.
- `GET /:id` — single (ownership-gated).
- `POST /:id/copy` — materialize a LibraryItem into a real `Game` or `Station` (drops `imported`
  tag, adds `from-library`, stamps owner). Returns `{created:'game'|'station', ...}`.
- `DELETE /:id`.

### `routes/upload.ts` — Cloudinary upload (`POST /api/admin/upload`)
`authenticateAdmin` + `multer.memoryStorage` (100MB cap). Whitelists image/video/audio/
pdf/office/text mimetypes → 400 otherwise. Chooses Cloudinary `resource_type` (`raw` for
docs, `video` for video/audio, `image` else), uploads to folder `yooz`, returns
`{url, publicId, resourceType, format, size, fileName}`.

### `routes/rewardDownload.ts` — public reward file proxy (`GET /api/reward-download/:token`)
`test_<base64url(cloudinaryUrl)>` tokens decode + redirect (test SMS, no DB). Real tokens
look up `Activity` by `groupReward.downloadToken` → 302 redirect to
`cloudinaryAttachmentUrl(attachmentUrl)`. 404 if not found.

### `routes/sharedStats.ts` — public read-only stats (`/api/shared/stats/:token`)
No auth — the 16+ char `statsShareToken` is the credential (`resolveActivity` → 404 if short/
missing). Mirrors analytics read endpoints for one activity: `/`, `/funnel`, `/items`,
`/items/:index/questions`, `/groups`, `/anomalies`, `/export` (Excel via
`buildAnalyticsWorkbookBuffer`). Respects `excludedReportIds` + `period`.

### `routes/siteContent.ts` — marketing site content + leads (`/api/site-content`)
`getOrCreateContent()` (singleton, seeds `DEFAULT_SITE_CONTENT`). Exported `validateLead(body)`.
- `GET /` (public) — content. `POST /leads` (public) — create ContactLead (name/email/phone req).
- `PUT /` *(admin/super_admin)* — replace content doc (upsert). `GET /leads` — list newest.
- `PATCH /leads/:id` — toggle `handled`.

### `routes/alerts.ts` — `GET /api/alerts/history`
Public proxy to Israel Home Front Command (Oref) alarm history (10s timeout, forwards cache
headers). 502 on upstream failure.

### `routes/users.ts` — admin user management (`/api/admin/users`, **super_admin only**)
`GET /` (no passwords), `POST /` (email+role required, unique, bcrypt password),
`PUT /:id` (**can't demote the last super_admin**), `DELETE /:id` (**can't delete self or the
last super_admin**). All audit-logged.

### Folder routers — `routes/{activity,station,game,mission}Folders.ts`
Identical shape (mounted at `/api/admin/*-folders`, `authenticateAdmin`, customer-scoped):
`GET /` (list by name), `POST /` (name required, `color` must be in `FOLDER_COLOR_HEXES`,
default `DEFAULT_FOLDER_COLOR`), `PATCH /:id` (rename/recolor), `DELETE /:id` (**deletes the
folder but sets member docs' `folderId=null`, never deletes members**). Audit-logged via the
`logAdminAction` re-exported from `admin.ts`.

### `routes/portals.ts` — portals (`/api/admin/portals`)
`generatePassword()` (8-char). Admin CRUD (customer-scoped, populate activities name/code/
status):
- `POST /parse-excel` — parse an uploaded xlsx (first sheet) → `[{username,password}]`
  (auto-detects header row; generates passwords when missing). Doesn't save.
- `GET /`, `POST /` (bcrypt users, `mustChangePassword:true`, attaches activities →
  `portalId`+`isContinuous:true`), `GET /:id`, `PUT /:id` (re-hashes changed passwords, keeps
  self-registered pending/denied users, syncs `portalId`/`isContinuous` on add/remove),
  `DELETE /:id` (clears portalId+isContinuous on activities).
- `PATCH /:id/users/:userId/status` — approve/deny a user.
- `POST /:id/regenerate-invite` — new `inviteToken`.
**Public portal routes** (`/api/admin/portals/public/:code`): `GET /` (portal + **live**
activities only), `POST /login` (bcrypt; 403 `pending_approval`/`denied`; 8h portal JWT;
`mustChangePassword?`), `POST /google-login` (existing user or new — auto-approve with valid
inviteToken else pending), `POST /register` (self-register; auto-approve w/ inviteToken;
409 username_taken; min 4-char pw), `PATCH /profile` (change display name/password),
`GET /history?username=` (participant's reports across all portal activities + computed
leaderboard position).

### `routes/themes.ts` — CustomTheme CRUD (`/api/admin/themes`, admin JWT)
`GET /` (all, newest), `POST /` (name+mainColor required), `PATCH /:id`, `DELETE /:id`.
Not customer-scoped (themes are shared).

### `routes/devTasks.ts` — in-app dev tracker (`/api/admin/dev-tasks`)
`GET /` (admin/super_admin), `POST /` (any admin role incl. viewer/customer; type
feature|bug|change; description or documentUrl required; caps lengths), `PATCH /:id`
(admin/super_admin; status open|in_progress|done|closed).

### `routes/checkAnswer.ts` — AI answer grading (`POST /api/check-answer`, public)
Body `{fields:[{userAnswer,rightAnswer,keywordsBank?}]}`. Per field: empty rightAnswer → true;
exact `normalize()` match → true; else `checkSemantic()` asks Gemini (temp 0, 8s timeout,
"yes"/"no") whether answers convey the same meaning. Returns `{results: boolean[]}`.

### `routes/tts.ts` — Azure Text-to-Speech (`POST /api/tts`, public)
Per-IP rate limit (30/min). Hebrew voices `VOICE_MAP` (man=AvriNeural, woman=HilaNeural).
Escapes text into SSML, calls Azure `cognitiveservices/v1` → returns `audio/mpeg` (24kHz mp3),
cached 1h. 429 rate-limited, 503 if unconfigured, 502 on provider error. Text capped 1000 chars.

### `routes/collage.ts` — photo→video collage engine (`/api/collage`)
The most complex route. Overlays participant photos onto a green-screen template MP4 via
ffmpeg chromakey, uploads to Cloudinary, optional SMS delivery.
**Templates**: `TEMPLATES` (`default` 1080×1350, `gan-yehoshua` 1080×1920) — each has a source
video, chroma color, per-scene motion keyframes (from `data/collage-template-*-motion.json`),
optional logo placeholder + iconRecolor. `DEFAULT_TEMPLATE_ID='default'`. Source videos in
`server/assets/`.
**Exported functions**:
- `buildFilterComplex(template, {logoIdx,titleIdx})` — assembles the ffmpeg `-filter_complex`:
  tpad start, per-scene `scale`+time-gated `overlay` with `piecewiseLinearExpr` keyframe
  interpolation, chromakey (dual-mask `alphamerge` when a logo is present), title overlay,
  optional iconRecolor, final `scale=540:-2`.
- `runFfmpeg(template, templatePath, imagePaths, {logoPath?,titlePath?,onProgress?})` → `{stdout
  (streaming fragmented MP4), done: Promise}`. Spawns ffmpeg (progress on fd 3, libx264
  ultrafast crf28, 20fps, `+empty_moov+frag_keyframe`); streams stdout so encode+upload run
  concurrently. Rejects with stderr tail on non-zero exit (SIGKILL usually = OOM).
- `sendCollageReadySms(jobId)` — **atomic claim** (`findOneAndUpdate` sets `smsSentAt`) so PM2
  cluster workers don't double-send; builds message (share page vs raw URL) and sends via SMS
  provider (at-most-once).
- `processPendingCollageSms()` — sweep up to 50 done jobs with pending `smsPhone` (called every
  15s from `index.ts`).
**In-memory legacy job map** `jobs` (10-min GC) for the synchronous `/generate` path;
`setJobProgress` (monotonic percent). Modern flow uses the `CollageJob` Mongo doc +
`scheduleCollageEncode` (Lambda/local).
**Endpoints**:
- `GET /progress/:jobId` — progress + ETA (prefers Mongo `CollageJob`, falls back to in-memory).
- `POST /upload-sign` *(loadShed)* — signs a **direct-to-Cloudinary** upload (keeps upload
  bandwidth off the server). `POST /photo-uploaded` — record the resulting URL on the job.
- `POST /upload-photo` — legacy: stream a photo through the server to Cloudinary (multer 15MB).
- `POST /upload-title` — upload the title image.
- `POST /jobs` — create/get a `CollageJob` (idempotent by jobId; `requiredImages` from template).
- `GET /jobs/:jobId`, `GET /jobs?activityCode=&splitGroupId=` — fetch job(s).
- `POST /jobs/:jobId/start` *(loadShed)* — validate all photos present → `phase='queued'` +
  `scheduleCollageEncode` (202). Idempotent if already done/encoding.
- `POST /jobs/:jobId/retry` — requeue a failed job.
- `POST /jobs/:jobId/notify-sms` — save `smsPhone` (requires `activity.smsForCollage`); fires
  immediately if already done.
- `GET /share/:jobId` — public RTL share landing page (video + Web Share API + WhatsApp
  fallback + `?dl=1` download redirect via `fl_attachment`).
- `POST /generate` — synchronous legacy path: multer images+title → sharp pre-scale to 1080 →
  `runFfmpeg` piped to Cloudinary upload_stream → `{url, isVideo}`. Cleans temp dir in finally.

### AI / Gemini routes (all build a system prompt + call Gemini `generateContent`)
- **`routes/help.ts`** — `POST /api/help` (public, per-IP rate-limited). Participant help chat.
  Body `{message, lang, history, context}`. FAQ/heuristic match first (`matcher`-style), then
  Gemini fallback. Returns an assistant reply.
- **`routes/avatarChat.ts`** — `POST /api/avatar-chat` (public, rate-limited). In-character
  chat for the **avatar station**. Body `{message(≤500), history, settings(AvatarSettings —
  persona/voice)}`. Returns the character's reply (Gemini, persona system prompt).
- **`routes/avatarQuiz.ts`** — `POST /api/avatar-quiz` (public, 20 req/min/IP). Grades one
  avatarQuiz answer. Body `{stationId, questionIndex, answer, history(last 6), mode?}`; loads the
  station server-side (the ideal answers never reach the client) and returns
  `{verdict, scoreRatio, reaction, teaching}`. `mode:'followup'` sends `message` instead and
  answers a follow-up in character; without a Gemini key follow-ups return a fixed "can't expand
  right now" line while grading falls back to keyword matching.
- **`routes/reportAssistant.ts`** — `/api/admin/report-assistant` (admin/super_admin/customer).
  `classifyExisting()` maps a question to a `ReportCatalogEntry` (pre-canned analytics answer);
  otherwise `askGemini(message, contextJson, lang, history)` with report context. `POST /chat`
  (analytics Q&A over `reportContext`), `POST /download` (CSV export; `escapeCsvCell`).
- **`routes/adminHelpAssistant.ts`** — `/api/admin/help-assistant` (admin roles incl. customer).
  `buildSystemPrompt(lang)` embeds a large how-to knowledge base of the admin UI (tabs, row
  actions, audit log, tutorials). `POST /chat` answers admin how-to questions and can create
  DevTasks.
- **`routes/tutorials.ts`** — `/api/admin/tutorials` (**super_admin**). AI-generated walkthrough
  videos: `POST /generate` creates a `Tutorial` doc then runs `generateVideo()` in the
  background — Gemini writes a Playwright spec (`buildSystemPrompt` + `loadExampleSpecs` +
  `generateFallbackSpec`/`detectTargetHint` fallback), `setStep()` tracks the step pipeline,
  Playwright records the video + Hebrew captions + voice narration, uploads to Cloudinary.
  `GET /`, `GET /:id/progress`, `DELETE /:id` (also destroys the Cloudinary asset).

## B2. Server services

### `services/collageProcessor.ts` — encode dispatch (AWS Lambda)
ffmpeg now runs in **Lambda**; the server just kicks the job and Lambda updates the same
`CollageJob` doc the client polls.
- `updateCollageJobProgress(jobId, patch)` — persist progress; **terminal phases done/error are
  sticky** (late callbacks can't resurrect); percent is monotonic.
- `runCollageEncode(jobId)` — `lambda.send(InvokeCommand, InvocationType:'Event')` (fire-and-
  forget) to `COLLAGE_LAMBDA_FUNCTION_NAME`; on invoke failure marks the job errored.
- `scheduleCollageEncode(jobId)` — sync wrapper (void). `resolveTemplate(id)`,
  `requiredImageCount(id)`. Legacy `getEncodeQueueDepth()`/`getEncodeSlotsInUse()` return 0
  (concurrency is AWS's problem now, but `loadShedding` still reads them).

### `services/groupRewardService.ts` — group-winner SMS coupons
`isRewardEnabled(activity)`, `GROUP_REWARD_IDLE_MS`=5min, `DEFAULT_SMS_TEMPLATE`.
- `onGroupMemberCompleted(activity, groupName)` — resolves **today's** group doc (day-scoped),
  if all today's members completed → `awardGroupWinner` immediately, else set/reset a 5-min
  idle timer (`rewardTimerEndsAt`).
- `processExpiredRewardTimers()` — polled every 30s from `index.ts`; SMS the top scorer among
  completed members (scoped by the group's `createdAt`), sets `rewardProcessedAt` +
  `winnerReportId`/`winnerCouponCode`, writes an `SmsNotification`.

### `services/activityAnalyticsService.ts` — analytics aggregations
`parsePeriod`/`periodStart` (day/week/month/year). Each fn takes `(activityId, period,
excludeIds?)` and reads `Report`s, honoring `excludedReportIds`:
`getActivityAnalytics` (overview KPIs + score histogram), `getFunnel` (joined→started→halfway→
completed), `getItems` (per-item avg score/duration/hint/completion), `getQuestions`
(per-question correctness), `getGroups` (group comparison), `getAnomalies` (high-dropout /
unusual-time flags), `getExportReports` (rows for Excel), `getCombinedReportCard` (cross-
activity). Consumed by `routes/analytics.ts` + `routes/sharedStats.ts`.

### `services/reportContext.ts` — `buildReportContext({activityId, includeParticipants, maxParticipants?})`
Builds a compact JSON snapshot (activity meta, totals, funnel, score distribution, per-item,
per-group, anomalies, optional participant list with PII — admin-only) for the report
assistant LLM when no canned export fits.

### `services/sms/`
`smsProvider.ts`: `SmsProvider` interface (`send(to,message)→{success,providerMessageId?,
error?}`), `StubSmsProvider` (logs only, default), `getSmsProvider()`/`setSmsProvider()`.
`textmeSmsProvider.ts`: `TextmeSmsProvider` → textme.co.il API (wired in `index.ts` when
`TEXTME_*` env set).

## B3. Server utils

- **`israelTime.ts`** — `startOfTodayIsrael(now?)` (UTC instant of Israel midnight),
  `israelDayString(date?)` (`YYYY-MM-DD` in Asia/Jerusalem). Basis of all day-scoping.
- **`scoreNormalization.ts`** — `DEFAULT_PASS_THRESHOLD`=70. `maxScoreForReport(report)`,
  `maxPossibleTotal(reports)` (per-item max summed = activity ceiling), `normalizeScore(raw,
  ceiling)` → 0-100, `resolveCeiling(reports, rawScores)` (true max else highest raw),
  `clampPassThreshold`, `resolvePassThreshold(null→disabled | undefined→70 | n→clamp)`.
- **`participantAuth.ts`** — `validateGroupName`, `resolveGroupName` (**day-scoped**, 410 on
  stale token), `checkGroupCapacity` (day-scoped member count vs `groupMaxMembers`),
  `buildReportLookupQuery`, `createParticipantSession` (issues JWT + upserts the Report,
  `bumpParticipantCount`; the JWT carries **`reportId`** — the report it just resolved),
  `ownReportFilter(participant)` → `{_id}` from the token's `reportId`, falling back to
  `{activityCode, participantName}` for tokens issued before `reportId` existed (7d TTL).
  **Every participant report route addresses the report through it** — participant *name* is
  not an identity (namesakes collide; one person with two email addresses has two reports
  under one name, and a name lookup resumes/overwrites whichever is newest).
- **`groupStatus.ts`** — `resolveGroupMinMembers`, `getGroupStatus` (member/completion counts
  **scoped to today**).
- **`orderSurveyBorda.ts`** — `computeBordaRanking(rankings, referenceItems)` (rank 1 earns N
  pts), `extractOrderSurveyVotes`/`countOrderSurveyVotes` (read latest per-participant ranking
  from `itemResults[].metadata.orderSurvey`).
- **`orderSurveySession.ts`** — `getOrderSurveyLiveState(activity)` (active/phase/voted/total/
  aggregatedRanking), `closeOrderSurveyVoting(activityCode)` (compute Borda → phase='results').
- **`lockBroadcaster.ts`** — per-activity SSE registry: `subscribe(code,res)→unsubscribe`,
  `broadcastLock(code, idx)`, `sendLockEvent(res, idx)`.
- **`groupRewardConfig.ts`** — `buildRewardDownloadUrl(token)`, `cloudinaryAttachmentUrl(url)`
  (adds today's-date text overlay + `fl_attachment`; PDFs skip overlay), `renderWinnerSms(
  template, {name,score,coupon,group,link})`, `resolveGroupRewardForSave(reward, existing?)`
  (keeps stable `downloadToken` when attachment unchanged, else generates one). Has a companion
  `groupRewardConfig.test.ts`.
- **`participantCountCache.ts`** — `getParticipantCount(activityId)` (45s TTL),
  `bumpParticipantCount(activityId)` (for popup thresholds).
- **`provisionManagerCustomer.ts`** — `provisionManagerCustomer(email, plainPassword?)` — upsert
  a `customer`-role User for an assigned manager; syncs password; warns if email already exists
  as a non-customer.
- **`shareOgPage.ts`** — `isSocialCrawler(req)`, `buildPlayOgHtml({pageUrl,title,description,
  imageUrl})`, `requestOrigin(req)` — the `/play/:code` OG short-circuit.
- **`analyticsExcelExport.ts`** — ExcelJS workbook builders: `buildAnalyticsWorkbookBuffer`,
  `buildCombinedReportCardWorkbook`, `buildCombinedActivitiesWorkbook` + export type unions.
- **`db/connection.ts`** — `connectDB()` (pool 5–100, 8s server-selection timeout; drops a stale
  legacy `key_1` index on `stations`).
- **`db/seed.ts`** — `migrateActivities()` (legacy loginComponent→loginFields),
  `migrateActivityGroups()` (backfill `activityDay` + drop legacy group index),
  `seedSuperAdmin()` (from `ADMIN_EMAIL`/`ADMIN_PASSWORD`), `seedBuiltInMission()`.
- **Scripts** (`server/src/scripts/`, run manually): `migrate-customers`, `provision-manager-
  customers`, `seed-fake-data`, `seed-portal-history`, `seedSiteContent`, `siteContentLeadCheck`,
  `fix-riddle-stations`, `diagnose-station-by-name`.

## B4. Client — contexts, API layer, hooks, utils

### Contexts (`client/src/context/`)
- **`AuthContext`** (participant) — `useAuth()` → `{token, participant, isAuthenticated, login,
  establishSession, logout}`. Token in `yooz_token` **+ cookie mirror** (survives webview
  localStorage loss). `login()` POSTs `/api/auth/login`; on a *different* user (email/phone/name
  changed) wipes local progress keys. `logout()` remembers the activity + clears progress.
- **`AdminAuthContext`** — `useAdminAuth()` → `{token, admin{email,role,name}, isAdminAuthenticated,
  login, logout}`. `yooz_admin_token`, JWT-decoded, role-validated.
- **`ManagerAuthContext`** — `useManagerAuth()` → `{token, manager, isManagerAuthenticated, login,
  logout}`. `yooz_manager_token` (+ `yooz_manager_activity_name`), 4h.
- **`LanguageContext`** — `useLang()` → `{lang('he'|'en'), dir('rtl'|'ltr'), setLang}`; sets
  `<html lang/dir>`, persists `yooz_lang` (default `he`). **`useTranslations(texts)`** → active
  language slice of a `{he,en}` object (the co-located `.i18n.ts` pattern).
- **`activityPlayingHeaderContext`** / **`themedSceneOverlayContext`** — share header state /
  themed scene overlays across the play flow.

### API helpers (`client/src/utils/`)
- **`api.ts`** — `apiFetch<T>` (adds `yooz_token` bearer, throws `HttpError`),
  `apiFetchWithRetry` (retries 502/503/504/429 + network, 6 tries, backoff),
  `apiFetchPersistSilent` (retry then queue offline for POST/PATCH/PUT/DELETE).
- **`adminApi.ts`** — `adminApiFetch<T>` (`yooz_admin_token`), `adminUploadFile(file)` → Cloudinary
  via `/api/admin/upload`.
- **`managerApi.ts`** — `managerApiFetch<T>` (`yooz_manager_token`).
- **`fetchErrors.ts`** — `HttpError`, `isRetryableHttpStatus`, `isRetryableFetchError`,
  `retryDelayMs(attempt)`.
- **`offlineQueue.ts`** — durable retry queue for writes: `enqueueOfflineRequest`,
  `isRequestQueued`, `subscribeOfflineQueue`, `flushOfflineQueue`, `ensureOfflineQueueListeners`
  (flush on `online`/visibility).
- **`jwt.ts`** — `decodeJwtPayload<T>(token)`.
- **`participantActivity.ts`** — resolve/remember the activity code from URL/storage/JWT:
  `rememberActivityCode`, `readStoredActivityCode`, `activityCodeFromPathname`,
  `resolveParticipantActivityCode`, `participantPlayPath/StoryPath/MissionPath`.
- **`storySession.ts`** — `storySessionKey`/`load|save|clearStorySessionRaw` (per-code play
  progress, mirrored to localStorage). **`moduleCache.ts`** — in-memory module cache by code+group.
- **`earlyModulePrefetch.ts`** — `prefetchActivityModule`/`startEarlyModulePrefetch` (warm the
  module during login). **`mediaPreloader.ts`** — `preloadActivityMedia`. **`participantMedia.ts`**
  — Cloudinary URL transforms (`participantImageUrl`/`participantVideoUrl`,
  `optimizeActivityMediaData`, `load/preloadParticipantImage|Video`, `shouldDeferVideoPrefetch`).
- **`videoSource.ts`** — `resolveVideoSource(url)` → `{kind:'iframe'|'file', src}` (YouTube/Vimeo
  vs direct). **`collageApi.ts`** — client collage flow (`ensureCollageJob`,
  `uploadCollagePhoto(sParallel)`, `renderTitlePng`, `startCollageJob`, `retryCollageJob`,
  `fetchCollageProgress`, `waitForCollageCompletion`, `makeSplitCollageJobId`).
  **`collagePhotoCompress.ts`** — `compressPhotoForCollage(blob)`.
- **`googleAuth.ts`** — `isGoogleAuthAvailable`, `openGooglePopup`, `fetchGoogleEmail`.
  **`facebookSdk.ts`** — `initFacebookSdk`, `shareViaFacebookDialog`.
  **`inAppBrowserEscape.ts`** — `isInAppBrowser`, `escapeToDefaultBrowser` (break out of
  Instagram/FB webview for camera/QR). **`storageHealth.ts`** — `isStorageHealthy`.
  **`formatDuration.ts`**, **`shuffleArray.ts`**, **`linkifyText.tsx`**,
  **`ganeiYehoshuaShareText.ts`** (customer-specific share copy).

### Hooks (`client/src/hooks/`)
- **`useAnalytics.ts`** — data hooks for the admin stats tab: `useOverview`, `useTimeline`,
  `useActivityAnalytics`, `useFunnel`, `useItemStats`, `useQuestionStats`, `useGroupStats`,
  `useAnomalies`, `useAuditLog`, `usePassThreshold`+`savePassThreshold`, `useShareLink`+
  `create/revokeShareLink`, `useParticipantsRoster`+`saveExclusions`, `useCombinedReportCard`,
  and download helpers (`downloadExport`, `downloadCombined*`).
- **`useLockStream.ts`** — `useLockStream(code, initial)` subscribes to `/lock-stream` SSE →
  current `lockedFromIndex`.
- **`useMediaPreload.ts`** — `useMediaPreload(urls)` → `{ready, failed, retry}` (gates Continue on
  image/video stations).
- **`useGameSounds.ts`** — `useGameSounds(custom?)` (shared game SFX). **`useGameHint.ts`** —
  `useGameHint(hint?)` (hint modal state + penalty). **`useWakeLock.ts`** — keep screen awake
  during play. **`useParticipantExit.ts`** — exit/leave handling. **`usePagination.ts`** —
  generic client pagination.

## B5. Client — pages

### Participant play flow
- **`PlayPage/index.tsx`** (`/play/:code`, `/play/:code/join/:inviteToken`) — the entry funnel:
  fetch activity config → optional **opening splash** (video/image, skippable, `OpeningPhase`) →
  scheduling gate (countdown/expired) → **login**. For single: `ActivityLogin`. For self-service
  groups: a `GroupFlow` state machine (`choice`→`create`/`join-paste`/`join-login`→`success`)
  wiring the `groupEntry/*` components. Prefetches the module (`startEarlyModulePrefetch`) and
  preloads media, then redirects to `participantStoryPath`/`participantMissionPath` by moduleType.
  Handles in-app-browser escape for camera/QR.
- **`StoryModulePage/index.tsx`** (`/story/:code`) — the **orchestrator**. Loads `/module`, holds
  the `Phase` state (`roadmap`|`playing`|`finish`|`leaderboard`), `currentItemIndex`, `scores`,
  popup queue, guidelines, per-station hint tracking, spiders completion set, timers
  (elapsed/roadmap/finish countdown). Persists progress to `storySession` + `PATCH /progress`;
  resumes via `/my-progress`. Renders child views:
  - **`WelcomeScreen.tsx`** — intro/guidelines gate. **`GuidelinesPopup.tsx`** — the rules popup.
  - **`RoadmapView.tsx`** — the story path of item nodes (locked/active/done); themed.
    **`SpidersView.tsx`** — graph layout for `module.type==='spiders'` (`isFinal` node locks
    until others done). Both honor `lockedFromIndex` (manager live lock via `useLockStream`).
  - **`PlayingPhase.tsx`** — renders the current item: games (`components/games/*`), stations
    (inline renderers incl. `VideoStationPlayer` with end-gated Continue, `ImageStationDisplay`,
    narrative/badge/etc.), or an inline mission (`MissionInlinePlayer.tsx`). Applies theme chrome,
    station description popups, floating clue button, station hint warnings.
  - **`FinishScreen.tsx`** — final score/stars/time/items + share (video collage / badge) +
    countdown. **`LeaderboardView.tsx`** — individual + group standings (`/leaderboard`).
  - **`ActivitySessionHeader.tsx`** — top bar (progress, leaderboard trophy, logout, mute).
- **`MissionPage/index.tsx`** (`/mission/:code`) — standalone 3-part mission: explanation screens
  → `MissionPuzzle.tsx` → `MissionTrashSort.tsx` (+ `MissionFrame`, `MissionTopMenu`); posts
  `mission-event` analytics.
- **`HomePage/index.tsx`** (`/home`) — post-login landing for some flows.
- **`LandingPage`** / **`PublicityPage`** — marketing site (`SiteContent`-driven).
  **`PrivacyPage`** — privacy policy. **`ParticipantLandingRedirect`** / `FallbackRedirect`
  keep participants on their activity.

### Admin pages (`pages/admin/`)
- **`AdminLoginPage`** — email+password / Google. **`AdminDashboardPage/index.tsx`** — tab shell
  (activities/statistics/stations/library/portals/publicity/users/tutorials by role); parallel-
  fetches activities/games/stations/missions/folders; folder UI (`FolderFormModal`,
  `PastelSwatchPicker`, `folderUi`).
- **`AdminCreateActivityPage/`** — the big activity editor: `index.tsx` (steps: basic config →
  module config → extras), `ModuleItemsSection` (pick/reorder games/stations/missions, group
  assignment, collage split via `CollageSplitEditor`), `PopupMessagesSection`, `ThemeFormModal`,
  `ItemPreviewModal`.
- **`AdminGameConfigPage/`** — per-type config forms: `TriviaGameConfig`, `OrderGameConfig`,
  `PuzzleGameConfig`, `TrueFalseGameConfig`, `BallGameConfig`, `TrashSortGameConfig` (+ `index`).
- **`AdminStationConfigPage`** — station editor (all 10 types). **`AdminMissionConfigPage`** —
  mission editor. **`AdminPortalConfigPage`** — portal editor (users, Excel import, activities).
- Dashboard tabs: **`AdminGamesTab`**, **`AdminStationsTab`**, **`AdminLibraryTab`**,
  **`AdminPortalsTab`**, **`AdminPublicityTab`** (site content + leads), **`AdminUsersTab`**,
  **`AdminTutorialsTab`**, and **`AdminStatisticsTab/`** (see below).
- **`AdminStatisticsTab/`** — `index` (view switch overview/activity/combined/audit),
  `OverviewSection` (KPIs, timeline, activities table, combined-select, audit-log button —
  hidden for customers), `ActivityAnalytics` (per-activity tabs), `FunnelChart`,
  `ItemAnalyticsTable`, `GroupComparison`, `ParticipantsRoster` (exclusions), `ExportSection`,
  `CombinedReportCard`, `AuditLogView`, `analyticsSource`.
- **`AdminViewActivityPage`** — read-only activity detail.

### Manager pages (`pages/manager/`)
- **`ManagerLoginPage`** — activity code + password/Google. **`ManagerDashboardPage/index`** —
  live session: `AnimatedLeaderboard`, `ControlFlowTab` (progress lock, order-survey control).
  **`OrderSurveyPresentPage`** (`/manager/present`) — presenter screen (live votes + Borda
  results reveal).

### Public pages
- **`portal/PortalPage.tsx`** (`/portal/:code`) — portal login/register + activity list +
  history. **`shared/SharedStatsPage`** (`/stats/:token`) — public read-only analytics dashboard.

## B6. Client — components

### Login / group entry
- **`login/ActivityLogin.tsx`** — the login form (name/email/phone + `SmsConsent` + Google +
  preset `GroupSelector`). **`login/GroupSelector.tsx`** — bottom-sheet preset-group picker.
  **`login/ManagerLoginModal.tsx`** — manager login modal.
- **`groupEntry/`** (self-service): `GroupEntryChoice` (create vs join), `CreateGroupForm`
  (+ `useDebouncedGroupNameCheck` live `/check-name`), `GroupCreatedSuccess` (invite link/QR),
  `JoinExistingGroupForm` (paste link/name + today's-groups picker from `/groups/today`),
  `JoinGroupLogin` (fill details after choosing a group).

### Games (`components/games/`)
Each game: `index.tsx` player + `styled.ts` + `.i18n.ts`; reports `{score, maxPossibleScore,
questionAnswers?}` up to `PlayingPhase`. **`TriviaGame`** (MCQ, timer, helpers, hint),
**`OrderGame`** (`index` drag-order quiz + `OrderSurveyGame` live poll + `GolfChallenge`
variant), **`PuzzleGame`**, **`TrueFalseGame`**, **`TrashSortGame`**, **`BallGame`** (Phaser:
`BallGameCanvas`/`BallGamePlay`/`usePhysicsEngine`/`useBallGameSounds`/`levelConfigs`).
Shared: `GameInstructionsScreen`, `GameCompleteScreen`, `HintButton`/`HintModals`, `MuteButton`,
`types.ts`, `styled.ts`.

### Stations (`components/stations/`)
`AvatarStation` (AI chat → `/api/avatar-chat`), `BadgeStation`, `CollageStation` (photo capture
→ collage job; `collageJobStorage`/`collageSplitStorage`/`backgroundCollageJob` helpers),
`AvatarQuizStation` (character asks, AI grades → `/api/avatar-quiz`), `EnteringTextStation`,
`FeedbackStation`, `NarrativeStation` (TTS narration), `RiddleStation`
(answer checked via `/api/check-answer`), `StationDescriptionPopup`,
`ImageZoomOverlay` (shared fullscreen image viewer — riddle + story media). (text/video/image are
rendered inline in `PlayingPhase.tsx`.)

### Other components
- **`HelpChat/`** — participant help FAB/drawer (`index`, `HelpChatContext`, `matcher`, styled)
  → `/api/help`. **`AdminHelpChat/`** — admin how-to chat + `DevTasksPanel` → `/api/admin/help-
  assistant`. **`AdminReportChat/`** — analytics Q&A → `/api/admin/report-assistant` (+ `markdown`).
- **`MobileContainer`** (≤480px participant frame), **`ParticipantActivityScope`** (scopes a
  participant to one activity), **`ParticipantLandingRedirect`**, **`ActivityLogoutButton`**,
  **`SmsConsent`**, **`Pagination`**, **`ErrorBoundary`**, **`FileUploadButton`** (Cloudinary),
  **`LangDrawer`** (language switch), **`StationStage`**.
- Backgrounds/themes: `ThemedBackground`, `DesertBackground`, `NatureBackground`,
  `OceanBackground`, `OfficeBackground`, `themes/SpyThemeWrapper`. `styled.ts` holds shared
  styled primitives + color tokens (`PRIMARY`, `TEXT`, …).

---

_End of Part B. Part B mirrors the code as of this reconstruction — when a signature, endpoint,
or component changes, update the matching entry here so the fast path stays trustworthy._
