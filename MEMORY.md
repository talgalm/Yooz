# MEMORY.md — Yooz Platform Canonical Reference

> Source-of-truth reconstruction of the Yooz codebase: data models, API surface, client
> architecture, game/station systems, and conventions. Read this before answering
> architectural questions or designing features. Pairs with `CLAUDE.md` (dev commands +
> deployment) and `QA_REQUIREMENTS_AND_TESTS.md` (per-feature requirements + manual tests).
>
> This file is committed with the repo - keep it updated as the system evolves.

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
  (multer memory → Cloudinary SDK, `use_filename` so the public_id keeps the original name,
  optional `folder` field → upload straight into an open media-library folder).
  Client component: `FileUploadButton` (picker: computer *or* existing media). Browse/delete
  the cloud from the **Media tab** → `/api/admin/media`.
- **Video collages**: ffmpeg encode runs on AWS Lambda (see `LAMBDA_SETUP.md`,
  `server/src/lambda/collageHandler.ts`). The only ffmpeg still run on the box is the legacy
  synchronous `POST /api/collage/generate`.
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
`npm run check` is the gate: typecheck (server + client) then every `node:test` file matched by
`client/src/**/*.test.ts` and `server/src/**/*.test.ts` (a new `.test.ts` is picked up with no
wiring). Both are clean, so any error is new. `*.check.ts` / `*.selfcheck.ts` files are run by
hand with `npx tsx <file>` and are not in the gate. No lint script. Playwright walkthroughs
(`npm run walkthrough*`, `walkthroughs/*.spec.ts`) are UI-flow recordings, not assertions.
Client typecheck is `tsc -p tsconfig.app.json --noEmit`, run from `client/`: `client/tsconfig.json`
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
`TEXTME_API_TOKEN`/`_USERNAME`/`_SOURCE` · `RESEND_API_KEY` (automated reports, §4; sender is the `EMAIL_FROM` constant) ·
`CORS_ORIGIN` (comma list; unset = allow all) ·
`REGISTER_PHONE_KEY` (shared secret for the public register-phone API; unset = that one endpoint
refuses every call, nothing else is affected).
In production, `JWT_SECRET`/`ADMIN_EMAIL`/`ADMIN_PASSWORD` are **required** (throws otherwise).
Client build-time (Vite, baked into the bundle — not read at runtime): `VITE_GOOGLE_MAPS_KEY`
(map modules, §16), `VITE_GOOGLE_CLIENT_ID`, `VITE_FACEBOOK_APP_ID`, `VITE_API_URL`. The deploy
workflow sources `/etc/yooz/prod.env` **before** `npm run build` in `client/`, so a GitHub secret
`SM_VITE_GOOGLE_MAPS_KEY` reaches the bundle with no workflow edit.

---

## 3. Auth realms (the #1 thing to know)

Five JWT-bearing identities, each with its own React context, `apiFetch` wrapper, and
localStorage key. **Never mix them.** All five share one `JWT_SECRET`, so a claim in the token
(role, or `realm` for Manage) is the only thing keeping one realm's token out of another's API.

| Realm | How they log in | JWT role | localStorage key | Client helper / context |
|---|---|---|---|---|
| **Admin** | email+password (super-admin from `.env`; others in `users`) | `viewer`/`admin`/`super_admin`/`customer` | `yooz_admin_token` | `adminApi.ts` / `AdminAuthContext` |
| **Participant** | activity code (anonymous) or portal login | n/a | `yooz_token` (+ cookie mirror) | `api.ts` / `AuthContext` |
| **Manager** | per-activity email + bcrypt password (or Google) | `manager` | `yooz_manager_token` | `managerApi.ts` / `ManagerAuthContext` |
| **Portal user** | portal code + username/password (bcrypt) | issues a participant token | `yooz_token` | via `PortalPage` |
| **Manage** (YOOZ Manage, §17) | no login of its own: an **employee**'s admin session is exchanged for it | `owner`/`pm`/`member` + `realm:'manage'` | `yz_manage_token` | `manageApi.ts` / `ManageAuthContext` |

- Middleware: `authenticateAdmin`+`requireRole(...)` (`middleware/adminAuth.ts`),
  `authenticateToken` (participant, `middleware/auth.ts`), `authenticateManager`
  (`middleware/managerAuth.ts`), `authenticateManage`+`requireManageRole(...)`
  (`middleware/manageAuth.ts`). All read `Authorization: Bearer <jwt>`, verify with `JWT_SECRET`.
- **Participant token** is mirrored to a `yooz_token` cookie (7-day) because in-app webviews
  can drop localStorage between opens (`AuthContext.tsx`). On login as a *different* user,
  local progress keys (`yooz_session_*`, `yooz_game_progress_*`, `puzzle_progress_*`,
  `yooz_avatar_chat_*`, `yooz_entering_text_*`, `yooz_start_*`) are wiped.
- **Admin roles** (least to most): `viewer` = **read-only**, sees all content; `authenticateAdmin`
  refuses any non-GET/HEAD/OPTIONS for it (`authenticateAdminAllowViewerWrites` only on dev-task
  reporting), no analytics/media/publicity. `customer` = **scoped to their own activities** (see §7),
  auto-provisioned from an activity's manager email; may use all custom themes but edit/delete only
  their own (`CustomTheme.createdByEmail`); no test SMS. `admin` = all content + all analytics +
  media + publicity + audit log + test SMS. `super_admin` = admin + users + tutorial create/delete.

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
- `type: 'story'|'mission'|'spiders'|'map'`, `theme?` (e.g. `'spy'`), `backgroundImage?`.
- `items: IModuleItem[]` — ordered `{type:'game'|'station'|'mission', ref: ObjectId,
  groups?: string[] (only these groups see it), spiderSvg?, isFinal? (spiders lock),
  collageSplit? (split a collage station into N parts across the activity),
  revisitable? (completed item stays re-openable from the roadmap — see §11),
  location? ({lat,lng,address?} — where the station physically is, map modules only, §16),
  cipherChar? (map: the character this station reveals in the cipher, §16)}`.
