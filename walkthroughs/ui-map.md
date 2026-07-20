# Yooz System UI Map — For Playwright Spec Generation

This document provides EXACT selectors, routes, Hebrew labels, and navigation flows for the Yooz system.
Use ONLY the selectors documented here. All captions must be in Hebrew.

---

## ROUTES

### Admin Routes
| Route | Page | Description |
|-------|------|-------------|
| `/admin/login` | Admin Login | Email + password form |
| `/admin/dashboard` | Admin Dashboard | Main hub with tabs |
| `/admin/activities/new` | Create Activity | Multi-step form |
| `/admin/activities/:id` | View Activity | Activity detail page |
| `/admin/activities/:id/edit` | Edit Activity | Edit existing activity |
| `/admin/games/new` | Create Game | Game config form |
| `/admin/games/:id` | Edit Game | Edit existing game |
| `/admin/stations/new` | Create Station | Station config form |
| `/admin/stations/:id` | Edit Station | Edit existing station |
| `/admin/missions/new` | Create Mission | Mission config |
| `/admin/missions/:id` | Edit Mission | Edit existing mission |
| `/admin/portals/new` | Create Portal | Portal config |
| `/admin/portals/:id` | Edit Portal | Edit existing portal |

### Participant Routes
| Route | Page | Description |
|-------|------|-------------|
| `/play/:code` | Play Page | Activity splash + login |
| `/story/:code` | Story Module | Roadmap + games + finish |
| `/mission/:code` | Mission Page | Mission flow |
| `/home` | Home Page | After login landing |

### Public Routes
| Route | Page | Description |
|-------|------|-------------|
| `/` | Landing Page | Public landing (responsive — mobile stacked, desktop 3-column feature row) |
| `/manager` | Manager Login | Manager login form |
| `/portal/:code` | Portal Login | Portal login/register |

---

## PAGE-BY-PAGE SELECTORS

### 1. Admin Login (`/admin/login`)

**Inputs:**
- Email: `input[type="email"]` (placeholder: "Email" / "אימייל")
- Password: `input[type="password"]` (placeholder: "Password" / "סיסמה")

**Buttons:**
- Submit: `button[type="submit"]` (text: "Sign In" / "כניסה")
- Google: button with text "Sign in with Google" / "כניסה עם גוגל"

**After login:** navigates to `/admin/dashboard`

---

### 2. Admin Dashboard (`/admin/dashboard`)

**Main Tabs** (clickable buttons in top tab bar):
| English | Hebrew | Selector |
|---------|--------|----------|
| Activities | פעילויות | `button:has-text("Activities"), button:has-text("פעילויות")` |
| Statistics | דוחות | `button:has-text("Statistics"), button:has-text("דוחות")` |
| Stations | תחנות | `button:has-text("Stations"), button:has-text("תחנות")` |
| Library | ספרייה | `button:has-text("Library"), button:has-text("ספרייה")` |
| Portals | פורטלים | `button:has-text("Portals"), button:has-text("פורטלים")` |
| Publicity | אתר פרסום | `button:has-text("Publicity"), button:has-text("אתר פרסום")` (admin + super_admin only) |
| Users | משתמשים | `button:has-text("Users"), button:has-text("משתמשים")` |
| Tutorials | סרטוני הדרכה | `button:has-text("Tutorials"), button:has-text("סרטוני הדרכה")` |

**Publicity Tab** (edits the public marketing site served at `/`):
- Sub-tabs: Content (`button:has-text("Content"), button:has-text("תוכן")`) and Leads (`button:has-text("Leads"), button:has-text("פניות")`).
- Content editor sections: Branding, Hero, Who is it for (4 audiences), Marketing Engine (3 boosters), Customers, Contact. Each text field has paired Hebrew + English inputs; images use the shared `FileUploadButton` (`button:has-text("Upload"), button:has-text("העלאה")`).
- Save button: `button:has-text("Save changes"), button:has-text("שמירת שינויים")`.
- Leads sub-tab: table of contact-form submissions with a "handled" checkbox per row.