- `missionRef?` (when `type='mission'`), `showStationNumbers?`, `showItemTitleNumbers?`.
- `groupOrders?` (map: group name → permutation of item indices), `proximityMeters?` (map: §16),
  `mapDesign?` (map: `{style, hidden[]}`, the map's look and which Google places it shows, §16).
  `openAnywhere?` (map: stations open from anywhere instead of only on arrival, §16).
  `showStationNames?` (map: a name label under each station pin, §16).
  `cipherEnabled?` (map: the cipher button and the per-station characters, §16).
- `popups?: IPopupMessage[]` — see §11.

**Leaderboard/scoring flags**: `leaderboardMode: 'points'|'time'|'both'`,
`leaderboardAsGrade?` (show points as 0-100 normalized grade), `hideLeaderboardInHeader?`,
`leaderboardCurrentDayOnly?` (**default true** — only today's Israel-time reports),
`activityDurationMinutes?` (time mode), `roadmapTimerMinutes?` (cosmetic count-up, turns red),
`passThreshold?` (0-100, **default 70**; null = no pass grade), `includeOnRoadmap?`.

**Daily reset**: `dailyReset?` (**default false**, checkbox in the Scheduling section of
`AdminCreateActivityPage`) + `lastDailyResetDay?` (Israel `YYYY-MM-DD` stamp). A 5-minute
sweep (`services/activityReset.ts`, started from `index.ts`) rolls the activity over at
Israel midnight. An activity with no stamp is only *armed*, never rolled over, so ticking
the box does not disturb the current day.

**It does not delete reports.** `rollOverActivityDay` clears only what would leak yesterday
into today's *participant* experience — `ActivityGroup` rosters and `orderSurveySession`.
Reports and the analytics counters are kept, and the admin reports slice them per day
(`day:YYYY-MM-DD` period, §14). Hiding previous days is enforced at **read** time, and every
participant-facing read of Reports must honour it:
- login (`participantAuth.buildReportLookupQuery(..., dayScoped)`) — otherwise a participant
  returning the next morning resumes *and overwrites* yesterday's finished report;
- `GET /:code/leaderboard` — `dailyReset` forces `currentDayOnly` on regardless of the
  `leaderboardCurrentDayOnly` flag;
- `getParticipantCount(id, dayScoped)` — participant-count popup thresholds;
- **the session itself**: the JWT carries `dailyReset: true`, and `authenticateToken` 401s a
  token issued before today's Israel midnight. Without it a token kept overnight (7-day JWT,
  mirrored in a cookie) still addresses yesterday's report *by id*, and the `/scores` upsert
  would overwrite it. `isStaleDailyResetToken` drops the same token client-side at restore
  (`AuthContext.readStoredToken`) so the participant meets the login screen, not an error.

Go-live is still a real wipe (`wipeActivityData`, deletes reports) — a deliberate "clear the
test runs" action, not the daily rollover.

**Stats sharing**: `statsShareToken?` (public read-only link), `excludedReportIds?`
(non-destructive exclusion from stats/exports).

**Analytics counters**: `shareClicks`, `shareCompleted`, `missionPuzzleCompletions`,
`missionTrashSortCompletions`, `missionTrashSortScoreSum`.

**Live session**: `lockedFromIndex?` (manager progress lock — items ≥ this are blocked),
`orderSurveySession?` (live order-game poll: itemIndex, gameId, roundIndex,
phase `'voting'|'results'`, resultsRevealed, aggregatedRanking[Borda]).

**Cashier gate**: `userControl?` (default false, checkbox "שליטה במשתשמשים" under the manager
fields in activity create/edit). When on, only a phone with a `PhoneRegistration` for **today's
Israel day** may create a self-service group — otherwise `POST /:code/groups` answers
`403 {error:'not_registered'}` and the participant sees "כדי להשתתף בפעילות, צריך לשלם בקופה
ולהירשם אצל הקופאי". Off = no check anywhere.

**Groups (self-service)**: `groupMinMembers?` (default 1), `groupMaxMembers?` (0/null = no cap).
A cashier ticket code doubles one group's cap: `POST /:code/groups/redeem-capacity
{groupToken, code}` checks `code` against `GROUP_CAPACITY_CODE` (default `'2026'`) and sets
`ActivityGroup.maxMembersOverride`, which `checkGroupCapacity` prefers over the activity cap.
**Participant help chat (per activity)**: `organizerContactName?`/`organizerContactPhone?` (who
the bot points people to), `helpCategoriesDisabled?` (FAQ keys to hide: login, game_start,
score, loading, kicked_out, button_stuck, task_stuck, video_missing), `helpCategoryResponses?`
(per-key answer overrides), `helpOtherCategoryEnabled?` (free-text "something else" chat, off by
default), `extraSupportInfo?`.
**Group reward**: `groupReward?: {enabled, couponCode, messageTemplate?, attachmentUrl?,
attachmentType?:'image'|'pdf', downloadToken?}` — top scorer gets an SMS coupon after all finish.
**Collage SMS**: `smsForCollage?` (requires phone login), `smsForCollageMessage?` (`{link}`
placeholder), `smsForCollageShare?` (link → share landing page vs raw video).

**Automated reports**: `scheduledReport?: {enabled, reportType:AnalyticsExportType, recipients:
string[], frequency:'daily'|'weekly', dayOfWeek? (0-6, weekly only), scheduleHour (0-23, Israel
time, **whole hour only — no minutes field**), skipIfUnchanged, lastSentAt?, lastSentSnapshot?}`.
Yooz-admin-only (no manager/customer self-service) — set from the "דוחות אוטומטיים" sub-tab in
`AdminStatisticsTab/ActivityAnalytics` (`AutomatedReportSection`), `GET/PUT
/api/admin/activities/:id/scheduled-report`. `services/scheduledReports.ts`'s 5-minute sweep
(`runScheduledReports`, started from `index.ts`) sends when the current Israel hour/day-of-week
matches and it hasn't already sent within this same Israel hour (the idempotency guard the 5-min
poll needs — mirrors `dailyReset`'s stamp-comparison above), skipping when `skipIfUnchanged` and
a fresh `computeReportsSnapshot()` matches `lastSentSnapshot`. `sendScheduledReportNow(activity)`
is the one place that actually builds (`buildAnalyticsWorkbookBuffer`) and emails (Resend) the
report and stamps `lastSentAt`/`lastSentSnapshot` — shared by both the cron and the manual
`POST …/scheduled-report/send-now` ("שלח עכשיו" button), which sends immediately on the activity's
saved settings, ignoring the schedule and `skipIfUnchanged` entirely. **It does not mutate report
data** — only reads Reports and stamps the schedule's own two fields. Resend sends from
`EMAIL_FROM` in `config.ts` (`reports@yooz.org.il`, a verified domain, so any recipient works;
needs `RESEND_API_KEY`).

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

### PhoneRegistration (`phone_registrations`) — cashier gate, day-scoped
`{phone, activityCode, activityDay, createdAt}`, unique on all three (so a re-fired registration
upserts instead of duplicating). `phone` is `normalizePhone()`d digits (`utils/phone.ts`:
`+972`/`00972`/dashes/parens folded to `05…`, landlines too), so a till and a participant typing
the same number match.
`activityCode: null` means **every** activity with `userControl` on — including ones created
after the registration — rather than a row per activity. `activityDay` is one Israel calendar day
(`YYYY-MM-DD`); registrations are never deleted, they just stop matching once the day rolls over.

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
  by the participant's group (`item.groups`) **and** reorders them by `module.groupOrders`
  (map modules) — both via `utils/moduleItems.ts::visibleOrderedIndices`. Filtering and
  reordering shift indices: the client's 0..n-1 is the index space progress is recorded in.
  Popups follow: `popupsForServedItems` moves each `beforeItem`/`afterItem` index to its
  station's served position and drops popups for stations this player can't see.
- `GET /:code/lock-stream` — SSE of `lockedFromIndex` (manager live lock).
- `GET /:code/leaderboard` — points/time/group standings; respects `leaderboardCurrentDayOnly`
  (forced on by `dailyReset`), `leaderboardAsGrade`; group standings = summed member scores
  (Borda not used here) — except map modules, which rank teams by today's `MapGroupState.score`. Row cap is 50, or 500 for group activities — the participant view
  lists every teammate of the viewer's own group, so the cap must clear all groups combined.
- `PATCH /:code/progress` *(participant JWT)* — incremental per-item progress save.
- `POST /:code/scores` *(participant JWT)* — final score submit → completes the Report.
- `DELETE /:code/my-report` / `GET /:code/my-progress` *(participant JWT)* — replay support.
- `GET /:code/order-survey/status` *(participant JWT)* — live order-survey phase.
- **Map runs** (mounted via `mapRunRouter`, all *participant JWT*, all group-scoped — §16):
  `POST /:code/map/position` (report a GPS fix; server decides if you're the group's broadcaster),
  `GET /:code/map/state` (own group's shared progress + every *other* group's marker/score),
  `POST /:code/map/complete` (record a finished station for the whole team; idempotent).
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
- `GET/PUT /activities/:id/scheduled-report`, `POST /activities/:id/scheduled-report/send-now` —
  automated reports (admin/super_admin only — see Activity model, §4). Not customer-scoped
  (role-gated instead, since customers can't reach it at all).
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
  `/api/admin/media` (admin/super_admin; browse + delete Cloudinary assets),
  `/api/admin/dev-tasks` (admin/super_admin).

### Admin analytics — `/api/admin/analytics` (`analytics.ts`, roles admin/super_admin/customer)
- `GET /overview`, `/overview/timeline` — global KPIs (customer-scoped).
- Per activity: `/activities/:id`, `/funnel`, `/items`, `/items/:index/questions`, `/groups`,
  `/anomalies`, `/export` (Excel), `/participants`, `PATCH …/participants/exclusions`,
  `GET/PATCH …/pass-threshold`, `GET/POST/DELETE …/share` (public share link), `/days`.
- `?period=` accepts `day|week|month|year` **or `day:YYYY-MM-DD`** for a single Israel day —
  the reports' day breakdown. `GET /activities/:id/days` lists the days that have reports
  (newest first, with participant counts) and fills the picker beside the period pills.
  `/participants` (the roster) is deliberately **not** period-filtered: it is the exclusion
  management surface and the PATCH replaces the *full* excluded set, so a filtered roster
  would silently drop other days' exclusions. It shows `joinedAt` per row instead.
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
  `/api/admin/help-assistant` (`/chat`, admin how-to + analytics Q&A + dev-task creation).
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
- **`services/contentTranslation.ts`** — machine translation of admin-authored activity content
  (station names, riddles, questions, popups) for a participant running in a language other than
  Hebrew. `translateContent(payload, lang)` walks whatever a route was about to send, collects
  the Hebrew prose (skipping ids, URLs, colours and the other non-prose keys), translates the
  misses through Gemini in batches of 40, and caches each one in **`ContentTranslation`**
  (`contenttranslations`), keyed by sha256 of `lang:source`. Editing the text in the admin
  changes its hash, so there is nothing to invalidate. It never fails a request: a model error,
  a timeout or a missing `GEMINI_API_KEY` leaves the Hebrew in place. The UI chrome around it is
  hand-translated in the `.i18n.ts` files — this is only for content nobody can pre-translate.
- **`services/activityPretranslate.ts`** — `Activity.languages` (chosen in the wizard's settings
  step, e.g. `['en']`) is the set of languages an activity is offered in besides Hebrew. Saving
  the activity warms the cache for each of them in the background — module copy, stations, games
  and missions — so the first participant to pick that language does not wait for the model.
  Fire-and-forget: if it fails, the participant path still translates what it finds missing.
  The participant config (`GET /api/activities/:code`) reports `languages` so the picker can
  offer exactly what the activity was prepared for. An activity that declares none is served
  exactly as written, and the whole interface inside it falls back to Hebrew
  (`ParticipantActivityScope` → `LanguageContext.restrictToLanguages`) rather than wrapping
  Hebrew content in an English shell.
  `Activity.defaultLanguage` ("שפת פתיחה" under the languages in the wizard) is the language the
  activity opens in; it must be one of `languages` (`sanitiseStartLanguage`), and Hebrew is stored
  as no setting. The config reports it, and `PlayPage` switches to it the first time a device
  enters that activity code (`takeStartLanguage`, remembered in `localStorage`
  `yooz_activity_started_langs`), so a participant who then picks another language keeps it.
- **`routes/adminTranslations.ts`** (`/api/admin/translations/:kind/:id`, `kind` = `stations` |
  `games`) — the review half. `GET ?lang=en` lists every translatable string in the item with its
  machine translation and any human correction. **It translates nothing on its own**: it reads
  the cache (`cachedTranslations`, split out of `translationsFor` for exactly this) and reports
  `missing`, the count with no translation yet. `?translate=1` fills those in, and is only ever
  sent by the button on the screen — opening a tab used to translate the whole item, which
  spends real money at the model, most pointlessly for a language no activity offers. Measured:
  opening a cold tab is ~7ms and writes nothing; the button takes ~2.7s for 36 sentences;
  `PUT` stores the corrections on the document itself, in `Station.translations` /
  `Game.translations`: `{ en: { '<the Hebrew>': '<the English>' } }`. Keyed by source text, not
  by field path, because `settings` is free-form per type. `GET /api/activities/:code/module`
  applies these **before** the machine pass (`withReviewedTranslations`), so a corrected sentence
  is no longer Hebrew by the time `translateContent` runs and the model only fills the rest.
  Editing the Hebrew retires the correction with it.
  Two more endpoints drive the language tabs: `GET /:kind/:id/languages` returns, per language,
  how many sentences were hand-edited (`reviewed`), whether an activity that includes this item
  still offers it (`inUse`), and whether the registry still has it (`supported`); and
  `GET /activity/:id/languages` rolls the same counts up across an activity's items for its
  language picker (registered **before** the `:kind` routes, which would otherwise swallow it).
  Turning a language off an activity never deletes translations - `inUse: false` is how the UI
  says "kept, but nobody is reading it".
  Admin UI: **`components/TranslationsPanel/ContentLanguageTabs`** wraps the page's whole
  `AdminCardWide` and renders browser-style tabs *above* it - "כללי (עברית)" is the form as
  authored, every other tab is the same content in that language. Three things make the active
  tab read as part of the card rather than as a shape above it: the active tab repeats the card's
  own 1px border and `box-shadow`, with a *white* bottom border, and the strip is pulled down by
  exactly that 1px (`margin-bottom: -1`, `position: relative; z-index: 1`, since the card is a
  later sibling and would otherwise paint on top) so that white row lands on the card's top
  border and hides it - deeper, and the tab's side borders carry on into the card as two stubs.
  That white row is an `::after` bar spanning the *padding* box, not the border itself: as a
  border it is mitered against the side borders, and on a HiDPI screen the miter bled one device
  pixel of white past the card's edge (`background-clip: padding-box` keeps the background out
  of it too). The bottom border keeps the card's colour, so both corner pixels match the outline;
  the shadow is clipped at the tab's bottom (`clip-path: inset(… 0)`) so it wraps the top and
  sides without smudging across the card, and the strip carries 24px of padding with an equal
  negative margin purely to give that shadow room, because a sideways-scrolling strip clips its
  contents; and the card gives up the corner the tabs sit on (`border-start-start-radius: 0`, applied to
  whatever the component wraps), since a tab flush with the edge otherwise sits over a 16px
  curve and shows a wedge of page beneath it - the tabs stay aligned with the card's edge and
  the silhouette runs straight down into it. The property is logical, so the squared corner
  follows the page direction. Only the active tab is opaque,
  so the card's own top border still runs under the inactive ones. `overflow-y` is pinned to
  `hidden`: a box with `overflow-x: auto` has a `visible` y-axis promoted to `auto`, so one pixel
  of downward overflow grew a scrollbar on the tab strip - which is also why the overlap is done
  by moving the strip rather than the tabs, and why a bridging `box-shadow` would not work.
  Past about eight languages the strip scrolls sideways, and the edge it continues past is faded
  with a `mask-image` driven by its scroll position (a `ResizeObserver` plus the `scroll` event;
  `scrollLeft` runs negative in RTL, so distance from the start is its magnitude). Without it a
  strip that simply ends mid-tab reads as broken rather than as scrollable. The strip is moved
  **only by clicking a tab** - `overflow-x: hidden`, which still allows `scrollIntoView` but
  offers no scrollbar, no wheel and no drag, so it can never sit half-way between two tabs. A
  click scrolls the clicked tab's *neighbour* into view, walking the strip that way by the least
  it can; the "scroll the active tab into view" effect is keyed on the tab list only, never on
  the selection, because re-running it on a click cancelled that smooth scroll and the strip
  never moved. The card is clipped flush at its top (`clip-path: inset(0 -60px -60px -60px)`):
  its shadow blurs ~20px above its own edge, and since inactive tabs are transparent that shadow
  washed up through them and greyed their lower half - measured as a 245→242 gradient. Raising
  the strip's `z-index` does not fix it; the shadow is already behind the tabs. The shadow room is padding on the **top only**: the same trick sideways made
  the strip wider than the card, and content scrolls *through* a scroller's padding, so tabs
  appeared outside the card's edges. Built for the registry reaching ~7 languages - verified that eight tabs neither
  clip nor scroll vertically once the strip scrolls sideways - and a language's rows load only
  when its tab is first opened, since asking is what produces the translation. The card is
  hidden with `display: contents → none` rather than unmounted, so unsaved edits survive a look
  at a translation and the layout around it keeps its own spacing.
  **`TranslationsPanel`** is one language: each box opens holding what participants would see
  (a person's wording if any, else the machine's) and is edited in place. Only boxes whose text
  differs from the machine's are stored - a box left alone stays machine-driven and keeps
  improving, and clearing one hands it back. Each box carries its own language's `dir` from
  `LANGS`, which needed `App.css` to stop `input { direction: inherit }` outranking the `dir`
  attribute (English in a Hebrew screen had its full stops at the wrong end).
  Mounted in `AdminStationConfigPage` / `AdminGameConfigPage` (edit mode only); the activity
  wizard's `TranslationsModal.tsx` renders the same tabs with no form, so it opens on the first
  language.
- **`services/activityAnalyticsService.ts`** — analytics aggregations (funnel/items/questions/
  groups/anomalies/report-card/export builders).
- **`services/reportContext.ts`** — builds LLM context for DumbDumbBot's report answers.
- **`services/scheduledReports.ts`** — automated reports: `sendScheduledReportNow(activity)`
  (build + Resend send + stamp `lastSentAt`/`lastSentSnapshot`), `runScheduledReports()` (the
  hourly-by-Israel-time sweep), `startScheduledReportsScheduler()` (5-min poll, started from
  `index.ts`). See Activity model §4.
- **`utils/customerScope`** is in `middleware/customerScope.ts` (§7).
- **`utils/israelTime.ts`** — `startOfTodayIsrael()` (UTC instant of Israel midnight),
  `israelDayString()` (`YYYY-MM-DD` in `Asia/Jerusalem`), `israelHour()` (0-23),
  `israelDayOfWeek()` (0-6, 0=Sunday). Used for day-scoping (groups, leaderboard) and the
  scheduled-reports cron's hour/day matching.
- **`utils/scoreNormalization.ts`** — `normalizeScore`/`resolveCeiling`/`maxScoreForReport`/
  `clampPassThreshold` — the 0-100 grade normalization used across analytics + leaderboard grade mode.
- **`utils/participantAuth.ts`** — `resolveGroupName` (day-scoped), `checkGroupCapacity`
  (day-scoped), `createParticipantSession`, `buildReportLookupQuery`, `ownReportFilter`,
  `validateGroupName`.
- **`utils/mediaFolders.ts`** — `ROOT_FOLDER` (`yooz`), `MACHINE_FOLDERS`
  (`collage-inputs`/`collages`/`face-swap`/`tutorials` — written by the app, never listed,
  moved, deleted or nested into), `resolveFolder(input)` → normalized path or null (rejects
  traversal, >3 levels, machine folders; bare names are root-relative),
  `isDeletableAsset(publicId)` → may the library move/destroy it. In dynamic folder mode the
  `public_id` never changes, so its prefix stays a reliable answer to "who created this".
- **`utils/mediaInUse.ts`** — `docMentions(doc, publicId)` (stringify-and-scan: media URLs
  live in free-form bags like `game.settings`, so a field list would silently rot) and
  `findMediaUsage(publicId)` → every activity/game/station/mission/theme/library/siteContent/
  portal/layout/tutorial still pointing at the asset. Delete-time only, never on list.
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

Applied throughout `admin.ts`, `analytics.ts`, `adminHelpAssistant.ts`.
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
  `shuffleAnswers?`, `includeHelpers?` (one-time 1/2 or 3/4 eliminations). The intro title is the game's
  name (it was always "טריוויה"), like the order game; the card under it shows `instructions` and is left
  out when there are none. `components/games/TriviaGame/`.
- **Ball Game** (`BallGameSettings`): Phaser physics quiz — `questions:{text,answers[4] one
  correct}[]`, `scoring:{timeLimitSeconds}`. `components/games/BallGame/` (Phaser assets in
  `client/public/assets/games/ballgame/`).
- **Puzzle**: slide/drag puzzle over an image + optional per-question timer + speed bonus.
  `components/games/PuzzleGame/`.
- **True/False**: `statements:{text, isTrue, media?, instruction?}[]`, `scoring:{correctPoints, wrongPenalty,
  timeLimitSeconds}` - `timeLimitSeconds: 0` means no time limit (no timer, no timeout), like trivia. The play
  screen stacks a small timer badge at the top, the statement with its optional `instruction` under it in the
  same card, then the image filling the space left above the true/false buttons (it was a thumbnail under a
  big timer circle). Without an image the timer and a bigger statement card sit centred in that space with a
  "נכון או לא נכון?" prompt under them (`StatementStage`), since the top-aligned card left the middle empty.
  `components/games/TrueFalseGame/`.
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
  `characterImageUrl`, `characterImagePosition` (`"x% y%"` object-position picked in admin with
  `ImagePositionPicker`; also on **avatar**), `voiceType:'man'|'woman'` (TTS), `topic`, `introText`/`outroText`,
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
  In a **group** activity the participant sees only their own group: one group card (with its
  real rank among all groups) and their own teammates, re-ranked 1..n *within* the group —
  never another group's players. Solo activities keep the top-3 + me-and-neighbours window.
  The viewer's own row is bold pure white, everyone else 600/82% — that is the "which one is
  me" cue, alongside the highlighted card.
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
`LAMBDA_SETUP.md`), kicked fire-and-forget by `services/collageProcessor.ts` - there is no local
fallback in that path. Upload/start routes are protected by `loadShed` (503 + Retry-After when
event-loop lag or RSS trips; the queue-depth signal always reads 0 now that AWS owns concurrency).
Boot recovery in `index.ts` resurrects jobs 30s–15min stale, aborts older ones. A split collage
(`module.items[].collageSplit`) spreads photo capture across several stations. Every collage
storage/job key is scoped by `participantSessionId()` (`utils/participantActivity.ts`) — a random
id minted on each login — so a second participant on the same phone can't be handed the previous
one's finished video. Never derive that scope from name/email/phone: those collide. Optional SMS
delivery of the finished video (`smsForCollage*`, polled every 15s). Client:
`components/stations/CollageStation.tsx` + `collageJobStorage`/`collageSplitStorage`/
`backgroundCollageJob` + `utils/collageApi`/`collagePhotoCompress`.

**Logos** (station `settings.logoUrl` / `settings.logoRightUrl`, both optional). The left logo
is drawn *behind* the template and shows through the template's yellow placeholder box
(`TEMPLATES[id].logo`), which is chromakey'd out. The right logo is drawn *on top* of the
composited foreground at the mirrored box (`width - logo.x - logo.w`) since no second yellow
region exists in the source MP4. Templates with `logo: null` (e.g. `gan-yehoshua`) draw neither.
Self-check: `npx tsx server/src/routes/collageFilter.check.ts`.

**Photo count.** The number of photos is the number of missions (or `multiSelectCount`). A built-in
video has six green-screen scenes baked into its MP4, so it used to need exactly six - fewer broke the
filter graph. `templateForPhotos(template, n)` now keeps the first `n` scenes and cuts the video one
second after the last one leaves (`TRIMMED_TAIL_SECONDS`), fading the music out over that second; six
photos give the exact same filter as before. More than six: the extras are not used.

**Custom video** (station `settings.template: 'custom'` + `settings.customVideo`). Shape: `{url,
width, height, duration, trimStart?, trimEnd?, freezes?: {atSec, holdSec}[], keyColor?, keySimilarity?,
slots[]}`; each slot `{startSec, endSec, x, y, w, h, layer?: 'front'|'behind'|'green', maskUrl?,
track?}` with the box as fractions of the frame.
- **Two clocks.** The source video can be up to 300s; `trimStart`/`trimEnd` cut it, and each freeze
  holds a source frame for 0.5-10s (up to 6 freezes, audio is silent while frozen). `timelinePieces`
  turns trim + freezes into play/freeze pieces; the final video (at most 90s) is those pieces back to
  back. **Slot times are on the final timeline** (`sourceAt` maps final time to a source frame).
  Slots stay in order of appearance, which is the photo order.
- **Which photo is in front.** Each slot sits on a timeline row (`track`, 0 = top); the top row is
  in front (`stackOrder`, back to front, the same in `collageSlots.ts` and `collageVideo.ts`). Slots
  without a `track` are packed into the first free row by start time (`slotLanes`).
- **Layers per photo.** `front`: on top of the video. `green`: behind the video, showing only where
  the video is the key colour (`keyColor`, default `#00ff00`; `keySimilarity` 0.05-0.6) - ffmpeg
  `chromakey`. `behind`: a black/white mask PNG (`maskUrl`) marks the parts of the frame that stand
  in front of the photo; the render puts the photo on, then the video again through that mask
  (`alphamerge`). A mask is a still, so it fits a frozen frame or a static camera. A `behind` slot
  without a mask simply shows on top.
- **Rendering** (`buildCustomFilterComplex` / `runCustomFfmpeg`): split the source into the
  pieces (`trim`; a freeze is a one-frame grab padded with `tpad`, its audio `anullsrc`), `concat`
  them (with audio only if the source has any - probed with ffmpeg first), then green photos +
  the keyed video, then masked photos, then front photos, each cropped to fill its box with a 0.25s
  fade; a title image overlays at the top; output 540 wide (960 landscape). More slots than photos
  reuse photos in order; fewer leave photos out, and the editor says which.
- **Getting it to the Lambda.** The participant's `POST /jobs` sends `stationId`; for
  `template: 'custom'` the server reads that station's `customVideo` itself (the station must be in
  the activity), sanitizes it (`sanitizeCustomCollageVideo`) and copies it onto the job; the Lambda
  downloads the video and any masks. Nothing a participant sends can choose the video. Limits and
  the timeline maths live twice (`server/src/utils/collageSlots.ts`, `client/src/utils/collageVideo.ts`)
  and `collageSlots.test.ts` fails if the limits drift.