**Activities Tab:**
- Search input: `input[placeholder*="Search name"], input[placeholder*="חיפוש"]` — matches activity name, creator email, and activity code (case-insensitive)
- Create button: `button:has-text("Create Activity"), button:has-text("צור פעילות")` → navigates to `/admin/activities/new`
- Activity rows: `tr` in table, clickable → navigates to `/admin/activities/{id}`
- Status badge: "Live" / "פעיל" or "Preview" / "תצוגה מקדימה"
- Logout: `button:has-text("Logout"), button:has-text("יציאה")`
- Activity row actions (each row + each mobile card): single pencil-icon button (aria-label "Actions" / "פעולות") opens an inline dropdown menu (same white panel style as the Stations row menu). Esc, outside click, or clicking the icon again closes it. Menu items:
  - Duplicate: `button:has-text("Duplicate"), button:has-text("שכפול")` — POSTs `/api/admin/activities/:id/duplicate`, closes the menu, then navigates to `/admin/activities/{newId}` (clones name with " (עותק)" suffix; new activity starts as Preview with a fresh code).
  - Delete: `button:has-text("Delete"), button:has-text("מחיקה")` — first click switches the same item to "Are you sure?" / "בטוח?" (red filled style), second click DELETEs `/api/admin/activities/:id` and refreshes the list.

**Stations Tab Sub-sections** (segmented buttons):
| English | Hebrew | Selector |
|---------|--------|----------|
| Stations | תחנות | `button:has-text("Stations"), button:has-text("תחנות")` |
| Games | משחקים | `button:has-text("Games"), button:has-text("משחקים")` |
| Missions | משימות | `button:has-text("Missions"), button:has-text("משימות")` |
| Collage | קולאז׳ | `button:has-text("Collage"), button:has-text("קולאז׳")` |
| Feedback | משוב | `button:has-text("Feedback"), button:has-text("משוב")` |

**Stations table type filter** (above the search/tag row in `/admin/dashboard` Stations tab):
- Segmented sub-tab bar (same `GameTabBar`/`GameTabGroup`/`GameTab` styled components used by Games sub-tabs). First tab is "All" / "הכל"; remaining tabs are dynamically derived from the station types currently present in the data (sorted), labeled via `typeLabel(type)` (e.g. Text/Video/Image/Narrative/Badge/Collage/Feedback/Riddle/Avatar/Entering Text). Bar scrolls horizontally if it overflows. Hidden if only one type is present.

**Stations table row actions** (each row in `/admin/dashboard` Stations tab):
- Single pencil-icon button per row (aria-label "Actions" / "פעולות") opens an inline dropdown menu anchored under the icon (white panel, rounded, separator lines — same style as the dashboard mobile-nav hamburger). Clicking outside the menu, pressing `Esc`, or clicking the icon again closes it. Menu items:
  - Duplicate: `button:has-text("Duplicate"), button:has-text("שכפול")` — POSTs `/api/admin/stations/:id/duplicate`, closes the menu, then navigates to `/admin/stations/{newId}` config page (clones name with " (עותק)" suffix, type, description, customer, theme, tags, settings).
  - Delete: `button:has-text("Delete"), button:has-text("מחיקה")` — first click switches the same item to "Are you sure?" / "בטוח?" (red filled style), second click deletes.

**Game Sub-tabs** (when Games section active):
| English | Hebrew | Selector |
|---------|--------|----------|
| Order | סדר | `button:has-text("Order"), button:has-text("סדר")` |
| Trivia | טריוויה | `button:has-text("Trivia"), button:has-text("טריוויה")` |
| Puzzle | פאזל | `button:has-text("Puzzle"), button:has-text("פאזל")` |
| True/False | נכון/לא | `button:has-text("True/False"), button:has-text("נכון/לא")` |
| Ball Game | כדור לסל | `button:has-text("Ball Game"), button:has-text("כדור לסל")` |

---

### 3. Create Activity (`/admin/activities/new`)

**Step Navigation:**
- Step 1 pill: `button:has-text("Activity Settings"), button:has-text("הגדרות פעילות")`
- Step 2 pill: `button:has-text("Select Games"), button:has-text("בחירת משחקים")`

**Step 1 — Settings:**
- Activity Name: `input[placeholder*="Activity Name"], input[placeholder*="שם הפעילות"]`
- Login fields checkboxes: "Name"/"שם", "Email"/"אימייל", "Phone"/"טלפון"
- Google sign-in toggle: checkbox near "Google Sign-in" / "קביעת כניסה עם גוגל"
- Connection type: buttons "Single"/"בודד" and "Group"/"קבוצה"
- Module type: buttons "Story"/"סיפור" and "None"/"ללא"
- Background Image URL: `input[placeholder*="background"], input[placeholder*="תמונת רקע"]`
- Manager email: `input[placeholder*="Manager Email"], input[placeholder*="אימייל מנהל"]`
- Manager password: `input[type="password"]` (in manager section)
- Guidelines: `textarea` with placeholder about guidelines
- Opening type: radio "None"/"Video"/"Image"
- Scheduling: "Always open" checkbox, datetime-local inputs for start/end
- Leaderboard Mode (`leaderboardMode`): SelectionGroup with three options — **Points** (default, rank by `data.totalScore` desc), **Time** (rank by `sessionDurationMs` asc; only completed reports), **Both** (rank by points like Points mode, but the live timer also runs in the participant header and the time appears under the score in the leaderboard + a separate StatCard on the finish screen). Time + Both also reveal the "Time limit (minutes)" input — fires the 1-minute-warning popup and turns the header timer red once exceeded. Server enum in [Activity.ts:225](server/src/models/Activity.ts) now accepts `'points' | 'time' | 'both'`.
- Next button: `button:has-text("Next"), button:has-text("הבא")`

**Step 2 — Select Items:**
- Tab buttons: "Games"/"משחקים", "Stations"/"תחנות", "Missions"/"משימות"
- Filter input: `input[placeholder*="filter"], input[placeholder*="חיפוש"]`
- Game/Station cards: clickable divs with emoji icons and names
  - Cards show: emoji icon + name + type badge
  - Selected cards show ✓ checkmark
- Item emojis by type:
  - ❓ Trivia Game
  - 🔢 Order Game
  - 🧩 Puzzle Game
  - ✅ True/False Game
  - 🏀 Ball Game
  - 🗑️ Trash Sort Game
  - 📝 Text Station
  - 🎬 Video Station
  - 🖼️ Image Station
  - 📖 Narrative Station
  - 🏅 Badge Station
- Selected items list: draggable items with remove (×) button
- Submit: `button[type="submit"]` (text: "Create Activity" / "צור פעילות")

**After create:** navigates to `/admin/activities/{id}`

---

### 4. Game Config (`/admin/games/new`, `/admin/games/:id`)

**Fields:**
- Game Name: `input[placeholder*="Game Name"], input[placeholder*="שם המשחק"]`
- Game Type selector: buttons for each type (Order, Trivia, Puzzle, True/False, Ball Game, Trash Sort)
- Description: `textarea` or `input[placeholder*="description"], input[placeholder*="תיאור"]`
- Customer: `input[placeholder*="customer"], input[placeholder*="לקוח"]`
- Tags: tag input field
- Instructions: textarea for game instructions
- **Start button text (optional)**: input — overrides each game's default intro start-button label (`settings.startButtonText`). Empty/missing falls back to the per-game default ("Continue"/"Start"/"Got it!" etc). Applies to all game types; for Ball Game it flows through the iframe via the BALLGAME_INIT message so `#iStart` picks it up.
- Hint toggle: checkbox for enabling hints
- Hint text: input that appears when hint enabled

**Buttons:**
- Random test data: button with 🎲 emoji
- Submit: `button[type="submit"]` (text: "Save" / "שמור")
- Back: navigates to `/admin/dashboard`

**After save:** navigates to `/admin/dashboard`

---

### 5. Station Config (`/admin/stations/new`, `/admin/stations/:id`)