---

## 13. Client architecture

### Routes (`App.tsx`)
- **Admin** (`/admin/*`, desktop): login, dashboard, activities new/`:id`/edit/view, games,
  missions, stations, portals config.
- **Manager** (`/manager`, `/manager/dashboard`, `/manager/present`, desktop).
- **Participant** (mobile, wrapped in `MobileContainer` max-width 480, `ParticipantActivityScope`
  + `HelpChatProvider`): `/play/:code`, `/play/:code/join/:inviteToken`, `/home`, `/story/:code`,
  `/mission/:code`. `ProtectedRoute` redirects unauthenticated participants back to `/play/:code`.
- **Public**: `/control/:id` (`pages/ControlPage`, desktop cashier console — hardcoded
  `register`/`123456` login in the component, then a phone field + "הכנס למערכת" that POSTs to
  `/api/activities/control/:id/register`), `/portal/:code`, `/privacy`, `/stats/:token`
  (shared stats), `/ar-demo`, and the **marketing site** — `/`, `/business`, `/academy`,
  `/tourism`, `/about` — all wrapped in `MarketingLayout` (§13a).
- **`/ar-demo`** (`pages/ArDemoPage.tsx`, standalone — no MobileContainer, no auth): GPS + camera
  + compass treasure hunt. Pickups are real lat/lng points drawn over the rear camera feed at
  their compass bearing, sized 1/distance, collected by tapping within 3m. Defaults to a
  room-scale course around the player's first fix; `?coins=lat,lng;lat,lng` pins a real path.
  Between GPS fixes it dead-reckons from `devicemotion` footfalls (0.7m stride) because GPS
  noise swamps a two-step walk. Geometry helpers live in `utils/geo.ts` (+ `geo.test.ts`).