**Fields:**
- Station Name: `input[placeholder*="Station Name"], input[placeholder*="שם התחנה"]`
- Station Type: buttons for Text/Video/Image/Narrative/Badge/Collage/Feedback/Riddle/Avatar/EnteringText
- Avatar config fields: Character Name, Character Image (upload), Voice Type (man/woman), Show description as popup before (toggle ON/OFF — when ON, station description is shown as a guidelines-style intro popup on entry, hidden below title, and reopenable via an info-icon at top-right of the avatar image), Detective Riddle (absolute truth), Instructions, Optional Answers list (0-N), Forbidden Phrases list (0-N), Videos list (0-N with URL + matching words Enter-to-add), Characters list (0-N name+description), Clues list (0-N name+description), Knowledge Gates list (0-N trigger+reveal), Hint Strategy (textarea). All fields passed to Gemini via POST `/api/avatar-chat`.
- Riddle config fields: Clue/Question, Correct Answer (spaces = word breaks), Max Score (default 100), Hint Media (image/video, upload or URL — optional), Success Message (optional override), Failure Message (optional override), **Continue Button Text (optional)** — overrides the default "Continue"/"המשך" which is auto-picked from content language (Hebrew detected in clue OR answer), **Success Popup Image (optional, upload or URL)** — when set, replaces the default trophy SVG in the success overlay.
- EnteringText config fields: Form Title, Fields list (statement / placeholder / right answer / keywords bank), Submit Button Text, Return Button Text, Number of tries, Success popup (title / subtitle / media type none|image|video / media URL or upload), **Last step toggle (ON/OFF, default OFF)** — when ON, clicking Continue on the success popup ends the activity (skipping any remaining roadmap items) and goes straight to the finish screen; the participant is added to the leaderboard with their session duration.
- Collage config fields: Header, Description, **Disclaimer (optional)** — extra small-print paragraph rendered as a bordered info box at the bottom of the intro screen (above the "start" + "skip" buttons). Stored at `settings.disclaimer`; omitted when empty. **Content (template select — "פארק" / "גני יהושוע", default "פארק")** — picks which base template video the photos are composited into. Each template has its own panel timings/dimensions/aspect ratio (default = 1080×1350 with yellow logo placeholder; Gan Yehoshua = 1080×1920, no logo). Server route `/api/collage/generate` accepts a `template` form field; missing/unknown values fall back to "default". For Gan Yehoshua the ffmpeg pipeline also recolors the baked-in yellow "SKY PARK TLV" text in the top-left to white via `template.iconRecolor` (colorkey + white-fill overlay, no source-MP4 edit). Logo (optional, upload or URL — overlaid in the yellow placeholder of the default template, ignored by templates without a logo placeholder), Missions list (each title + optional description). The participant-side review screen also exposes an optional title input ("כותרת לסרטון (אופציונלי)") which is rendered top-center on the final video as a white-on-black-stroke caption. **Split mode (`station.collageSplit`):** every part now shows the "דלג על התחנה הזו" skip button — intro on part 1, capture-phase OutlineBtn on parts 2+, and the auto-generating screen on a dedicated video-only final part. Previously only part 1 was skippable. **SMS-when-ready callout (generating screen, when `smsForCollage` + participant phone):** a loud pulsing gradient pill button "📲 שלחו לי את הסרטון ב-SMS כשהוא מוכן" with a bouncing hint line "לא חייבים לחכות כאן! 👇" above it; tapping it requests the SMS and immediately continues the activity. Animations disabled under `prefers-reduced-motion`.
- Description: textarea
- Customer: `input[placeholder*="customer"]`

**Buttons:**
- Submit: `button[type="submit"]` (text: "Save" / "שמור")
- Back: navigates to `/admin/dashboard`

---

### 6. View Activity (`/admin/activities/:id`)

**Displays:**
- Activity name, code, status, module type
- QR code
- Edit button → navigates to `/admin/activities/{id}/edit`
- Status toggle button (Preview ↔ Live)
- Delete button with confirmation

**Manager login icon** (only when `activity.managerEmail` is set):
- Small round lock icon in the page header (next to "Back"): `button[aria-label="Open manager panel"], button[aria-label="פתח פאנל מנהל"]`
- Click opens ManagerLoginModal:
  - If `managerHasPassword`: email + password + "Log In" button
  - Else: "Continue with Google" button (Google email must match `managerEmail`)
  - On success: navigates to `/manager/dashboard`

---

### 7. Statistics Tab (in Dashboard)

**Overview section:**
- KPI cards: total participants, completion rate, avg score, avg duration
- Timeline chart
- Activity list: click activity → detailed analytics

**Activity Analytics:**
- Score distribution chart
- Funnel visualization (joined → started → halfway → completed)
- Per-item stats table
- Group comparison table
- Export button: `button:has-text("Export"), button:has-text("ייצוא")`
- Back button to overview
- **AI report assistant FAB** (bottom-end): floating circular "AI" button (`button[aria-label*="AI"], button:has-text("AI")`). Opens a chat panel asking "האם חסר לך איזה דוח?"; user types a free-form request. Server first tries to map it to a built-in export (Executive / Participants / Scores / Progress) or analytics view (Funnel / Items / Groups) and offers an "Open report" button. Otherwise calls Gemini with the activity's aggregated data context and returns a markdown report plus optional table; user can download as XLSX or CSV.

---

### 8. Library Tab (in Dashboard)

**Filter buttons:**
- "All" / "הכל"
- "Games" / "משחקים"
- "Stations" / "תחנות"

**Table rows:**
- Each row shows: name, type, customer
- Export button on each row: `button:has-text("Export"), button:has-text("ייצוא")`
- Export navigates to `/admin/games/new?type=...` or `/admin/stations/new?type=...` with prefilled data

---

### 9. Play Page (`/play/:code`)

**States:**
1. Loading: purple screen with "zooY" text animation
2. Scheduled (pending): countdown with days/hours/minutes/seconds
3. Scheduled (expired): "הפעילות הסתיימה" message
4. Active: shows opening media (if configured) then login form
   - Video splash does NOT autoplay; shows centered "▶ Tap to play with sound" / "לחצו לצפייה עם קול" button. Video stays hidden until pressed; tapping the button starts playback with audio. Skip hint and outside-click skip are disabled until the video has started.
   - Image splash auto-fades after 5s; default Yooz splash auto-fades after 1.5s. Both can be skipped on tap.

**Login Form** (ActivityLogin component):
- Name input: `input[placeholder*="name"], input[placeholder*="שם"]` (if configured)
- Email input: `input[type="email"]` (if configured)
- Phone input: `input[type="tel"]` (if configured)
- Group selector: dropdown (if group connection)
- Self-service group join screen (`JoinExistingGroupForm`): team-name/invite-link input, and below it a scrollable list (max-height 200px) of all groups created today (Israel time, `GET /api/activities/:code/groups/today`, newest first) — typing in the input filters the list; tapping a group joins it via its invite token
- Join button: `button[type="submit"]` (text: "!התחברו" / "Connect!")
- Google button: button with text "Continue with Google" / "המשך עם גוגל"

**After login:** navigates to `/story/:code` or `/mission/:code` or `/home`

---

### 10. Story Module Page (`/story/:code`)

**Phases:**
1. Roadmap: visual card layout of all items
2. Playing: inline game/station rendering
3. Leaderboard: live scores between items. In group activities (`connectionType: 'group'`), a "Group Scores" section (sum of member `data.totalScore` per group, current group highlighted) appears above the individual "Players" list.
4. Finish: confetti + final score + leaderboard

**Header elements:**
- Activity code display
- Language button (top right)
- Help button (`?`, `button[aria-label*="עזרה"]`) — opens the HelpChat panel (FAQ menu + free-text Gemini chat via POST `/api/help`; the request includes live `context` — activity name, phase, current station index/name/type — so answers are station-specific). After the guidelines popup is dismissed, the `?` button wiggles for 3s with a white tooltip bubble "צריכים עזרה? לחצו כאן 👆" that auto-hides (also dismissed by opening the chat; animation off under `prefers-reduced-motion`)
- Logout button