- `FallbackRedirect` keeps unknown participant paths on their activity login (not the marketing page).

### Two layout worlds
Participant pages are **mobile-only** (`MobileContainer`, ≤480px). Admin/manager pages are
full-width desktop. **Don't reuse components across this boundary** without checking styling.
(The marketing site below is a third world again — neither of these shells.)

### 13a. Marketing site (`pages/marketing/`)

Five public pages sharing `MarketingLayout` (sticky `Nav`, routed `<Outlet/>`, `Footer`):

| route | page |
|---|---|
| `/` | `HomePage` - hero, sector chooser (`HomePage/SectorPicker.tsx`), logos, FAQ, testimonials, contact |
| `/business` | `BusinessPage` |
| `/academy` | `AcademyPage` — photo-tone hero, value + experience card rows |
| `/tourism` | `TourismPage` — stat strip, case study with per-stage video tabs |
| `/about` | `AboutPage` - the founder's story and the team beside his portrait (`about-eran.png`) with a name card, his "More of the Same" line pulled out as a quote. The old hero, how-it-works, boosters, toolbox, audiences, logos and contact form were cut on request, i18n keys included |

**Hardcoded, not CMS-driven.** Copy lives in sibling `.i18n.ts` files, *not* `SiteContent`. The
`/api/site-content` content endpoints still back the older `PublicityPage` shape and the admin
Publicity tab; of that router only `POST /leads` is used by the new site (`ContactForm`).

- `shared/tokens.ts` — palette, radii, shadows, gradients, breakpoints (`BP.mobile` 700,
  `BP.tablet` 960). Values are **sampled from the Figma frame exports**, not estimated.
- `shared/styled.ts` — `Page`, `Container` (optional `max`), `Band`, `H1`–`H3`, `Body`,
  `CardGrid` / `DividedRow` (both `minmax(min(px,100%),1fr)`, so a track wider than the
  container collapses instead of overflowing the page), `IconTile`, `CtaButton`, `Reveal` motion.
- `shared/` components: `Hero` (`plain` | `photo` tones), `FeatureSplit`, `SectionShape`,
  `MarketingEngine`, `IconCardRow`, `CustomerLogos` (optional `marquee`), `Testimonials`
  (optional `wash`), `StatStrip`, `ContactForm`, `Faq`, `Nav`, `Footer`, `Blob` / `SoftBlob`.
  Options worth knowing: `Hero` buttons are optional - Business, Tourism and Academy pass
  none, only Home keeps "הזמנת דמו". `CustomerLogos marquee` measures one set of logos and
  repeats it enough times to fill the viewport (`MARQUEE_CELL`, `MARQUEE_SPEED`).
  `ContactForm closing` = the form is the page's last section (no top padding, 112px below
  so `SHADOW.float` fades before the footer); every page uses `tone="purple"` and puts the
  FAQ before the form. `Testimonials` takes an optional `title`, and `dense` for longer
  quotes than the two-line pair on Home.
- `shared/MarketingEngine.tsx` ("מנוע שיווקי עסקי", Business + Tourism) takes
  `clipUrl`/`clipPosterUrl`: a tilted phone in the booster grid, right of the "Yooz Auto
  Clip" disc under RTL (`PhoneSlot`, row 2 col 1), playing the keepsake video on tap, with
  sound. That clip is `case-step-3.mp4` (the web copy of `temp-imgs/סרטון מזכרת.mp4`, 93MB
  raw), poster `keepsake-poster.jpg`; the third booster is titled "Yooz Auto Clip". The main
  park clip stays centred above, autoplaying muted and looping, with native `controls` so it
  can be paused or unmuted. Its `Reveal` wrapper is positioned (`VideoReveal`, z-index 2):
  the lift transform makes `Reveal` a stacking context, so without it the cream hexagon
  painted over the video until the animation finished, then the video popped forward.
  The infinity mark is inlined SVG, not the `engine-infinity.svg` file (kept as the export):
  the ribbon carries one short gap (`stroke-dasharray 0.78 0.22` on `pathLength="1"`) and the
  gap travels the loop continuously, 6s a lap, linear - so nothing restarts from a fixed
  point. Reduced motion drops the dash so the loop reads whole. Figma's filter regions were
  too tight and chopped the drop shadow flat at the bottom; they are widened here.
- `shared/useStopWhenUnseen.ts` - any clip that plays with sound pauses on tab-hide, on
  scroll-out and on unmount once the element has left the page, because a detached element
  can keep playing audio over the next route. The unmount pause is deferred a tick and
  guarded by `isConnected`: StrictMode runs the cleanup between two mounts, so pausing
  straight away kills the park clip's autoplay in dev, and clearing `src` there leaves every
  video blank (React does not re-set an unchanged `src`).
- Academy has its own `AcademyPage/FeaturedTestimonial.tsx` (one named quote + signature)
  instead of the shared `Testimonials` pair, which runs on Home and on Tourism, where it
  carries two named client quotes under the title "לקוחות ממליצים". Business dropped it.
- `shared/routes.ts` - `MARKETING_ROUTES` is the single source for both the nav and the footer,
  and its array order is display order (first = rightmost under RTL): ראשי, המגזר העסקי,
  תיירות, אקדמיה, אודות. "ראשי" (`home`, `/`) was added on request - the comps had none - and
  renders with `end` so it is not active on every page. `SECTOR_ROUTES` (footer "תחומים")
  drops `home` and `about`. On a phone (`BP.mobile`) Home and About render as icons
  (`NAV_ICONS` in `Nav.tsx`: house, and the plain "i" in a circle for About - a team mark, a
  business card and a speech bubble were all tried and dropped in its favour) in a fixed 50px
  slot, so the three sector names get the freed width; the label stays in the DOM visually
  hidden, which is the link's accessible name.
- **Sector chooser** (`HomePage/SectorPicker.tsx`): three photo tiles under "באיזה מגזר תרצו
  לשמוע פירוט על הפתרונות?", each a plain `Link` into `/business`, `/tourism`, `/academy` (the
  nav's order). Deliberately a teaser, not a rundown - the brief was that a home page carrying
  each sector's full story gave visitors no reason to click through. It replaced the original
  Engage/Grow/Share Venn and the three stacked `FeatureSplit` sector bands, which were removed
  (`FeatureSplit` is now unused except for its exported `ArrowGlyph`). Hover widens the tile
  (`flex` 1.7, only under `(hover: hover) and (min-width: 701px)`) and dims its siblings via a
  rule on the row; phones stack the tiles full width. Labels come from `Nav.i18n`; the heading
  and taglines from `SectorPicker.i18n`.

**RTL is the default, and the main hazard here.** The first flex child lands *rightmost*;
`inset-inline-start` measures from the right; SVG paths and CSS gradients carry no logical
direction and must be mirrored by hand under `[dir="ltr"]`. Note that `[dir="ltr"] &` has
specificity (0,1,1) and outranks a `BP.mobile` block (0,1,0) — media queries add none — so any
mobile override of an LTR rule must nest *inside* it. English also needs its own type scale:
Hebrew sets far more compactly, and a heading tuned for it runs ~40% oversized in English.

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
Add new UI strings there — both languages. A folder-level file shared by its components
(`MissionPage.i18n.ts`, `AdminCreateActivityPage.i18n.ts`) counts as the sibling.

Interpolated strings are **functions** in the `.i18n.ts` (`attempt: (n) => \`ניסיון ${n}\``),
never a template literal assembled in the component. Code that formats text **outside** a
component (`formatDuration`, `ganeiYehoshuaShareText`) takes `lang` and calls
**`translate(texts, lang)`** — the non-hook twin of `useTranslations`, same merge and cache.
A prop that used to carry a Hebrew default value now defaults to `undefined` and the component
falls back to `t.<key>` (`MissionTrashSort`, `MissionPuzzle`).

Deliberately **not** in `.i18n.ts` files, and excluded from the rule: Hebrew inside English
comments; test fixtures; Hebrew-language *logic* (`avatar/speech.ts` gendered→plural map,
`HelpChat/matcher.ts` intent keywords, Hebrew-suffix regexes in `manage/duration.ts`); the
`LANGS` labels; and admin-authored **content** defaults — `fillTestData()` in
`AdminStationConfigPage`/`AdminGameConfigPage` and `DEFAULT_PUZZLE`/`DEFAULT_TRASH` in
`AdminMissionConfigPage`, which seed per-activity data rather than app chrome.