**Roadmap view:**
- Item cards with icons (by type emoji)
- Click card to start playing
- Progress indicators on completed items

**Image Station (player):**
- Title + description + image inside `StationWindow`, with a Continue button below
- Click image → opens fullscreen overlay (dark background) showing the image at max size; close via × button (top-right), clicking outside the image, or Escape key

**Finish screen:**
- Score display
- Leaderboard table
- Confetti animation

---

## COMMON NAVIGATION FLOWS

### Flow: Admin Login → Dashboard
```
page.goto('/admin/login')
page.fill('input[type="email"]', 'admin@yooz.com')
page.fill('input[type="password"]', 'admin123')
page.click('button[type="submit"]')
page.waitForURL('**/admin/dashboard')
```

### Flow: Dashboard → Create Activity
```
page.click('button:has-text("Create Activity"), button:has-text("צור פעילות")')
page.waitForURL('**/activities/new')
```

### Flow: Dashboard → Switch Tab
```
page.click('button:has-text("TAB_NAME_HERE")')
pause(page, 1500)
```

### Flow: Dashboard → View Activity
```
page.locator('tr').nth(1).click()  // click first activity row
page.waitForURL('**/admin/activities/**')
```

### Flow: Dashboard → Games Section
```
page.click('button:has-text("Stations"), button:has-text("תחנות")')
pause(page, 500)
page.click('button:has-text("Games"), button:has-text("משחקים")')
```

### Flow: Library → Export Game
```
page.click('button:has-text("Library"), button:has-text("ספרייה")')
pause(page, 1500)
page.locator('button:has-text("Games"), button:has-text("משחקים")').last().click()
pause(page, 1000)
page.locator('button:has-text("Export"), button:has-text("ייצוא")').first().click()
page.waitForURL('**/admin/games/new**')
```

### Flow: Participant Login → Play
```
page.goto('/play/ACTIVITY_CODE')
page.fill('input[placeholder*="name"], input[placeholder*="שם"]', 'משתתף לדוגמה')
page.click('button[type="submit"]')
page.waitForURL('**/story/**')
```

---

## HEBREW LABEL REFERENCE

### Common Actions
| Action | Hebrew |
|--------|--------|
| Login / Sign In | כניסה |
| Logout | יציאה |
| Create | צור / צרו |
| Save | שמור / שמירה |
| Delete | מחק / מחיקה |
| Cancel | ביטול |
| Search | חיפוש |
| Back | חזרה |
| Next | הבא |
| Loading | טוען... |
| Export | ייצוא |
| Edit | עריכה |
| Preview | תצוגה מקדימה |
| Connect | !התחברו |

### Dashboard Tabs
| Tab | Hebrew |
|-----|--------|
| Activities | פעילויות |
| Statistics | דוחות |
| Stations | תחנות |
| Library | ספרייה |
| Portals | פורטלים |
| Publicity | אתר פרסום |
| Users | משתמשים |
| Tutorials | סרטוני הדרכה |

### Game Types
| Type | Hebrew |
|------|--------|
| Order | סדר |
| Trivia | טריוויה |
| Puzzle | פאזל |
| True/False | נכון/לא |
| Ball Game | כדור לסל |
| Trash Sort | טרמפולינה |

### Station Types
| Type | Hebrew |
|------|--------|
| Text | טקסט |
| Video | וידאו |
| Image | תמונה |
| Narrative | סיפור |
| Badge | תג |
| Collage | קולאז׳ |
| Feedback | משוב |
| Riddle | חידה |
| Avatar | אוואטר |
| Entering Text | הזנת טקסט | Multi-field guess station with persisted attempts (sessionStorage `yooz_entering_text_${code}_${stationId}`). Return button → roadmap without marking complete. Out-of-attempts triggers Hebrew failure popup, then returns to roadmap. |