### Admin dashboard (`pages/admin/AdminDashboardPage`)
Fetches activities/games/stations/folders in parallel on mount, passes as props to tabs; tabs
call `onRefresh` after mutations. Tabs by role: **activities** (all), **statistics**
(admin/super_admin/**customer**), **stations** (stations+games+missions), **library**,
**portals** (all); **publicity** (admin/super_admin), **users**+**tutorials** (super_admin).

Shell is a sidebar layout, not a tab bar: `Sidebar` (nav grouped MENU/OTHERS, one inline-SVG
icon per tab key in `NAV_ICONS`, logout in the footer) + sticky `Topbar` (section title).
The sidebar is `position: fixed` at every size and `MainCol` reserves its width with
`marginInlineStart` (RTL: the right edge); under 900px it becomes an off-canvas drawer driven
by `mobileMenuOpen` and that margin drops to 0. **`PageBg` uses `overflow-x: clip`, never
`hidden`** — `hidden` forces `overflow-y` to `auto`, which makes it a scroll container and
silently kills `position: sticky` for every descendant (verified in Chrome: the sticky child
scrolls away under `hidden`, stays pinned under `clip`).
`DashContent` extends `AdminContent`, which carries the admin-only `h2`/`h3` scale.
Tab look-and-feel comes from the shared primitives (`components/styled.ts` `Table`,
`AdminCard`, `SegmentedControl`, `MobileCardItem`, …) — restyle there, not per tab.

The topbar holds only the section title — language, account and logout live in the
**settings** tab (`AdminSettingsTab`, visible to every role, `group: 'other'`); logout is also
still in the sidebar footer. Tab bodies are wrapped in `TabFade`, keyed by tab + stations
section, which replays the `yoozTabIn` keyframe (in `App.css`, alongside the custom
scrollbars and the `prefers-reduced-motion` clamp) on every switch.

The **stations** tab has no in-content section/type bars; both levels are sidebar sub-nav
(`SubNav`/`SubNavItem`), auto-expanded for the active branch — no collapse state. The
dashboard owns `stationsSection`, `stationTypeFilter` and `gameTypeFilter`, and passes the
last two down as the controlled `typeFilter` / `gameType` props; `AdminStationsTab` and
`AdminGamesTab` no longer hold that state. Station types are derived from the loaded
stations (same `Set` + `sort` both sides) and labelled via `stationTypeLabel(t, type)`
exported from `AdminStationsTab`; game types come from the exported `GAME_SUBTABS`.

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
- **Day-scoping** uses `israelTime.ts` (`startOfIsraelDay`, `startOfTodayIsrael`,
  `israelDayString`, `israelDayRange`) — reuse for any "today in Israel" logic. Midnight is
  resolved in two offset passes, not by subtracting elapsed wall-clock time, so the two DST
  days land correctly (`israelTime.test.ts` covers them).
- **OG crawler short-circuit** in `index.ts` before the SPA fallback — don't move it.
- Reports have **no timestamps** — use `joinedAt` as the creation/"today" field.
- Going **live wipes dynamic data** (reports/scores/session state) via `wipeActivityData`
  (`services/activityReset.ts`); deleting an activity cascade-deletes its reports. The
  `dailyReset` sweep is **not** this — it calls `rollOverActivityDay` and keeps every report.

---

## 15. Feature status / notes

- **Groups are day-scoped** (§8) — recent change; QA §33. Invite links from a previous day
  return **410**.
- **Customers can view reports** (Statistics tab) scoped to their own/managed activities (§7);
  audit log stays admin-only.
- **Video stations gate Continue** until the video ends (§10); iframes exempt. A bottom-left "skip the video" button (`SkipVideoButton`, PlayingPhase) bypasses the gate. `settings.mustWatchToEnd: false` (admin toggle "חובה לצפות בסרטון עד הסוף כדי להמשיך", default on) drops the gate, and `settings.continueButtonText` replaces "המשך" on the green button - both translated with the rest of the station's prose. The locked label stays the translated "watch to the end" string.
- **Per-item re-entry** (§11) — completed roadmap items flagged `revisitable` stay open and are
  tinted brighter than locked-behind ones; revisits never re-score.
- Collage encode is the main scaling pressure point (Lambda + load shedding + boot recovery).
- AI features (help/report/avatar chat, answer check) use Gemini; TTS uses Azure; SMS uses TextMe
  (stub when creds absent).

---

## 16. Map modules (`module.type === 'map'`)

A **team** walks to real places. Same shape as `spiders` (a module type, not a new model): the
roadmap is swapped for a map, the advance logic changes, everything else — games, stations,
popups, hints, `PlayingPhase` — is untouched and works inside a map activity for free.
A **solo** (single-login) map works too: the phone still tracks GPS and walks the stations in
order, but progress is the ordinary story session — none of the team calls below are made.

**Config.** Per item: `location {lat,lng,address?}` — on the *module item*, never on the Station,
because a Station is a reusable template that can appear in several activities at different
addresses. Per module: `proximityMeters` (default 10) and `groupOrders` (group name → permutation
of item indices, so each team walks its own order). Per-group order needs **preset** groups —
self-service teams don't exist until the day, so they all walk the stored order. Admin UI:
each item's settings dialog (`ItemSettingsModal` → `LocationSection`: address geocode **and** a
click-to-drop map picker with a draggable pin, for spots no address describes — a gate, a
courtyard, a tree) and `GroupOrderEditor.tsx` (hand-rolled DnD + tap-to-swap, no library).
Saving goes through `routes/admin.ts::buildActivityData`, which keeps these three fields for map
modules only and sanitises them in `utils/moduleItems.ts` — `sanitizeLocation` drops missing,
non-finite or out-of-range coordinates, `sanitizeProximityMeters` clamps to 5-200,
`sanitizeGroupOrders` keeps distinct in-range indices. The admin read returns `location` too,
so a reopened activity keeps its pins (it used to drop all three on every save).

**Shared group progress.** `MapGroupState` (`map_group_states`), day-scoped and unique on
`{activityId, activityDay, groupName}`. Whoever reaches a station first completes it **for the
whole team**; teammates pick the new target up on their next poll. `completedIndices` is the only
progress state — the current target is *derived* (`nextIncompleteIndex`), never stored, so two
simultaneous completions can't race a counter. `POST /map/complete` filters on
`completedIndices: {$ne: itemIndex}`, so a second caller scores nothing (a repeat is a 200 no-op);
it refuses any station but the team's current one (409 `not_current_station`) and a non-finite
score (400). The points themselves are client-reported, as in `/scores`. Per-participant
`Report`s are untouched: analytics, exports and the individual leaderboard keep working as before.
Progress is keyed by day on purpose — tomorrow's run starts clean, as self-service teams do.
Going live (`services/activityReset.ts::wipeActivityData`) deletes the activity's
`MapGroupState`s along with its reports, so test walks don't carry into the real day; deleting
the activity (`DELETE /api/admin/activities/:id`) removes them too.

**One marker per team.** A group broadcasts one position — the first member to post claims the
carrier slot, with a 2-minute staleness takeover so a dropped phone doesn't freeze the marker.
Teammates never see each other; every *other* group is visible, always, along with the full group
leaderboard (map activities override the own-group-only rule of §11, via `showAllGroups`).
A rival marker is labelled with the team's number (else the first letters of its name's last
word) in a per-team colour — `StoryModulePage/teamMarker.ts` — so "קבוצה 2" and "קבוצה 3" read
apart. A team with no record yet has no position to draw anyway, so nothing is missing.

**Arrival is the part that needs care.** Phone GPS reads 5-15m off, so a raw
`distance <= radius` leaves people standing at the sign with nothing happening.
`utils/geo.ts::hasArrived` subtracts the fix's own `coords.accuracy` (capped at 25m so one wide
fix isn't "at" every station), ignores fixes worse than 50m, and applies 2.5× exit hysteresis so
a jittering fix doesn't flip a station open and shut. Arrival belongs to one station: when the
target changes the hysteresis starts over, so the next station 30m on doesn't open early. The UI
shows live distance **and** accuracy — a participant who can see the number walks the last few
metres themselves. Stations chain (`utils/mapChain.ts`, tested): a station with no location, or one within
`SAME_PLACE_M` (15m) of the last place set before it, opens straight after the previous station
(`opensRightAfter` - `advanceToNextItem` runs the station's `beforeItem` popups and then swaps
straight to the next station without passing the map, unless the manager lock covers it;
`PlayingPhase` is keyed by item index so the new station mounts fresh) and has no pin of its own; only the first
station of a place is walked to. Once every station of a place is done (`placeGroupEnd`), its pin reads
the range ("1-3", a pill as tall as the next-station circle) with a "3 תחנות" label under it; the next
station always shows only its own number. While the next station is a later station of a place (back on the map
mid-place after a reload, or behind the manager lock), that place's done first station gets no pin of its own
(`laterAtSamePlace`), so the two names never stack. A station with no location uses that place (`placeOf`). A station without a
location inherits the last location **before** it, never after, and the item list tags it in
blue "מיקום של תחנה N". So the first station must have one: the admin blocks moving on and
saving while it has none (`mapUnplacedStart`), and tags every station with nothing to inherit
in red "אין מיקום". A station with a location opens **only** on arrival: the "I'm here" override appears solely when
the participant is within `proximityMeters + 50` and GPS has not confirmed arrival for 30s (a
steady reading off beside a building). It used to also appear beyond 40m and whenever location
was blocked, which let anyone open a station from anywhere - removed 2026-09-28. Blocked
location now just shows the warning. When Google Maps fails to load, the fallback panel still
runs the same GPS walk (`walkPanel`), since GPS does not need the map. The server does not
check position on `/map/complete`; the rule is client-side. Once the team has progress the walk counts as
started — nobody presses Start twice. Covered by `geo.test.ts`.

**Client.** `MapView.tsx` (sibling of `RoadmapView`/`SpidersView`), `hooks/useMapRun.ts` (GPS
watch + 10s poll + position push), `utils/googleMaps.ts` (script-tag loader, no npm wrapper —
the JS API already ships map, geocoder and walking directions). Needs `VITE_GOOGLE_MAPS_KEY` (§2);
without it — or when Google rejects it for the page's domain (`window.gm_authFailure`,
`onMapsAuthFailure`) — the map degrades to a panel with the station, its address and an open
button. A failed or empty walking route is ignored; the pins still show the way. A team's header shows its
shared `MapGroupState.score` - the number the leaderboard ranks teams by - and a solo player's
their own points. The walk is Google-Maps-like, per station: an **overview** (route from
you to the station, framed with your dot and the station, "8 min walk · 560 m", "יוצאים לדרך"),
then **navigation** (the camera flies in - a smooth `panTo`, then one zoom level at a time via
`flyTo`, since a raster map only animates single-level zooms and a jump to 18 snapped - to zoom 18, the camera follows you until you drag - then "חזרה אליי" brings it
back; your dot becomes an arrow pointing where the phone faces, like Google Maps - the compass
(`hooks/useCompassHeading.ts`, `utils/compass.ts`: iOS `webkitCompassHeading`, Android
`deviceorientationabsolute` as `360 - alpha`, plus the screen angle; a relative
`deviceorientation` has no north and is ignored, except in dev builds, where it is trusted so
DevTools' Sensors > Orientation can drive it - once a real absolute reading arrives, relative
ones are ignored again), whose iOS permission is
requested by the "יוצאים לדרך" tap itself since iOS only asks from a user gesture; without a
compass it falls back to GPS `heading`, then the bearing between fixes 4m apart; a top
bar shows the next turn from the Directions steps, "בעוד 80 מ׳" + instruction; the sheet shows
distance and time left and "עצירת ניווט"), then **arrival**: the sheet keeps its size (growing it to half the screen was tried and left
dead space) and its content fades in from below one piece after another (`Rise` with staggered delays): a green "הגעתם!" chip,
the name, "תחנה 1 מתוך 5 · משחק", centred, and a big "התחילו את התחנה" at the bottom. The
description and address were tried there and dropped as noise. With
`module.openAnywhere` (admin, first step under "עיצוב מפה" together with the opening distance and
"הצג את שם התחנה מתחת לכל תחנה במפה": "פתיחת תחנה" - "רק בקרבת התחנה" / "מכל מקום") the sheet also offers "פתחו את התחנה עכשיו" in overview and navigation, and the
"I'm here" override is not needed; arriving still shows the station card. The step maths
is pure and tested (`utils/walkNavigation.ts`). The map screen carries the regular session header (exit, help, points or timer, leaderboard -
the same `ActivitySessionHeader` as the roadmap and spiders views, built inside `MapView` from its
header props, icons in the theme's `getHeaderIconColor`), floating over the full-screen map on a
progressive blur that fades out downward (`FADE_LAYERS`: three
`backdrop-filter` layers of rising strength, each masked over a shorter band, plus a faint tint -
a single masked blur left a visible line; the header's own `backdrop-filter`, which stops
hard at its 56px edge, is switched off here too; the blur layers bleed 48px past the top and
side edges, because `backdrop-filter` mirrors content at its own edges and the mirror showed as
duplicated roads along the top of the screen); the turn banner sits 16px below it (measured with a `ResizeObserver`) and above the blur
layers in z-order, or the fade washes over it. If Google Maps fails to load, the screen takes the
theme's background (`getThemeKit`/`roadmapImage`) so the header stays readable.
The screen is styled after Google Maps navigation: a dark-green
turn banner with a big arrow (one SVG, `DirectionArrow`, in four directions only - every Google manoeuvre
maps to up, left, right or down for a U-turn via `maneuverDirection`; the glyph set with a
roundabout symbol read as noise) and a "ואז" tab under it for a turn within 150m of the next one
(`NextTurn.thenManeuver`; the banner squares its corner above the tab so the two join with no gap), a round
compass button whose needle tracks north and snaps the map north-up on tap, a round blue "חזרה אליי" button
under it (shown only when not following), both kept 16px above the bottom sheet by measuring the
sheet with a `ResizeObserver` (it grows when "הגעתי לתחנה" appears), and a bottom sheet with big minutes, "distance · arrival clock", a red "יציאה"
and a blue "יוצאים לדרך". SVGs for the needle and locate arrow live in `MapView.icons.tsx`. While navigating, the map turns heading-up: the canvas
is always drawn as a `150vmax` square (so no corner shows while it turns; it keeps that size in
overview too, because resizing it on "יוצאים לדרך" made the view jump sideways and back, and
`overviewPadding()` adds the hidden margins, the header and the sheet to `fitBounds`) and rotated by CSS against the compass
heading (unwrapped through `angleDelta`, 0.3s ease), so your arrow always points up. The map
stays rotated while you move it: during navigation a transparent `Gestures` layer takes the
pointer events instead of Google (which does not know the canvas is rotated and would pan the
wrong way), rotates each drag delta into the canvas frame (`screenToMapDelta`) and calls
`panBy`; two-finger pinch and the mouse wheel zoom one level at a time (`PINCH_STEP_RATIO`).
A two-finger twist rotates the map by hand (after a 10° dead zone,
`TWIST_START_DEG`, so a pinch does not rotate by accident) and hands rotation over from the
compass to the user (`compassSteering`), like Google Maps. Dragging stops following your
position; "חזרה אליי" re-centres and gives rotation back to the compass. Google's own rotation needs a
vector map with a `mapId`, which would switch off the JSON map styles - hence CSS. Station and team pins stay upright: on the participant map
they are not Google markers but HTML pins (`attachUprightPin` in `utils/mapPins.ts`, an
`OverlayView` in `markerLayer` - in `overlayLayer` the route drew over them - same sizes and
colours via `stationPinStyle`) counter-rotated by
the same angle and ease as the canvas, with an optional name label under the circle
(`module.showStationNames`; participant map only - the admin preview keeps plain markers); on arrival the next station's pin grows 1.2x
(`stationPinStyle(..., arrived)`), moves to `floatPane` above your arrow (you are standing on it,
so the arrow and its white disc would hide it) and slowly grows and shrinks (`setBreathing`, a
Web Animation; a bounce was tried and rejected). The admin preview does
not rotate and keeps Google markers. Trade-offs: street labels rotate with the map, and the oversized canvas pushes the Google logo and credit
off screen during navigation (team decision, 2026-09-28). Directions is billed per call,
so a route is fetched once per station and again only when navigating >35m off it (at most every
15s) or, in overview, after moving 150m. Instructions come in the participant's language
(`&language=` on the Maps script). Map texts live in `MapView.i18n.ts`. `advanceToNextItem` shows the station's `afterItem` popups before
returning to the map (then `endOfActivity` when the walk is done).

**Cipher.** `module.cipherEnabled` (admin, step 1 under "עיצוב מפה": "צופן - כל תחנה יכולה לחשוף
תו כשמסיימים אותה") turns on a per-station `cipherChar` - one or two characters (a digit, letter or
emoji), edited in the station's settings right under its location ("תו בצופן"; the field only shows
while the cipher is on, and the station row gets a purple "צופן: 7" tag). The server trims it and
drops anything longer (`sanitizeCipherChar`), and serves `cipherChar` and `cipherEnabled` only when
the switch is on, so turning it off keeps the characters for later. On the map the cipher is
always on screen, in the floating header under the session buttons (`CipherStrip.tsx`, on the
same fading blur): dark characters on white rounded tiles (hidden ones are translucent white with a white "?"), one per station with a character, in
station order; a slot fills when its station is in `completedIndices` (a team shares its run, so a
teammate's station fills it too). A small white caption above the tiles reads "הצופן", and "פיצחתם את הצופן!" once every tile is full.
A lock icon beside it and a frosted bar around the tiles (label on the side) were tried and dropped. A modal behind a lock button was tried first and rejected - the
code has to be visible all the time. Stations revealed since the strip last showed (seen indices in
`localStorage`, `yooz_cipher_seen_<code>`, `hooks/useCipherSeen.ts`) spin in like a slot-machine
reel through characters of the same kind (`reelStrip`: digits, Hebrew, Latin or a mix;
deterministic, so no `Math.random` in render) and land with a pop, one after another,
when you come back to the map; they are marked seen once they land. The spin runs through the Web
Animations API with plain pixel values (an earlier CSS version ended at a `var()` inside
`@keyframes`), and it only starts after 0.7s of the page actually being visible and drawing
(`afterSteadyFrames` caps each frame's share at 100ms): on a slower Android phone the map's first
second blocks the main thread, and a spin started then was over before anything was drawn. Seen is
written when the animations finish, not on a timer, and hiding the page mid-spin replays it on
return. The turn banner sits below
the strip, since it measures the whole top block. The row reads
right to left only when a character is Hebrew or Arabic (`cipherDirection`), so a number code keeps
its order. The characters reach the browser with the module, so the cipher is a game element, not a
secret. The maths is in `utils/cipher.ts` and tested.

**Look.** `module.mapDesign = {style, hidden[]}`, set in the activity wizard's step 1 under the
theme row ("עיצוב מפה", `AdminCreateActivityPage/MapDesignSection.tsx`, with a live preview map).
`style` is one of ten looks, in picker order (`standard`, `light`, `dark`, `night`, `satellite`,
then `vintage`, `wildWest`, `treasure`, `playful`, `blueprint` - two rows of five; the array order
is the display order); `hidden` lists Google place categories to hide (`business`,
`park`, `attraction`, `worship`, `school`, `medical`, `government`, `sports`, `bus`,
`railAndAir` (train stations and airports, one checkbox), `streetNames`, `placeNames` - twelve,
shown as three rows of four). When every place in a group is hidden (all eight `poi`
keys, or bus + railAndAir) the group's leftover labels go too (`PLACE_GROUPS`), since
Google has places no category names and "hide all" must leave nothing behind. The preview and
the participant map drop the zoom buttons and keyboard-shortcuts link. The participant map keeps
the Google logo, terms and data credit, which Google's terms require; the admin preview hides
them with CSS (`PreviewCanvas`) by the team's choice, accepting that risk for an internal
screen only. Do not copy that CSS to the participant map. Both lists live twice - `server/src/utils/mapDesign.ts` (the Mongoose
enums and `sanitizeMapDesign`) and `client/src/utils/mapDesign.ts` (the Google style rules) - and
`mapDesign.test.ts` fails if they drift. The untouched default (`standard`, nothing hidden) is
never stored, so an activity without the field looks exactly as map activities always did.
The looks are Google's classic JSON `styles` (recolouring roads, water, parks, labels) plus, for
`vintage`/`wildWest`/`treasure`, a parchment texture (`public/images/map/paper-grain.svg`). The texture lives **inside** the Google map, in the `mapPane` above the tiles
and below the pins and route (`utils/mapLookLayer.ts::attachMapLookLayer`, an `OverlayView` that
re-covers the viewport on every `bounds_changed`), so it tints the streets but never the
stations. The blend mode is set on the pane itself, not the texture div: panes are stacking
contexts, so a blended child would only blend with the empty pane. A CSS layer over the whole
map element would tint the pins too, which is why `MapLookOverlay` is used only for the small
style swatches, which are not maps. `wildWest` is a grey map under a brown multiply wash (sepia, like an old photo), and
`blueprint` gets a white drafting grid instead of paper (`grid` overlay, normal blending). Each look has its own bold pin colours (`MapLook.pins: {next, done}`), picked to stand out on
that look's background. The "you" marker takes the look's route colour, like Google's blue dot on
a blue route, and is created with `optimized: false`: an optimised legacy marker is drawn on a
canvas below the texture pane and came out tinted. While navigating, the arrow sits on a 75% white disc
(`meHaloIcon`, a second marker) and is anchored at its centre (`ARROW_CENTER_Y`), not its tip,
so it turns in place. Markers are built in `utils/mapPins.ts`, shared by the participant map
and the admin preview: the next station is a bigger numbered circle (`nextStationMarker`; on the participant map
it grows and shrinks on arrival) with soft waves rippling out from it (`attachPulse`: two staggered rings, one every ~1.8s (three
every 0.8s was too busy),
each a radial-gradient band with faded edges rather than a hard border, in an `OverlayView` div
in `overlayLayer` under the markers, animated with the Web Animations API and held still under
`prefers-reduced-motion`); finished stations are smaller
numbered circles (`doneStationMarker`); future stations are not drawn. A teardrop location pin
with a static halo was tried for "next" and rejected as unclear. Pin numbers switch to dark text
on light pins (`textColorOn`). A station can show an uploaded image instead of its number:
`module.items[].mapIcon`, an image URL (map modules only, on the item, not the Station, for the
same reason as `location`), uploaded in the item's settings dialog (`MapIconSection`,
`FileUploadButton`, SVG/PNG/WebP/JPEG). The circle keeps its colour and the image is a second
marker centred on it (`stationMarkers` returns `[circle, image]`).
`sanitizeMapIcon` keeps only http(s) links - no `data:` or `javascript:`. Like every item field,
`mapIcon` is copied by hand in `admin.ts` (save and edit-load) and in all three item branches of
`GET /:code/module`. The preview keys its pins on icons but its route on coordinates only, so
changing an icon never refetches the billed route. Stacking order is `PIN_LAYERS`: next > done > you - your arrow passes under station pins and their labels, so standing on a station never hides it. The route line colour also changes per look. Looks with a `routeOutline` (vintage, Wild West, treasure,
blueprint) draw the route dashed, each dash on a wider dash in the outline colour; the rest draw
it solid. The outline is there because on textured, same-toned maps a colour alone disappears
into the roads. Each look keeps its own route colour (tried all-blue, rejected); the line is 8px thick. A dotted Google-style route was tried and rejected by the owner.
The admin preview draws the walking route through the stations in module order (one
`DirectionsService` call with the middle stations as waypoints, falling back to straight lines if
Google finds no route or there are more than 25 waypoints). Directions is billed per call, so the
route is refetched only when the stations' coordinates change (`pointsKey`), never on a style
click - a style change just repaints the same route. Two limits come from Google:
restaurants, cafes, shops and hotels are one category (`poi.business`) so they hide together, and
JSON styles are ignored once a map has a `mapId` (cloud styling) - adding one to the map would
silently switch every look off. A hidden park keeps its green area; only its label and icon go.
Google ignores a misspelt feature or element type without an error, so the client test checks
every rule against Google's documented names. Without `VITE_GOOGLE_MAPS_KEY` (local dev) the
admin preview shows a notice instead of a map; keyless Google Maps renders unstyled tiles, so the
looks can only be seen with a real key.
---

## 17. YOOZ Manage - internal business system (`/manage`)

A separate internal ops app for the studio team (CRM, projects, tasks, time tracking,
profitability, capacity). It has nothing to do with the gamification product except that it
lives in the same repo, process and database. Built from the `yooz-manage-spec/` folder (kept
outside the repo); "spec ch.NN" comments in the code point into it.

- **Realm**: own JWT (12h, carries `realm:'manage'`), own context (`ManageAuthContext`,
  `yz_manage_token`), own fetch wrapper (`manageApi.ts`). Roles `owner` > `pm` > `member`.
  **No Manage login**: credentials live only in `users`. An **employee** is a `User` with
  `manageUserId` (always `super_admin` in the admin panel); `mng_users` holds just the employee
  profile (Manage role, cost, capacity, colour) that every `mng_*` record points at. Employees
  are created/deleted in the admin Users tab (`role:'employee'` + `manageRole` →
  `createEmployeeProfile`); deleting the user deactivates the profile, editing email/name syncs it.
  `migrateManageLoginsToUsers()` (boot, idempotent) moved the old `mng_users.passwordHash` into
  `users` — same bcrypt hash, so passwords carried over; a matching email (e.g. admin@yooz.com) is
  linked and raised to `super_admin` (logged), keeping its admin password. Inactive profiles get no login.
  Dry run: `npx tsx server/src/scripts/check-employee-links.ts` (read-only).
- **Collections** (all `mng_*`, models in `server/src/models/manage/`): `ManageUser`,
  `ManageClient` (+ embedded contacts), `ManageInteraction`, `ManageProject` (stages, payment
  milestones, contract, recurring fee, stored `health`), `ManageTask` (checklist, comments,
  watchers, `visibleToAll`), `ManageTimeEntry` (timer or manual, `costRateSnapshot`,
  `afterProjectClose`, `locked`, `autoStopped`), `ManageTravelEntry` (`mng_travel_entries`:
  per-day travel allowance in ₪, `userId`/`date`/`amount`/`note`), `ManageExpense`, `ManageChangeRequest`,
  `ManageSettings` (singleton: stage template, time categories, alert thresholds, defaults).
- **Routers** (`routes/manage*.ts`, all under `/api/manage`): `clients`, `projects`, `time`,
  `tasks`, `dashboard`, `calendar`, `finance`, `reports`, `employees`, `settings`.
  `time/projects` lists every non-archived project (`_id`, `name`) for the hour/timer pickers, so
  members can log against projects they aren't assigned to (`/projects` stays visibility-scoped).
  `time/travel` (GET/POST, PATCH/DELETE `/:id`) is the travel allowance: anyone logs their own;
  only the owner reads others'. `time/month/:month` adds `days[].travel` + `totalTravel`, and
  employees carry `monthTravel`.
  Owner-only whole routers: **finance, reports, employees, settings**. Clients/projects: edit
  is owner+pm, delete is owner. `time/lock` is owner. Report `profitability_by_client` is owner.
- **Money never leaves the server for non-owners**: `serializeManageUser` and
  `serializers/manageProject.ts` strip `hourlyCost`, `employerCostFactor`, prices, contract and
  milestones for pm/member. Cost per hour goes through `effectiveHourlyCost()` only (the employer
  overhead factor is stored but currently not applied there).
- **Computed, not stored**: actual hours are always summed from `TimeEntry`; alerts
  (`services/manageAlerts.ts`) are a query run on dashboard load, not rows. Money math lives in
  `services/manageMoney.ts` (self-check `manageMoney.check.ts`), metrics in `manageMetrics.ts`.
  Every profitability view carries "not including management hours" because the owner does not
  log time.
- **Background**: `startManageScheduler()` auto-stops timers older than `MAX_TIMER_HOURS` (10h)
  every 15 min and flags them `autoStopped`. `seedInternalProject()` keeps one shared internal
  project (`INTERNAL_PROJECT_NAME = 'פנימי'`) so non-client hours have a home.
  `dropManageProjectCodeIndex()` removes a legacy unique `code_1` index at boot.
- **Client**: `pages/manage/*` under `ManageLayout` + `ManageTimerProvider`; menu in
  `pages/manage/nav.ts` (`ownerOnly` there is cosmetic, the server gate is real). Desktop only.
  The admin dashboard sidebar links to it ("לקוחות", admin/super_admin only). `ManageProtectedRoute`
  (`App.tsx`) calls `POST /api/manage/auth/from-admin` (admin JWT) whenever there is no Manage
  session for the current admin email (also after a 401), which returns a session for the admin's
  linked `manageUserId`. No admin session → `/admin/login`; not an employee (404) → `/admin/dashboard`.
  The Employees page edits profiles only; adding people and passwords are in admin → Users.

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
- `GET /register-phone?phone=&code=&date=` — public (no JWT) and not group-mode-gated: a till/POS
  integration, guarded by the fixed shared secret `REGISTER_PHONE_KEY` sent as an `X-Api-Key`
  header or a `?key=` param (`crypto.timingSafeEqual`). Unset secret → `503
  register_key_not_configured` (fail closed); wrong/missing → `401 unauthorized`. `phone` required (≥6 digits after normalizing, else
  `400 invalid_phone`). `code` optional: given → that activity, 404 unless it has
  `userControl:true`; empty → `activityCode:null`, i.e. every user-control activity. `date`
  optional **`DD-MM-YYYY`** (`israelDayFromDdMmYyyy`, else `400 invalid_date`); empty → today in
  Israel. Upserts a `PhoneRegistration`, returns `{ok, phone, activityCode, date}` (date back in
  DD-MM-YYYY; the stored `activityDay` stays internal YYYY-MM-DD).
- `POST /control/:id/register` — cashier console endpoint, keyed on activity `_id`, 404 unless
  that activity has `userControl:true`. Registers `body.phone` for that activity's code, today.
  Unauthenticated by design for now (the console's credentials live on the client).
- `POST /:code/groups` — create group + log in creator. Validates name + login fields + portal
  membership; when `userControl` is on, requires a `PhoneRegistration` matching the creator's
  phone + today's Israel day + (this activity's code OR `null`), else `403
  {error:'not_registered'}`; creates `ActivityGroup` (stamps `activityDay`), 409 on duplicate-name-today;
  `createParticipantSession`; returns `{token, participant, group:{name,inviteToken,inviteUrl},
  groupStatus?}`. `inviteUrl = <origin>/play/:code/join/:inviteToken`.

### `routes/games.ts`, `routes/stations.ts`, `routes/missions.ts`
Standard admin CRUD (B0). Endpoints: `GET /` (list, customer-scoped, newest first),
`POST /` (create), `GET/PUT/DELETE /:id`, `PATCH /:id/folder`. Stations & missions also
have `POST /:id/duplicate` (games do **not**). Station create/update whitelists `type` to the
11 `StationType`s (defaults to `text`). Game `type` defaults to `generic`. All under
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
  `normalizeScore`). Day-scoped by default (`leaderboardCurrentDayOnly`, `startOfTodayIsrael`;
  `dailyReset` forces it). Top 50, or top 500 for group activities.
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

### `routes/adminMedia.ts` — Cloudinary media library (`/api/admin/media`)
`authenticateAdmin` + `requireRole('admin','super_admin')` on the whole router. Folders are
**Cloudinary's own**, not a Mongo mirror — see `utils/mediaFolders.ts` for why that is safe.
- `GET /` — `?folder=&type=image|video&q=&offset=`. Loads one folder via
  **`api.resources_by_asset_folder`** (500/page, cursor loop) into a per-folder 60s cache, then
  filters/paginates in memory (`PAGE_SIZE` 60) → `{folder, items, nextOffset, total}`.
  **Not `cloudinary.search`**: that reads a search index which lags several seconds behind a
  move or delete, it cannot express "not in these folders" (`-folder:x` is accepted and then
  silently ignored), and it has **no substring match** (`filename:*x*` is a 400). Doing it this
  way also keeps user input out of the expression entirely.
- `GET /folders` — the tree under `yooz/`, 3 levels, machine folders removed (1 API call per
  folder).
- `POST /folders {parent,name}` / `DELETE /folders?folder=` — create / delete. Cloudinary
  refuses to delete a non-empty folder → 409 `folder_not_empty`; no recursive wipe exists.
- `PATCH /move {publicId,folder}` — `api.update(publicId,{asset_folder})`. **URL-safe only
  because the account is in `dynamic` folder mode** (verified live): `asset_folder` is
  metadata, `public_id` and every stored URL are untouched. On a `fixed`-mode account this
  same call is a rename that breaks every reference — re-check the mode before reusing this.
- `GET /usage?publicId=` — `findMediaUsage`, drives the delete warning.
- `DELETE /?publicId=&resourceType=&force=` — `isDeletableAsset` guard (403), 409
  `{error:'in_use', usage}` unless `force=true`, then `uploader.destroy` (`invalidate: true`)
  and clears the cache. A destroyed file can still serve from Cloudinary's **CDN edge** for a
  few seconds; the asset store is the source of truth.
- `cloudinaryError(err)` — Cloudinary rejections embed `request_options.auth` (**api key +
  secret in plain text**); only the message is ever logged.

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
last super_admin**). All audit-logged. `role:'employee'` (+ `manageRole`) on POST/PUT creates a
Manage profile and stores the user as `super_admin` with `manageUserId`; an employee's role is
fixed, and email/name edits sync to the profile; delete deactivates it (§17).

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
  With `template: 'custom'` + `stationId`, copies the station's `customVideo` onto the job (§12).
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
  Gemini prompt carries 18 numbered topics; 15-18 are the field troubleshooting sheet
  (kicked out / dead button / stuck task / missing collage video).
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
- **`routes/adminHelpAssistant.ts`** — `/api/admin/help-assistant` (admin roles incl. customer).
  `buildSystemPrompt(lang)` embeds a large how-to knowledge base of the admin UI (tabs, row
  actions, audit log, tutorials). `POST /chat` answers admin how-to questions and can create
  DevTasks. **Report mode**: when the body carries `context.activityId` (set while the admin is
  in that activity's Statistics view) the route ownership-checks the activity, appends
  `buildReportContext()`'s JSON snapshot (capped at 60k chars, participants trimmed first) to
  the prompt as `ACTIVITY DATA (JSON)`, and the bot answers analytics questions from it. There
  is no separate report-assistant route any more.
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
`parsePeriod`/`periodStart`/`periodEnd`/`periodDay`. A period is a rolling window
(`day|week|month|year`) **or `day:YYYY-MM-DD`** = one Israel calendar day (`israelDayRange`,
the only form with an exclusive upper bound). The day rides *inside* the period value on
purpose: every panel, export and share link already threads `period`, so single-day slicing
needed no signature changes. `routes/analytics.ts` imports these — it used to keep its own
duplicate copies, which silently downgraded `day:` to `year`. Each fn takes
`(activityId, period, excludeIds?)` and reads `Report`s, honoring `excludedReportIds`:
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
- **`LanguageContext`** — `useLang()` → `{lang('he'|'en'), dir('rtl'|'ltr'), setLang,
  restrictToLanguages, enterScopeOf}`; sets `<html lang/dir>`. **`useTranslations(texts)`** → active
  language slice of a `{he,en}` object (the co-located `.i18n.ts` pattern).
- **The server's own sentences are translated too**, via `translateText(text, lang)` in
  `contentTranslation` - one line, through the same content cache, so a fixed phrase costs one
  model call ever. It returns the input untouched for the default language *and* for text with
  no Hebrew in it, so a model answer already written in the participant's language passes
  through the same boundary unharmed. Used by: the avatar's stock reactions and "cannot expand"
  line (`avatarQuiz`), the chat fallback (`avatarChat`), the collage share page and its SMS, and
  the group-reward winner SMS. `CollageJob.lang` and `Report.lang` exist for exactly this - both
  are read long after the request that created them, so the language has to be stored, not
  inferred.
- **A persona prompt must not name a language.** `avatarChat` and `avatarQuiz` said, in Hebrew,
  "always answer in Hebrew"; the English `replyLanguageInstruction` appended at the end lost to
  it and the character kept answering in Hebrew. The clause is now only emitted for the default
  language. Found by calling the endpoint, not by reading the prompt.
- **One language registry per side.** `client/src/utils/languages.ts` holds `code`, `label`,
  `short`, `flag`, `dir`, `locale`; `server/src/utils/languages.ts` holds `code`, `name` (English,
  for model prompts), `locale`, `voices`. `SUPPORTED_LANGS`, `Lang`, `DEFAULT_LANG`, the TTS
  voice, the translation prompt and `replyLanguageInstruction` all derive from them, and
  `LanguageContext` re-exports `LANGS` so existing imports are untouched. Five places used to
  keep their own partial list; two of them failed silently when they disagreed (a language with
  no voice made Azure return an empty clip, i.e. silence). `server/src/utils/languages.test.ts`
  now fails if a row is incomplete or the two sides list different codes.
- **Three language preferences, not one** (`utils/currentLang.ts`). The activity, the staff
  panels and the marketing site are separate products sharing an origin, so each stores its own
  choice: `yooz_participant_lang` (`/play`, `/home`, `/story`, `/mission`, `/portal`),
  `yooz_admin_lang` (`/admin`, `/manager`, `/manage`, `/control`) and `yooz_site_lang`
  (everything else). Default `he` throughout. They replaced a single shared `yooz_lang`, under
  which reading the marketing site in English put the next activity into English and an admin's
  panel language reached participants. `langScope(pathname)` is the one mapping — it is read
  from the path so it also works outside React (`apiFetch`, the module cache, the avatar's
  fetch helper), and `LangScopeSync` (inside the router, since the provider sits above it)
  re-reads the right preference when a client-side navigation crosses between them.
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
  preloads media, then redirects by moduleType: `mission` → `participantMissionPath`, any other
  module (story, spiders, map) → `participantStoryPath`, none → `/home`.
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
    countdown. **`LeaderboardView.tsx`** — individual + group standings (`/leaderboard`);
    row selection is hoisted into `rows` so the empty state matches what actually renders.
  - **`ActivitySessionHeader.tsx`** — top bar (progress, leaderboard trophy, logout, mute). The
    button row keeps `direction: ltr` so the score reads as a number, and mirrors itself with
    `flex-direction: row-reverse` under `[dir="ltr"]`: exit at the edge the language ends on,
    score at the edge it starts from, in both languages. When the activity offers more than one
    language, a globe button sits right after "?" on the stations screens (map, roadmap, spiders) and
    opens the same `LangDrawer` sheet as the entry screen; the bar reads the offered languages from
    `activityLanguages(code)` (stored by the page on load), so no view has to pass them down. Inside a
    station (`PlayingPhase`, `languageButton={false}`) it is left out - five buttons was too many.
- **`MissionPage/index.tsx`** (`/mission/:code`) — standalone 3-part mission: explanation screens
  → `MissionPuzzle.tsx` → `MissionTrashSort.tsx` (+ `MissionFrame`, `MissionTopMenu`); posts
  `mission-event` analytics.
- **`HomePage/index.tsx`** (`/home`) — post-login landing for some flows.
- **`pages/marketing/*`** — the public marketing site (§13a). **`PublicityPage`** — the previous
  `SiteContent`-driven landing page; still in the tree, no longer routed.
  **`PrivacyPage`** — privacy policy. **`ParticipantLandingRedirect`** / `FallbackRedirect`
  keep participants on their activity.

### Admin pages (`pages/admin/`)
- **`AdminLoginPage`** — email+password / Google. **`AdminDashboardPage/index.tsx`** — tab shell
  (activities/statistics/stations/library/media/portals/publicity/users/tutorials by role); parallel-
  fetches activities/games/stations/missions/folders; folder UI (`FolderFormModal`,
  `PastelSwatchPicker`, `folderUi`).
- **`AdminCreateActivityPage/`** — the big activity editor, a **6-step wizard**: 1 type & look
  (name, module type, theme, opening) → 2 access & timing (login fields, groups, schedule,
  manager, help chat) → 3 content → 4 rules & texts (leaderboard, guidelines, instructions,
  popups) → 5 follow-up SMS → 6 summary & submit — the summary is always the final step, and
  submit lives only there. `stepSequence` is derived from the module type, so `none` collapses
  to steps 1, 2, 6 (the SMS step is wizard-only); `canReachStepN` gates forward navigation (a
  step can't be left with 0 items, or with a map item missing a location), and `reviewIssues`
  drives both the step-6 summary and the red dot on already-visited rail steps.
  Sub-components: `ModuleItemsSection` (ordered content list first, then the item catalogue;
  per-item state shown as text status badges), `ItemSettingsModal` (one place for an item's
  group visibility / location / spider SVG / final / re-entry / collage split),
  `ThemePickerModal` (theme gallery; previews are painted from `roadmapThemes.ts`'s own kits so
  they can't drift from the participant roadmap), `PopupMessagesSection`, `ThemeFormModal`,
  `GroupOrderEditor`, `CollageSplitEditor`, `ItemPreviewModal`.
  **Admin UI here is deliberately icon-free** — state reads through colour, border and text
  badges; drag handles are CSS dot-grids, not glyphs.
- **`AdminGameConfigPage/`** — per-type config forms: `TriviaGameConfig`, `OrderGameConfig`,
  `PuzzleGameConfig`, `TrueFalseGameConfig`, `BallGameConfig`, `TrashSortGameConfig` (+ `index`).
- **`AdminStationConfigPage`** - station editor (all 11 types). **`AdminMissionConfigPage`** -
  mission editor. **`AdminPortalConfigPage`** — portal editor (users, Excel import, activities).
- Dashboard tabs: **`AdminGamesTab`**, **`AdminStationsTab`**, **`AdminLibraryTab`**,
  **`AdminMediaTab`** (Cloudinary browser, admin/super_admin — `MediaBrowser` + upload into
  the open folder),
  **`AdminPortalsTab`**, **`AdminPublicityTab`** (site content + leads), **`AdminUsersTab`**,
  **`AdminTutorialsTab`**, and **`AdminStatisticsTab/`** (see below).
- **`AdminStatisticsTab/`** — `index` (view switch overview/activity/combined/audit),
  `OverviewSection` (KPIs, timeline, activities table, combined-select, audit-log button —
  hidden for customers), `ActivityAnalytics` (per-activity tabs), `FunnelChart`,
  `ItemAnalyticsTable`, `GroupComparison`, `ParticipantsRoster` (exclusions), `ExportSection`,
  `AutomatedReportSection` (scheduled reports, admin/super_admin only — see Activity model §4),
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
variant), **`PuzzleGame`**, **`TrueFalseGame`**, **`TrashSortGame`**, **`BallGame`** (`index.tsx`
iframes the Phaser game in `client/public/assets/games/ballgame/`: `js/main.js` + `js/customizedTimer.js`;
`BallGameCanvas`/`BallGamePlay`/`usePhysicsEngine`/`useBallGameSounds` are not imported anywhere).
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
- **`HelpChat/`** — participant help FAB/drawer (`index`, `HelpChatContext`, `matcher`, styled).
  The field troubleshooting sheet (תקלות נפוצות בפעילות) lives in **three** places that must
  stay in sync: a menu chip + response string per item in `HelpChat.i18n.ts`, keyword topics in
  `matcher.ts` (collisions guarded by `matcher.test.ts`), and topics 15-18 of the Gemini prompt
  in `server/src/routes/help.ts`. The facilitator-voiced copy of the same sheet is in
  `server/src/routes/adminHelpAssistant.ts`
  → `/api/help`. **`AdminHelpChat/`** — admin how-to chat (DumbDumbBot; FAB defaults
  bottom-left, draggable via `useFabPosition`, position kept in `yooz_bot_pos`, panel anchors
  to the FAB's corner) + `DevTasksPanel` → `/api/admin/help-
  assistant`. Analytics Q&A lives here too: `reportScope.ts` holds the activity id the admin
  stats view is showing (module variable, read at send time) and it rides along as
  `context.activityId`.
- **`MobileContainer`** (≤480px participant frame), **`ParticipantActivityScope`** (scopes a
  participant to one activity), **`ParticipantLandingRedirect`**, **`ActivityLogoutButton`**,
  **`SmsConsent`**, **`Pagination`**, **`ErrorBoundary`**, **`FileUploadButton`** (opens a
  two-tab picker — upload from the computer, or pick an existing asset; **all 31 call sites got
  the picker for free**, the props and `onUploaded(url, file?)` contract are unchanged. Falls
  back to the plain file dialog for non-admin roles), **`MediaBrowser`** (the grid itself:
  folder breadcrumb + subfolder chips, type filter, substring search, offset paging, and
  copy/pick/move/delete. **`allowManage`** (Media tab only) adds new-folder, delete-folder,
  and moving. **Move = drag a card onto a folder chip or a breadcrumb crumb** (mouse/HTML5
  Drag API, matching the dashboard's activity+station folder drag; dashed-purple drop
  highlight, dragged card at 0.4 opacity). The Move *button* stays as the fallback — drag
  events never fire on touch. The picker gets folder *browsing* but none of the mutations),
  **`LangDrawer`** (language switch), **`StationStage`**.
- Backgrounds/themes: `ThemedBackground`, `DesertBackground`, `NatureBackground`,
  `OceanBackground`, `OfficeBackground`, `themes/SpyThemeWrapper`. `styled.ts` holds shared
  styled primitives + color tokens (`PRIMARY`, `TEXT`, …).

---

_End of Part B. Part B mirrors the code as of this reconstruction — when a signature, endpoint,
or component changes, update the matching entry here so the fast path stays trustworthy._
