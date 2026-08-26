# Yooz Platform — Software Requirements & Test Plan

> Auto-generated documentation of client-side behavior and manual QA tests.
> Last updated: 2026-08-26

---

## Table of Contents

1. [Activity Login & Authentication](#1-activity-login--authentication)
2. [Portal Login & Forced Password Change](#2-portal-login--forced-password-change)
3. [Google Sign-In](#3-google-sign-in)
4. [Scheduling (Countdown / Expired)](#4-scheduling-countdown--expired)
5. [Opening Splash](#5-opening-splash)
6. [Roadmap & Navigation](#6-roadmap--navigation)
7. [Guidelines Popup](#7-guidelines-popup)
8. [Stations — Text](#8-stations--text)
9. [Stations — Video](#9-stations--video)
10. [Stations — Image](#10-stations--image)
11. [Stations — Narrative](#11-stations--narrative)
12. [Stations — Badge](#12-stations--badge)
13. [Stations — Collage](#13-stations--collage)
14. [Stations — Feedback](#14-stations--feedback)
15. [Order Game](#15-order-game)
16. [Trivia Game](#16-trivia-game)
17. [Puzzle Game](#17-puzzle-game)
18. [True/False Game](#18-truefalse-game)
19. [Ball Game](#19-ball-game)
20. [Trash Sort Game](#20-trash-sort-game)
21. [Hint System (Shared)](#21-hint-system-shared)
22. [Sound System](#22-sound-system)
23. [Scoring & Progress Saving](#23-scoring--progress-saving)
24. [Leaderboard](#24-leaderboard)
25. [Finish Page](#25-finish-page)
26. [Continuous Activity & Logout](#26-continuous-activity--logout)
27. [Help Chat (AI)](#27-help-chat-ai)
28. [Popup Messages](#28-popup-messages)
29. [Admin — Activity Creation](#29-admin--activity-creation)
30. [Admin — Game Configuration](#30-admin--game-configuration)
31. [Admin — Station Configuration](#31-admin--station-configuration)
32. [Admin — Statistics & Analytics](#32-admin--statistics--analytics)
33. [Groups — Self-Service (Day-Scoped)](#33-groups--self-service-day-scoped)
34. [Stations — Riddle](#34-stations--riddle)
35. [Stations — Avatar (AI Chat)](#35-stations--avatar-ai-chat)
36. [Stations — Avatar Quiz](#36-stations--avatar-quiz)
37. [Stations — Entering Text](#37-stations--entering-text)

---

## 1. Activity Login & Authentication

### Requirements

| ID | Requirement |
|----|-------------|
| AUTH-01 | The login page displays on a purple background (#8B2FC9) with the white Yooz logo |
| AUTH-02 | Login fields (Name, Email, Phone) are shown/hidden based on the activity's `loginFields` config |
| AUTH-03 | Required fields must be filled before the "Connect" button becomes enabled |
| AUTH-04 | If `connectionType === 'group'`, a bottom-sheet group selector appears with the configured group names |
| AUTH-05 | On submit the client sends `POST /api/auth/login` with `{ name, email, phoneNumber, group, activityCode }` |
| AUTH-06 | A successful login stores a JWT in `localStorage` under key `yooz_token` |
| AUTH-07 | The JWT payload contains `participantName`, `activityCode`, `connectionType`, `email`, `phoneNumber`, `group` |
| AUTH-08 | On success the user is navigated to `/story/{code}` |
| AUTH-09 | If the server returns error `'not_portal_user'`, the message "Cannot play — you must sign in through the portal" is displayed |
| AUTH-10 | While the request is in-flight, the button shows a loading state and all inputs are disabled |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-AUTH-01 | Required field validation | Open `/play/{code}`, leave Name empty, try clicking Connect | Button is disabled; cannot submit |
| T-AUTH-02 | Successful single login | Fill required fields, click Connect | Redirected to `/story/{code}`, `yooz_token` present in localStorage |
| T-AUTH-03 | Group selection | Open a group-type activity, tap Connect | Bottom-sheet appears with group options; selecting a group enables submission |
| T-AUTH-04 | Portal user error | Login to a continuous activity without portal credentials | Error message: "Cannot play — you must sign in through the portal" |
| T-AUTH-05 | Loading state | Click Connect with valid data on slow network | Button disabled, inputs disabled, spinner visible |
| T-AUTH-06 | Token structure | After login, decode `yooz_token` payload | Contains participantName, activityCode, connectionType |

---

## 2. Portal Login & Forced Password Change

### Requirements

| ID | Requirement |
|----|-------------|
| PORT-01 | Portal page at `/portal/{code}` shows login/register tabs |
| PORT-02 | Login form has username and password fields; both required |
| PORT-03 | Login sends `POST /api/admin/portals/public/{code}/login` |
| PORT-04 | Successful login stores `yooz_portal_token` and `yooz_portal_user` in localStorage |
| PORT-05 | If server returns 403 with `error === 'pending_approval'`, the pending-approval screen is shown (hourglass icon) |
| PORT-06 | If server returns 403 with other error, the access-denied screen is shown |
| PORT-07 | Registration sends `POST /api/admin/portals/public/{code}/register`; password must be >= 4 chars |
| PORT-08 | If registration returns 409, "This username is already taken" is shown |
| PORT-09 | After successful registration, the pending-approval screen appears |
| PORT-10 | If login response includes `mustChangePassword: true`, a forced-change screen is shown (purple page with lock icon) |
| PORT-11 | Forced-change screen has New Password and Confirm Password inputs; both must match and be >= 4 chars |
| PORT-12 | Forced-change submits `PATCH /api/admin/portals/public/{code}/profile` with `{ username, currentPassword, newPassword }` |
| PORT-13 | After successful password change, user proceeds to portal shell |
| PORT-14 | Portal shell has 4 tabs: Activities, Competitions ("Coming soon"), History, Profile |
| PORT-15 | History tab shows stats hero (completed count, avg score, total score, best position) and activity cards sorted by date or score |
| PORT-16 | Profile tab allows password change (requires current password) |
| PORT-17 | Logout clears `yooz_portal_token` and `yooz_portal_user` from localStorage |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-PORT-01 | Login happy path | Enter valid username/password, submit | Portal shell loads, token in localStorage |
| T-PORT-02 | Wrong password | Enter wrong password | "Invalid username or password" error |
| T-PORT-03 | Pending approval | Register a new user | After submit, pending screen with hourglass shown |
| T-PORT-04 | Duplicate registration | Register with an existing username | "This username is already taken" error |
| T-PORT-05 | Short password | Register with 3-char password | "Password must be at least 4 characters" error |
| T-PORT-06 | Forced password change | Login as user created by manager (mustChangePassword=true) | Purple lock screen shown before portal access |
| T-PORT-07 | Password mismatch | On forced-change screen, enter different passwords | "Passwords do not match" error |
| T-PORT-08 | Successful password change | Enter valid matching passwords (>=4 chars) | Portal shell loads; subsequent login does not require change |
| T-PORT-09 | History sorting | Go to History tab, tap "Sort by score" then "Sort by date" | Cards reorder accordingly |
| T-PORT-10 | Logout | Click logout in header | Returned to login form, tokens cleared from localStorage |

---

## 3. Google Sign-In

### Requirements

| ID | Requirement |
|----|-------------|
| GOOG-01 | Google sign-in button shown only if `VITE_GOOGLE_CLIENT_ID` is configured AND email field is enabled |
| GOOG-02 | Clicking opens a 480x600 popup to Google OAuth consent |
| GOOG-03 | After consent, the popup returns an access token via implicit grant |
| GOOG-04 | The token is used to fetch email from `googleapis.com/oauth2/v2/userinfo` |
| GOOG-05 | For activity login: the fetched email is submitted as the email field |
| GOOG-06 | For portal login: `POST /api/admin/portals/public/{code}/google-login` with `{ email }` |
| GOOG-07 | New portal users auto-register as "pending" and see the pending-approval screen |
| GOOG-08 | If popup is blocked, error "Popup blocked" is caught |
| GOOG-09 | If user closes popup, error "Popup closed" is caught |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-GOOG-01 | Button visibility | Open activity with email enabled + Google configured | "Continue with Google" button visible |
| T-GOOG-02 | Button hidden | Open activity without email field | Google button not shown |
| T-GOOG-03 | Successful Google login (activity) | Click Google button, complete OAuth | Logged in with Google email, navigated to `/story/{code}` |
| T-GOOG-04 | Successful Google login (portal) | Click Google button on portal page, complete OAuth | If user exists and approved: logged into portal |
| T-GOOG-05 | New Google user (portal) | Google login with unregistered email | Pending-approval screen shown |
| T-GOOG-06 | Popup blocked | Block popups in browser, click Google button | Error displayed gracefully |

---

## 4. Scheduling (Countdown / Expired)

### Requirements

| ID | Requirement |
|----|-------------|
| SCHED-01 | If `scheduledStart` is in the future, a countdown screen is shown with days/hours/minutes/seconds |
| SCHED-02 | Countdown updates every 1 second |
| SCHED-03 | When countdown reaches zero, the screen auto-transitions to the active state (login page) |
| SCHED-04 | If `scheduledEnd` is in the past, an expired screen is shown: "This activity has expired" |
| SCHED-05 | If no scheduling dates are set (always-open), the activity is immediately active |
| SCHED-06 | Both screens use purple background with Yooz logo |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SCHED-01 | Countdown display | Open activity with future `scheduledStart` | Countdown visible, ticking every second |
| T-SCHED-02 | Auto-transition | Wait until countdown reaches 0 | Login page appears automatically |
| T-SCHED-03 | Expired activity | Open activity with past `scheduledEnd` | "This activity has expired" message shown |
| T-SCHED-04 | Always-open activity | Open activity with no scheduling dates | Login page shown immediately |

---

## 5. Opening Splash

### Requirements

| ID | Requirement |
|----|-------------|
| SPLASH-01 | If activity has no `opening.url`, a default splash is shown: white Yooz logo + "Tap to skip" |
| SPLASH-02 | Default splash auto-fades after 1500ms with a 1200ms fade-out transition |
| SPLASH-03 | Tapping the default splash skips it immediately |
| SPLASH-04 | If `opening.type === 'video'`, a fullscreen video plays (muted, autoplay, inline) |
| SPLASH-05 | Video opening ends on video natural end or user tap |
| SPLASH-06 | If `opening.type === 'image'`, a fullscreen image is shown; tap to dismiss |
| SPLASH-07 | During opening, body scroll is locked (`overflow: hidden`) |
| SPLASH-08 | After opening dismissal, the login form is displayed |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SPLASH-01 | Default splash auto-fade | Open activity without opening | Logo splash appears, fades after ~1.5s, login form visible |
| T-SPLASH-02 | Tap to skip | Tap screen during default splash | Splash dismissed immediately |
| T-SPLASH-03 | Video opening | Open activity with video opening | Video plays fullscreen; after it ends, login form appears |
| T-SPLASH-04 | Image opening | Open activity with image opening | Image displayed fullscreen; tap to dismiss |
| T-SPLASH-05 | No scroll during splash | During opening, try to scroll | Page does not scroll |

---

## 6. Roadmap & Navigation

### Requirements

| ID | Requirement |
|----|-------------|
| ROAD-01 | After login, the roadmap view displays all module items as numbered circle nodes on a snaking path |
| ROAD-02 | Completed items appear in gray/light style and are non-interactive |
| ROAD-03 | The current (active) item pulses with animation and is tappable |
| ROAD-04 | Future items appear locked (grayed out, non-interactive) |
| ROAD-05 | The header shows: Exit button (left), Help (center-left), Leaderboard trophy (center-right), Points (right) |
| ROAD-06 | Tapping the active node transitions to the playing phase with a 320ms closing animation |
| ROAD-07 | After completing an item, the roadmap shows a points-roll animation (from old total to new total, 2200ms) |
| ROAD-08 | Theme decorations display based on configured theme (nature: fish + clouds, ocean: fish + clouds, desert: tumbleweeds) |
| ROAD-09 | Nodes alternate in layout: rows of 2 then rows of 1, creating a snaking path |
| ROAD-10 | An item flagged `revisitable` in the activity stays tappable after completion and renders brighter (saturated fill + light ring) than a normal completed node |
| ROAD-11 | Re-entering a revisitable item is read-only: no score is awarded, no progress is saved, and leaving returns to the roadmap at the real progress index |
| ROAD-12 | An item locked by the manager (`lockedFromIndex`) shows a lock badge and is not tappable even when `revisitable` |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-ROAD-01 | Initial roadmap | Complete login, view roadmap | All items visible; first item pulsing; rest locked |
| T-ROAD-02 | Tap active node | Tap the pulsing active node | Transitions to playing phase with animation |
| T-ROAD-03 | Completed node | Complete a game, return to roadmap | Completed node is gray; next node now pulsing |
| T-ROAD-04 | Points roll | Complete a game with score > 0, return to roadmap | Points counter animates from old to new total |
| T-ROAD-05 | Locked node tap | Tap a locked (future) node | Nothing happens |
| T-ROAD-06 | Theme decorations | Open activity with nature theme | Fish and cloud decorations visible |
| T-ROAD-07 | Re-entry node style | Complete an item flagged Re-entry, return to roadmap | Its node is visibly brighter/ringed vs other completed nodes |
| T-ROAD-08 | Re-entry replay | Tap the completed re-entry node, finish the item again | Returns to the roadmap; total points unchanged; the active item is still the real next one |
| T-ROAD-09 | Re-entry vs manager lock | Lock the activity from an index at or below that item, tap it | Nothing happens; lock badge shown |

---

## 7. Guidelines Popup

### Requirements

| ID | Requirement |
|----|-------------|
| GUIDE-01 | On first roadmap entry, a guidelines popup appears over the roadmap |
| GUIDE-02 | Popup has a title, mission section, guidelines/rules section, and a "START NOW!" button |
| GUIDE-03 | If custom guidelines are configured, a collapsible section appears with pin icon |
| GUIDE-04 | Dismissing the popup (X button or START NOW!) marks it as seen; it doesn't appear again on re-entry |
| GUIDE-05 | Dismissed state is stored in sessionStorage |
| GUIDE-06 | Popup has pop-in animation (scale + rotate) and star bullet animations |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-GUIDE-01 | First entry | Login and enter activity | Guidelines popup appears over roadmap |
| T-GUIDE-02 | Dismiss via button | Click "START NOW!" | Popup closes, roadmap fully interactive |
| T-GUIDE-03 | Dismiss via X | Click X button | Popup closes |
| T-GUIDE-04 | No re-display | Dismiss popup, exit and re-enter activity | Popup does NOT appear again |
| T-GUIDE-05 | Custom guidelines | Activity with custom guideline text | Collapsible section shown with custom content |

---

## 8. Stations — Text

### Requirements

| ID | Requirement |
|----|-------------|
| STEXT-01 | Displays station name as a large bold title (22px, weight 800) |
| STEXT-02 | If description exists, displays it below or above content (based on descPosition) |
| STEXT-03 | Content from `settings.content` is rendered in a styled window |
| STEXT-04 | A fixed "Continue" button appears at the bottom |
| STEXT-05 | Clicking Continue advances to the next item (no score recorded) |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-STEXT-01 | Basic display | Open a text station | Title, description, and content all visible |
| T-STEXT-02 | Continue button | Click Continue | Returns to roadmap, advances to next item |
| T-STEXT-03 | No score | Complete text station, check points | Points unchanged |

---

## 9. Stations — Video

### Requirements

| ID | Requirement |
|----|-------------|
| SVID-01 | Displays station name as title |
| SVID-02 | Plays video from `settings.mediaUrl` with HTML5 video player (controls, autoplay) |
| SVID-03 | After video ends, a replay overlay button appears |
| SVID-04 | Clicking replay resets video to start and plays again |
| SVID-05 | If `descPosition === 'before'` (default), description appears above video |
| SVID-06 | If `descPosition === 'after'`, description appears below video |
| SVID-07 | The Continue button is **disabled until the video finishes playing** (fires `onEnded`). Its label shows "Watch the video to continue" / "צפו בסרטון עד הסוף כדי להמשיך" while disabled, then reverts to "Continue". |
| SVID-08 | Embedded players (YouTube/Vimeo `iframe` sources) cannot report an end event, so Continue stays enabled for them (no reliable gating possible). |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SVID-01 | Video plays | Open a video station | Video autoplays with controls visible |
| T-SVID-02 | Replay | Let video end, click replay button | Video restarts from beginning |
| T-SVID-03 | Desc before (default) | Open video station with descPosition=before | Description text above video player |
| T-SVID-04 | Desc after | Open video station with descPosition=after | Description text below video player |
| T-SVID-05 | Continue gated | Open a direct-file (non-iframe) video station | Continue is disabled and shows the "watch to continue" label; it becomes enabled only after the video reaches its end |
| T-SVID-06 | Continue (iframe) | Open a video station whose mediaUrl is a YouTube/Vimeo link | Continue is enabled immediately (iframe end can't be detected) |

---

## 10. Stations — Image

### Requirements

| ID | Requirement |
|----|-------------|
| SIMG-01 | Displays station name as title |
| SIMG-02 | Shows image from `settings.mediaUrl` |
| SIMG-03 | If `descPosition === 'before'` (default), description appears above image |
| SIMG-04 | If `descPosition === 'after'`, description appears below image |
| SIMG-05 | A fixed Continue button allows advancing |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SIMG-01 | Image display | Open an image station | Title visible, image loads correctly |
| T-SIMG-02 | Desc before | Open image station with descPosition=before | Description above image |
| T-SIMG-03 | Desc after | Open image station with descPosition=after | Description below image |
| T-SIMG-04 | Continue | Click Continue | Advances to next item |

---

## 11. Stations — Narrative

### Requirements

| ID | Requirement |
|----|-------------|
| SNAR-01 | Custom multi-screen narrative experience renders via NarrativeStation component |
| SNAR-02 | Station name displayed as title |
| SNAR-03 | Has its own internal navigation (screens/pages) |
| SNAR-04 | Supports optional hint (with 5-point penalty) |
| SNAR-05 | Clicking final CTA advances to next item |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SNAR-01 | Display | Open a narrative station | Custom narrative experience loads |
| T-SNAR-02 | Navigate screens | Interact with narrative | Can progress through narrative screens |
| T-SNAR-03 | Continue | Complete narrative, click CTA | Advances to next item |

---

## 12. Stations — Badge

### Requirements

| ID | Requirement |
|----|-------------|
| SBADGE-01 | Displays a badge/achievement visual with title, subtitle, and icon image |
| SBADGE-02 | Supports optional hint (with 5-point penalty) |
| SBADGE-03 | Has Continue button to advance |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SBADGE-01 | Display | Open a badge station | Badge image, title, subtitle visible |
| T-SBADGE-02 | Continue | Click Continue | Advances to next item |

---

## 13. Stations — Collage

### Requirements

| ID | Requirement |
|----|-------------|
| SCOLL-01 | Full-screen collage layout (no standard header overlay) |
| SCOLL-02 | Renders CollageStation component with activity code |
| SCOLL-03 | Shows header text, description, and array of mission items |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SCOLL-01 | Display | Open a collage station | Full-screen collage of missions/achievements |
| T-SCOLL-02 | Advance | Complete collage interaction | Returns to roadmap |

---

## 14. Stations — Feedback

### Requirements

| ID | Requirement |
|----|-------------|
| SFEED-01 | Displays a survey/rating interface with 6-level rating scale |
| SFEED-02 | Shows configured questions as rating items |
| SFEED-03 | If notes enabled, shows a text area for open-ended feedback |
| SFEED-04 | On submit, saves `FeedbackResult` with answers array, notes, and averageRating |
| SFEED-05 | Metadata includes `feedbackType`, answers, notes, averageRating |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SFEED-01 | Display | Open a feedback station | Rating questions visible with 6-level scale |
| T-SFEED-02 | Rate and submit | Select ratings for all questions, submit | Feedback saved, advances to next item |
| T-SFEED-03 | Notes field | Open feedback station with notes enabled | Text area visible for additional comments |

---

## 15. Order Game

### Requirements

| ID | Requirement |
|----|-------------|
| ORD-01 | Players see shuffled cards that must be reordered into the correct sequence |
| ORD-02 | Cards display order numbers (1, 2, 3…) and a drag handle indicator (⠇) |
| ORD-03 | Users can drag cards vertically to swap positions; fallback: tap two cards to swap |
| ORD-04 | Shuffled order is guaranteed to differ from the correct order |
| ORD-05 | Supports multiple rounds, each with optional title and different card sets |
| ORD-06 | On check: correct order → applause sound + green checkmark + points badge; wrong order → fail sound + red borders on incorrect cards |
| ORD-07 | First correct attempt awards `firstAttemptPoints` (default 100); subsequent correct awards `retryPoints` (default 50) |
| ORD-08 | Optional per-round countdown timer; when expired, auto-submits current order |
| ORD-09 | Timer shows "Time Left: Xs"; turns critical (visual change) at <= 10 seconds |
| ORD-10 | After all rounds, optional golf challenge mini-game with physics-based ball throwing |
| ORD-11 | Golf bonus = remaining_hits × 5 (max 7 hits, max 35 bonus points) |
| ORD-12 | Speed bonus: optional additional points based on completion time |
| ORD-13 | Hint penalty: -5 points if hint used |
| ORD-14 | Finish screen shows final score in a decorative tree-ring stump |
| ORD-15 | After feedback, auto-advances to next round after 1.5s |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-ORD-01 | Cards shuffled | Start order game | Cards displayed in shuffled order (not correct order) |
| T-ORD-02 | Drag reorder | Drag a card to a new position | Cards swap positions smoothly |
| T-ORD-03 | Tap-to-swap | Tap card A, then tap card B | Cards A and B swap positions |
| T-ORD-04 | Correct first attempt | Arrange in correct order, check | Applause sound, green check, full points (firstAttemptPoints) awarded |
| T-ORD-05 | Wrong attempt | Submit incorrect order, then correct it | Fail sound, red borders on wrong cards; second attempt awards retryPoints |
| T-ORD-06 | Timer expiry | Let timer run to 0 | Auto-submits current order; treated as an attempt |
| T-ORD-07 | Timer warning | Watch timer count down to 10s | Timer display turns critical (visual change) |
| T-ORD-08 | Multiple rounds | Game with 3 rounds | Each round shows different cards; advances between rounds |
| T-ORD-09 | Golf challenge | Complete all rounds (golf enabled) | Golf mini-game appears; ball physics work; bonus calculated |
| T-ORD-10 | Skip golf | Click skip in golf challenge | Golf skipped, 0 bonus points, finish screen shown |
| T-ORD-11 | Hint usage | Click "Use Hint", confirm penalty | Hint text shown; -5 points applied to final score |
| T-ORD-12 | Final score | Complete game | Score = sum of round scores + golf bonus - hint penalty (if any) |

---

## 16. Trivia Game

### Requirements

| ID | Requirement |
|----|-------------|
| TRV-01 | Multiple-choice questions presented one at a time in a 2×2 answer grid |
| TRV-02 | Supports single or multiple correct answers per question |
| TRV-03 | Answers can be shuffled randomly (default: on) |
| TRV-04 | Optional question media (image) displayed below question text |
| TRV-05 | Correct answer: `correctAnswerPoints` per correct answer selected (default 10) |
| TRV-06 | Wrong answer: `wrongAnswerPenalty` deducted per wrong answer selected (default 0) |
| TRV-07 | Score per question cannot go below 0 |
| TRV-08 | Per-question countdown timer; expired = auto-submit (0 selections = wrong) |
| TRV-09 | Feedback toast (1s): "Correct ✓ +X points" (green), "Partially Correct" (orange), "Incorrect ✗" (red) |
| TRV-10 | After feedback, auto-advances to next question after 5s total |
| TRV-11 | Explanation text shown after checking answer (for selected/correct answers with explanations) |
| TRV-12 | Two lifeline helpers (if enabled): "1/2" (leaves 2 answers) and "3/4" (leaves 3 answers) |
| TRV-13 | Each lifeline usable once per game; preserves all correct answers |
| TRV-14 | Finish screen: total score, accuracy %, correct count / total |
| TRV-15 | Hint penalty: -5 points if hint used |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-TRV-01 | Single correct answer | Select the correct answer, submit | "Correct ✓ +10 points" toast, score increases |
| T-TRV-02 | Wrong answer | Select wrong answer, submit | "Incorrect ✗" toast, no points (or penalty if configured) |
| T-TRV-03 | Multi-select partial | Select 1 of 2 correct answers | "Partially Correct" toast, partial points |
| T-TRV-04 | Timer expiry | Let per-question timer reach 0 | "Time Up!" message, treated as wrong answer |
| T-TRV-05 | Lifeline 1/2 | Click 1/2 button | Half of wrong answers hidden; correct answers remain |
| T-TRV-06 | Lifeline 3/4 | Click 3/4 button | Only 3 answers remain (all correct + some wrong) |
| T-TRV-07 | Lifeline single use | Use 1/2 lifeline, check if usable again | 1/2 button disabled for rest of game |
| T-TRV-08 | Explanation display | Answer a question that has explanations | Explanation text appears after feedback |
| T-TRV-09 | Shuffled answers | Play same question twice (new session) | Answer positions may differ |
| T-TRV-10 | Question media | Question with image configured | Image displayed below question text |
| T-TRV-11 | Auto-advance | Answer a question | After ~5s, automatically moves to next question |
| T-TRV-12 | Finish screen | Complete all questions | Score, accuracy %, correct/total displayed |

---

## 17. Puzzle Game

### Requirements

| ID | Requirement |
|----|-------------|
| PUZ-01 | Jigsaw-style puzzle: answer questions correctly to reveal puzzle pieces |
| PUZ-02 | Puzzle image split into configurable grid (cols × rows) |
| PUZ-03 | Correct answer reveals a random unrevealed piece; wrong answer queues the question for retry |
| PUZ-04 | Reveal overlay (3s): shows full puzzle grid with revealed pieces visible, unrevealed as "?", just-revealed highlighted |
| PUZ-05 | Piece counter shows "X / total" during reveal |
| PUZ-06 | Wrong answers are reshuffled and re-presented in subsequent rounds |
| PUZ-07 | Game completes when all pieces are revealed |
| PUZ-08 | Scoring: `basePoints` + `speedBonusMax × (remainingTime / totalTime)` |
| PUZ-09 | Overall game timer tracks elapsed time for speed bonus calculation |
| PUZ-10 | Optional per-question countdown (default 10s); expired = wrong answer |
| PUZ-11 | Finish screen: score, accuracy %, time elapsed (MM:SS), completed puzzle image |
| PUZ-12 | Hint penalty: -5 points |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-PUZ-01 | Correct answer | Select correct answer | 3s reveal overlay; one new piece visible; piece counter +1 |
| T-PUZ-02 | Wrong answer | Select wrong answer | "Incorrect" toast; question added to retry queue |
| T-PUZ-03 | Retry queue | Answer wrong, continue | Same question reappears in a later round |
| T-PUZ-04 | All pieces revealed | Answer all questions correctly | Game complete; finish screen with full puzzle |
| T-PUZ-05 | Speed bonus | Complete puzzle quickly vs slowly | Faster completion yields higher bonus |
| T-PUZ-06 | Per-question timer | Let question timer expire | Counts as wrong answer |
| T-PUZ-07 | Reveal overlay | Answer correctly | Full grid visible with "?" on unrevealed, highlighted on just-revealed |
| T-PUZ-08 | Accuracy tracking | Mix correct and wrong answers | Accuracy = correct / totalAttempts × 100% |

---

## 18. True/False Game

### Requirements

| ID | Requirement |
|----|-------------|
| TF-01 | Boolean statements presented one at a time with two large buttons: False (✗) and True (✓) |
| TF-02 | Optional 3-2-1 countdown before first statement (configurable, default on) |
| TF-03 | Per-statement countdown timer; large circular digit display |
| TF-04 | Timer turns red/critical at <= 3 seconds |
| TF-05 | Timer expiry auto-submits as wrong answer |
| TF-06 | Correct: green circle with checkmark on button + "Correct +X points" overlay |
| TF-07 | Wrong: red circle with X on selected button + green checkmark reveals correct button |
| TF-08 | Feedback overlay rendered to `document.body` (portal) to avoid layout shifts |
| TF-09 | Auto-advance to next statement after feedback (default 1500ms) |
| TF-10 | Scoring: `correctPoints` per correct (default 10), `wrongPenalty` per wrong (default 0), minimum 0 |
| TF-11 | Finish screen: score, accuracy %, correct count / total, tree-ring stump decoration |
| TF-12 | Hint button visibility set to `hidden` (not removed) after answering to preserve layout |
| TF-13 | Supports multiline game title (split on \n) |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-TF-01 | Countdown | Start true/false game with countdown enabled | 3-2-1 countdown animation before first statement |
| T-TF-02 | Correct answer | Tap True when statement is true | Green checkmark on True button, "Correct +10 points" overlay |
| T-TF-03 | Wrong answer | Tap True when statement is false | Red X on True button, green check appears on False button |
| T-TF-04 | Timer expiry | Let timer reach 0 | "Time Up!" overlay, counts as wrong |
| T-TF-05 | Timer critical | Watch timer at 3 seconds | Timer display turns red/critical |
| T-TF-06 | Auto-advance | Answer a statement | After ~1.5s, next statement appears |
| T-TF-07 | No layout shift | Answer while hint button visible | Layout does not jump (button hidden, not removed) |
| T-TF-08 | Finish screen | Complete all statements | Score and accuracy displayed in stump decoration |

---

## 19. Ball Game

### Requirements

| ID | Requirement |
|----|-------------|
| BALL-01 | Legacy Phaser-based game runs inside an iframe |
| BALL-02 | Host sends `BALLGAME_INIT` message with question configs, time limits, language |
| BALL-03 | Init message resent at 250ms and 700ms to ensure delivery |
| BALL-04 | Game sends `BALLGAME_PROGRESS` with score/time periodically |
| BALL-05 | Game sends `BALLGAME_DETAILED` for each question answered |
| BALL-06 | Game sends `BALLGAME_COMPLETE` with full score report on finish |
| BALL-07 | `BALLGAME_BACK` sent if player exits early |
| BALL-08 | Mute toggle via custom event `yooz:ballgame-audio-toggle` dispatched to iframe |
| BALL-09 | Wrapper finish screen shows final score in stump decoration + accuracy |
| BALL-10 | Score derived from legacy `scoreReport.gameScore`; max ~100 + (questions × 2) |
| BALL-11 | No hint support (hintUsed always false) |
| BALL-12 | Full-screen layout with fixed header overlay |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-BALL-01 | Game loads | Open a ball game | Iframe loads, Phaser game initializes |
| T-BALL-02 | Questions display | Play through game | Questions appear as multiple-choice in game |
| T-BALL-03 | Score report | Complete all questions | Wrapper finish screen shows score + accuracy |
| T-BALL-04 | Mute toggle | Click mute button in header | Game audio mutes/unmutes |
| T-BALL-05 | Early exit | Exit game mid-play | BALLGAME_BACK message sent; partial result recorded |

---

## 20. Trash Sort Game

### Requirements

| ID | Requirement |
|----|-------------|
| TRASH-01 | Items fall from top of screen with linear animation (configurable `fallSpeedMs`, default 3000ms) |
| TRASH-02 | User drags items into correct bins at bottom of screen |
| TRASH-03 | Correct sort: bin flashes green (500ms), `correctPoints` awarded (default 10), correct sound |
| TRASH-04 | Wrong sort: bin flashes red (500ms), 0 points, wrong sound |
| TRASH-05 | Missed item (reaches bottom without sorting): counts as wrong |
| TRASH-06 | 3-2-1 countdown before game starts (configurable `countdownSeconds`, default 3) |
| TRASH-07 | Tutorial screen displayed first with instructions and "Got It" button |
| TRASH-08 | While dragging, a ghost copy of the item follows the cursor |
| TRASH-09 | Preview of upcoming items shown above drop zone |
| TRASH-10 | Live score counter visible during gameplay |
| TRASH-11 | No hint support, no negative scores |
| TRASH-12 | Finish screen: title, description, final score |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-TRASH-01 | Tutorial | Start trash sort game | Instructions screen shown with "Got It" button |
| T-TRASH-02 | Countdown | Click "Got It" | 3-2-1 countdown before items start falling |
| T-TRASH-03 | Correct sort | Drag item to correct bin | Green flash, score increases by correctPoints |
| T-TRASH-04 | Wrong sort | Drag item to wrong bin | Red flash, score unchanged |
| T-TRASH-05 | Missed item | Let item fall to bottom | Counts as wrong, advances to next item |
| T-TRASH-06 | Drag ghost | Start dragging an item | Ghost image follows cursor |
| T-TRASH-07 | All items sorted | Sort all items | Finish screen appears with final score |
| T-TRASH-08 | Score counter | Sort items during play | Live score updates visible |

---

## 21. Hint System (Shared)

### Requirements

| ID | Requirement |
|----|-------------|
| HINT-01 | Available for games (Order, Trivia, Puzzle, True/False) and some stations (Narrative, Badge) if `hint.enabled === true` |
| HINT-02 | Not available for Ball Game or Trash Sort |
| HINT-03 | Button label: "Use Hint" (before use), "Show Hint" (after use) |
| HINT-04 | First click: warning modal appears disclosing -5 point penalty |
| HINT-05 | User must confirm to use hint; cancel returns without penalty |
| HINT-06 | After confirmation: `hintUsed = true`; hint text displayed in modal with lightbulb icon |
| HINT-07 | Subsequent clicks show hint text directly (no re-confirmation) |
| HINT-08 | Penalty applied at game end: `Math.max(0, score - 5)` |
| HINT-09 | Hint usage recorded in report: `hintUsed: true, hintPenalty: 5` |
| HINT-10 | Modals lock page scroll (`overflow: hidden`) and restore on close |
| HINT-11 | One hint per game instance; station hints tracked per item index in `stationHintUsed` set |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-HINT-01 | Warning modal | Click "Use Hint" | Warning modal: "Using a hint will reduce your score by 5 points" |
| T-HINT-02 | Cancel hint | Click cancel on warning | No penalty, hint not used, button still says "Use Hint" |
| T-HINT-03 | Confirm hint | Click confirm on warning | Hint text displayed; button changes to "Show Hint" |
| T-HINT-04 | Re-view hint | Click "Show Hint" after using | Hint text re-displayed (no extra penalty) |
| T-HINT-05 | Score penalty | Use hint, complete game | Final score reduced by 5 points |
| T-HINT-06 | Zero floor | Use hint when score < 5 | Score is 0 (not negative) |
| T-HINT-07 | No scroll during modal | Open hint modal | Page cannot scroll |
| T-HINT-08 | Hint in report | Use hint, check saved report | `hintUsed: true, hintPenalty: 5` in item result |

---

## 22. Sound System

### Requirements

| ID | Requirement |
|----|-------------|
| SND-01 | `useGameSounds` hook manages correct, wrong, gameOver, and bgMusic audio elements |
| SND-02 | Default sounds: `/sounds/correct.mp3`, `/sounds/wrong.mp3`, `/sounds/Gameover.mp3`, `/sounds/GameBg.mp3` |
| SND-03 | Game-specific overrides supported (e.g., Trivia uses `correct1.mp3`, `fail.wav`, `background-music.mp3`) |
| SND-04 | SFX volume: 70%; Background music volume: 30% |
| SND-05 | Background music loops continuously during gameplay |
| SND-06 | Mute toggle pauses background music and suppresses all SFX |
| SND-07 | Unmuting resumes background music |
| SND-08 | SFX playback resets `currentTime = 0` before play (allows rapid consecutive plays) |
| SND-09 | Audio elements cleaned up on component unmount |
| SND-10 | Errors from browser autoplay restrictions are silently caught |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SND-01 | Correct sound | Answer correctly in a game | Correct sound plays |
| T-SND-02 | Wrong sound | Answer incorrectly | Wrong sound plays |
| T-SND-03 | Game over sound | Finish a game | Game over sound plays |
| T-SND-04 | Background music | Start playing a game | Background music loops at low volume |
| T-SND-05 | Mute all | Click mute button | Background music pauses, SFX don't play |
| T-SND-06 | Unmute | Click mute button again | Background music resumes |
| T-SND-07 | Rapid SFX | Answer correctly multiple times quickly | Each correct sound plays without overlap issues |

---

## 23. Scoring & Progress Saving

### Requirements

| ID | Requirement |
|----|-------------|
| SCORE-01 | After each game/station completes, an incremental save is sent: `PATCH /api/activities/{code}/progress` |
| SCORE-02 | Payload includes: `itemResult` (index, type, score, maxPossible, duration, hints, questionAnswers, metadata), `totalItemsCompleted`, `lastActiveItemIndex`, `runningTotal` |
| SCORE-03 | On activity completion, final save: `POST /api/activities/{code}/scores` with `{ scores: [{gameName, score}], sessionDurationMs }` |
| SCORE-04 | Client-side session stored in sessionStorage key `yooz_session_{code}` |
| SCORE-05 | Session state includes: currentItemIndex, scores, phase, shownPopupIds, stationHintUsed, guidelinesDismissed, scoresSaved |
| SCORE-06 | On page refresh, session restored from sessionStorage first; if not found, fetched from server (`GET /api/activities/{code}/my-progress`) |
| SCORE-07 | Score per game type: Order (firstAttempt/retry + golf + speed), Trivia (correctPts × correct - wrongPenalty × wrong), Puzzle (base + speed), T/F (correctPts × correct - wrongPenalty × wrong), Ball (legacy score), Trash (correctPts × correct) |
| SCORE-08 | All scores capped at minimum 0 |
| SCORE-09 | Station hints tracked in `stationHintUsed` set; total penalty = set.size × 5 |
| SCORE-10 | Final total includes a "Hint Penalty" entry: `{ gameName: 'Hint Penalty', score: -totalPenalty }` |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SCORE-01 | Incremental save | Complete a game, check network tab | PATCH request to `/progress` with itemResult |
| T-SCORE-02 | Final save | Reach finish screen | POST request to `/scores` with all game scores |
| T-SCORE-03 | Session persistence | Complete 2 items, refresh page | Resumes at item 3 with correct scores |
| T-SCORE-04 | Server resume | Clear sessionStorage, refresh | Fetches progress from server; resumes correctly |
| T-SCORE-05 | Hint penalty in final | Use hints in 2 stations | Final scores include `{ gameName: 'Hint Penalty', score: -10 }` |
| T-SCORE-06 | Score floor | Earn 3 points, use hint (-5) | Final score is 0 (not -2) |
| T-SCORE-07 | Running total | Complete games with scores 50, 30, 20 | Running total: 50, 80, 100 displayed in header |

---

## 24. Leaderboard

### Requirements

| ID | Requirement |
|----|-------------|
| LB-01 | Accessible via trophy icon button on roadmap header |
| LB-02 | Fetches data from `GET /api/activities/{code}/leaderboard` |
| LB-03 | Displays ranked list sorted by `totalScore` descending |
| LB-04 | Top 3 get gold hexagon badges; others get white/silver |
| LB-05 | Current participant's row highlighted with brighter card and border |
| LB-06 | Scores formatted to max 1 decimal place (e.g., 315.6) |
| LB-07 | Purple gradient background with sparkle animations |
| LB-08 | RTL-aware layout (Hebrew support) |
| LB-09 | Shows loading and empty states |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-LB-01 | Open leaderboard | Click trophy icon on roadmap | Leaderboard view appears with ranked players |
| T-LB-02 | Top 3 styling | View leaderboard with 5+ players | Top 3 have gold hexagon badges |
| T-LB-03 | Current user highlight | View leaderboard after playing | Your row is highlighted |
| T-LB-04 | Score format | Player with score 315.65999 | Displayed as "315.6" |
| T-LB-05 | Empty state | Activity with no participants | Empty state message shown |

---

## 25. Finish Page

### Requirements

| ID | Requirement |
|----|-------------|
| FIN-01 | Purple gradient background (#5c1a9e to #1e0050) with confetti animation (60 pieces) |
| FIN-02 | Ribbon title: "LESSON COMPLETE!" |
| FIN-03 | If activity has scores: large yellow badge (120×120) with score number + "Points" label |
| FIN-04 | If no scores: yellow badge with checkmark icon |
| FIN-05 | 3 statistics cards animate in sequence: Items completed, Points/Stars, Completion status ("Done!") |
| FIN-06 | "CONTINUE ADVENTURE" button → view leaderboard |
| FIN-07 | "STAY HERE" button → reset countdown, remain |
| FIN-08 | "EXIT" button → logout and return to `/play/{code}` |
| FIN-09 | Auto-exit countdown starts at 90 seconds; displays "Auto exit in Xs" |
| FIN-10 | Countdown pauses while viewing leaderboard; resumes on return |
| FIN-11 | When countdown reaches 0, auto-exits (handleExit) |
| FIN-12 | Final scores submitted to server on entering finish phase |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-FIN-01 | Confetti | Complete activity | Confetti animation plays on finish screen |
| T-FIN-02 | Score badge | Complete activity with scores | Yellow badge shows total score |
| T-FIN-03 | Stats cards | View finish screen | 3 cards animate in: items, points, status |
| T-FIN-04 | Continue to leaderboard | Click "CONTINUE ADVENTURE" | Leaderboard view opens |
| T-FIN-05 | Stay here | Click "STAY HERE" | Countdown resets to 90s |
| T-FIN-06 | Exit | Click "EXIT" | Logged out, returned to `/play/{code}` |
| T-FIN-07 | Auto-exit | Wait 90 seconds on finish screen | Auto-exited to play page |
| T-FIN-08 | Countdown pause | Open leaderboard from finish | Countdown pauses; resumes when returning |
| T-FIN-09 | No-score activity | Complete activity with only stations | Checkmark badge shown instead of score |

---

## 26. Continuous Activity & Logout

### Requirements

| ID | Requirement |
|----|-------------|
| CONT-01 | Activities marked `isContinuous: true` with a `portalId` require portal credentials |
| CONT-02 | Normal activities: exit button navigates to `/play/{code}`, clears session, calls `logout()` |
| CONT-03 | Continuous activities (not in finish phase): exit shows confirmation dialog |
| CONT-04 | Confirmation dialog: "Are you sure? All data will be lost." with Cancel / "Yes, exit" buttons |
| CONT-05 | If confirmed: `DELETE /api/activities/{code}/my-report` (fire-and-forget), clear sessionStorage, redirect, logout |
| CONT-06 | If cancelled: remain in activity, nothing changes |
| CONT-07 | On finish phase: continuous activity logout does NOT delete data (normal save has already occurred) |
| CONT-08 | `logout()` removes `yooz_token` and all `yooz_session_*` entries from sessionStorage |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-CONT-01 | Normal exit | Exit a non-continuous activity | Immediately navigated to play page, session cleared |
| T-CONT-02 | Continuous exit mid-game | Exit a continuous activity during playing | Confirmation dialog appears |
| T-CONT-03 | Confirm exit | Click "Yes, exit" on dialog | Report deleted, session cleared, navigated to play page |
| T-CONT-04 | Cancel exit | Click "Cancel" on dialog | Dialog closes, game continues |
| T-CONT-05 | Exit on finish | Exit continuous activity from finish screen | Normal logout (no confirmation, data preserved) |
| T-CONT-06 | Report deleted | Confirm exit, check server | No report exists for this participant |

---

## 27. Help Chat (AI)

### Requirements

| ID | Requirement |
|----|-------------|
| HELP-01 | Help chat accessible as floating action button (fab) or header button |
| HELP-02 | Initial menu: 3 FAQ buttons + "Ask something else" |
| HELP-03 | FAQ topics: "How to get started?", "How are scores calculated?", "How do hints work?" |
| HELP-04 | FAQ responses are pre-written and displayed with typing animation |
| HELP-05 | Custom questions: two-tier system — Tier 1: server AI (POST `/api/help` → Gemini); Tier 2: client-side keyword matcher |
| HELP-06 | Keyword matcher covers 13 topics with 40+ keywords per language (en/he) |
| HELP-07 | Confidence threshold: 0.2; below threshold → generic support response |
| HELP-08 | Support contact info displayed (phone number) |
| HELP-09 | Auto-hidden during Ball Game (prevents interference) |
| HELP-10 | Chat resets when closed |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-HELP-01 | Open help | Click help button | Chat panel appears with 3 FAQ + "Ask something else" |
| T-HELP-02 | FAQ response | Click "How are scores calculated?" | Pre-written response appears with typing animation |
| T-HELP-03 | Custom question | Type "How do I login?" | AI or keyword-matched response about login |
| T-HELP-04 | Fallback response | Type random gibberish | Generic support response shown |
| T-HELP-05 | Hidden in Ball Game | Enter Ball Game | Help chat button disappears |
| T-HELP-06 | Chat reset | Open chat, ask question, close, reopen | Chat starts fresh (menu screen) |

---

## 28. Popup Messages

### Requirements

| ID | Requirement |
|----|-------------|
| POP-01 | Popups configured with trigger points: `afterLogin`, `beforeItem`, `afterItem`, `endOfActivity` |
| POP-02 | Each popup has: title, contentType (text/image), text/image content, optional includeUsername |
| POP-03 | `afterLogin` popups shown after entering roadmap for first time |
| POP-04 | `beforeItem` popups shown before entering specific item (by itemIndex) |
| POP-05 | `afterItem` popups shown after completing specific item |
| POP-06 | `endOfActivity` popups shown before transitioning to finish phase |
| POP-07 | Popups queue one-by-one; each must be dismissed before the next appears |
| POP-08 | Shown popup IDs tracked in `shownPopupIds` set; never re-shown |
| POP-09 | After all popups dismissed, pending action (if any) is executed |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-POP-01 | afterLogin popup | Login to activity with afterLogin popup configured | Popup appears on roadmap entry |
| T-POP-02 | beforeItem popup | Navigate to item with beforeItem popup | Popup appears before playing phase |
| T-POP-03 | afterItem popup | Complete item with afterItem popup | Popup appears after returning to roadmap |
| T-POP-04 | endOfActivity popup | Complete last item | Popup appears before finish screen |
| T-POP-05 | Queue behavior | Configure 2 afterLogin popups | First popup shown; dismiss reveals second |
| T-POP-06 | No re-display | Dismiss popup, re-enter activity | Same popup does NOT appear again |

---

## 29. Admin — Activity Creation

### Requirements

| ID | Requirement |
|----|-------------|
| ADMIN-01 | Activity creation is a multi-step form |
| ADMIN-02 | **Step 1 — Basic Config:** Activity name (required), login fields (name/email/phone checkboxes), connection type (single/group/portal), optional group names, Google email sync toggle |
| ADMIN-03 | **Step 2 — Module Config:** Module type (story/mission/continuous), item selection via 3 tabs (Games/Stations/Missions), drag-to-reorder selected items, search/filter, group assignment per item |
| ADMIN-04 | Opening type selectable (none/url/email/custom) |
| ADMIN-05 | Scheduling: "Always open" checkbox (default on); unchecking reveals start/end datetime inputs |
| ADMIN-06 | Popup messages: array of configurable popups with trigger points |
| ADMIN-07 | Custom guidelines: title, mission items, guideline items, button text |
| ADMIN-08 | Continuous activity: checkbox to enable + portal dropdown selector; sends `isContinuous` and `portalId` |
| ADMIN-09 | Validation: activity name required, at least 2 items, unique group names |
| ADMIN-10 | Submit: POST (create) or PUT (update) to `/api/admin/activities` |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-ADMIN-01 | Create activity | Fill all required fields, add 3 items, submit | Activity created, redirected to dashboard |
| T-ADMIN-02 | Validation — no name | Leave name empty, try to submit | Validation error shown |
| T-ADMIN-03 | Validation — < 2 items | Select only 1 item | Cannot proceed to submit |
| T-ADMIN-04 | Group config | Select group connection type | Group name inputs appear; can add/remove groups |
| T-ADMIN-05 | Scheduling | Uncheck "Always open", set dates | Start/end datetime inputs visible; saved correctly |
| T-ADMIN-06 | Continuous activity | Check continuous, select portal | `isContinuous` and `portalId` sent in payload |
| T-ADMIN-07 | Edit activity | Open existing activity for edit | All fields pre-populated with saved values |
| T-ADMIN-08 | Drag reorder | Drag item 3 above item 1 | Item order updates; saved in that order |
| T-ADMIN-09 | Search items | Type in search box | Games/stations filtered by name/description |

---

## 30. Admin — Game Configuration

### Requirements

| ID | Requirement |
|----|-------------|
| GCONF-01 | Shared fields: Name (required), Game Type (6 options), Description, Customer, Theme, Tags, Instructions, Hint toggle + text |
| GCONF-02 | **Order:** Rounds (title + ordered cards), scoring (firstAttemptPoints, retryPoints, speedBonus, timeLimitSeconds), golf challenge toggle |
| GCONF-03 | **Trivia:** Questions (text + hint + media + answers with isCorrect + explanation), scoring (correctAnswerPoints, wrongAnswerPenalty, timeLimitSeconds), shuffle toggle, helpers toggle |
| GCONF-04 | **Puzzle:** Puzzle image URL, grid cols/rows, questions (text + media + answers + per-question timer), scoring (basePoints, speedBonusMax, timeLimitSeconds), shuffle toggle |
| GCONF-05 | **True/False:** Statements (text + isTrue + media), scoring (correctPoints, wrongPenalty, timeLimitSeconds), countdown toggle, feedback duration |
| GCONF-06 | **Ball Game:** Questions (text + 4 answers each), scoring (timeLimitSeconds), max 10 questions |
| GCONF-07 | **Trash Sort:** Bins (label + color), items (label + imageUrl + correctBinId), scoring (correctPoints), countdownSeconds, fallSpeedMs |
| GCONF-08 | Random fill button (dice icon) auto-populates test data |
| GCONF-09 | Save: POST (create) or PUT (update) to `/api/admin/games` |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-GCONF-01 | Create trivia | Select Trivia type, add questions with answers, save | Game created with correct settings |
| T-GCONF-02 | Create order | Add rounds with cards, configure scoring | Rounds and scoring saved correctly |
| T-GCONF-03 | Create puzzle | Upload puzzle image, set grid 3×3, add 9 questions | Grid and questions saved |
| T-GCONF-04 | Create trash sort | Define 3 bins, add items with images, assign bins | Bins and items saved with correct mappings |
| T-GCONF-05 | Random fill | Click dice button | Fields populated with test data |
| T-GCONF-06 | Edit game | Open existing game | All settings pre-populated correctly |
| T-GCONF-07 | Hint configuration | Enable hint, enter hint text | Hint saved in settings.hint |
| T-GCONF-08 | Trivia multi-correct | Mark 2 answers as correct | Both saved as isCorrect: true |

---

## 31. Admin — Station Configuration

### Requirements

| ID | Requirement |
|----|-------------|
| SCONF-01 | Creatable types: Text, Video, Image, Collage, Feedback |
| SCONF-02 | Shared fields: Name (required), Type, Description, Customer, Theme, Tags |
| SCONF-03 | **Text:** Content text area |
| SCONF-04 | **Video:** Media URL + description position toggle (before/after) |
| SCONF-05 | **Image:** Media URL + description position toggle (before/after) |
| SCONF-06 | **Collage:** Header, description, missions array (add/remove) |
| SCONF-07 | **Feedback:** Title, intro text, questions array, notes toggle + placeholder |
| SCONF-08 | Hint available for Narrative and Badge types only |
| SCONF-09 | Description position toggle UI: two buttons "Before media" / "After media" |
| SCONF-10 | File upload available for media URLs |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SCONF-01 | Create text station | Select Text, enter name + content, save | Station created |
| T-SCONF-02 | Create video station | Select Video, enter media URL, set descPosition=after | Video URL and descPosition saved |
| T-SCONF-03 | Create image station | Select Image, upload image, set descPosition=before | Image URL and descPosition saved |
| T-SCONF-04 | Create feedback station | Add 3 questions, enable notes | Questions and notes config saved |
| T-SCONF-05 | Edit station | Open existing station | All fields pre-populated |
| T-SCONF-06 | Desc position toggle | Toggle between before/after | UI updates; saved value matches selection |

---

## 32. Admin — Statistics & Analytics

### Requirements

| ID | Requirement |
|----|-------------|
| STAT-01 | **Overview section:** Global KPI cards (total participants, completion rate, avg duration, avg score), timeline chart (participants/day for 30 days), activities table |
| STAT-02 | **Activity analytics — Overview tab:** Score distribution histogram (11 buckets: 0-10, 10-20, ..., 100+), per-activity KPIs |
| STAT-03 | **Activity analytics — Funnel tab:** 4-step funnel (Joined → Started → Halfway → Completed) with percentages |
| STAT-04 | **Activity analytics — Items tab:** Per-item stats table (avg score, completion %, hint usage %, avg duration) |
| STAT-05 | **Activity analytics — Groups tab:** Group comparison (avg score, completion rate, member count) sorted by score |
| STAT-06 | **Activity analytics — Export tab:** 3 export types (Participants, Scores, Progress) as Excel downloads |
| STAT-07 | **Anomaly detection:** Auto-flags items with low completion rates, unusual durations |
| STAT-08 | **Audit log:** Paginated admin action log (`GET /audit-log?page=1&limit=20`). Admin/super_admin only — the entry-point button is hidden for `customer` role and the endpoint returns 403 for them. |
| STAT-09 | All API endpoints under `/api/admin/analytics/` |
| STAT-10 | **Customer role scoping:** The `customer` role sees the Statistics tab and every analytics/report view (overview KPIs, timeline, activity analytics, participants roster, group comparison, exports), but **restricted to activities they created (`createdByEmail`) or manage (`managerEmail`)**. Backend enforces this on every analytics endpoint via `customerMongoFilter` / `customerOwnsDoc`; a customer requesting an activity they don't own gets 404. |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-STAT-01 | Global overview | Open statistics tab | KPI cards show correct totals; timeline chart renders |
| T-STAT-02 | Activity analytics | Select a specific activity | Score distribution and KPIs load for that activity |
| T-STAT-03 | Funnel view | Switch to Funnel tab | 4-step funnel with correct percentages displayed |
| T-STAT-04 | Item stats | Switch to Items tab | Table shows per-item metrics (score, completion, hints) |
| T-STAT-05 | Group comparison | View group tab for multi-group activity | Groups listed with avg scores and completion rates |
| T-STAT-06 | Export participants | Click export → Participants | Excel file downloads with participant data |
| T-STAT-07 | Export scores | Click export → Scores | Excel file downloads with score data |
| T-STAT-08 | Anomaly detection | View activity with items that have low completion | Anomaly warnings displayed |
| T-STAT-09 | Audit log | Check audit log section | Paginated list of admin actions (hidden entirely for customer role) |
| T-STAT-10 | Customer report scoping | Log in as a `customer`, open the Statistics tab | Only the customer's own/managed activities appear in overview totals, the activities list, and analytics; audit-log button is absent |

---

## 33. Groups — Self-Service (Day-Scoped)

Applies to group activities with `groupEntryMode === 'selfService'`, where participants
create/join their own groups (as opposed to admin-defined static group names on the
login screen). Backed by the `activity_groups` collection (`ActivityGroup` model) and
`/api/activities/:code/groups/*` routes.

### Requirements

| ID | Requirement |
|----|-------------|
| GRP-01 | A participant can create a group (`POST /:code/groups`); the group is stamped with `activityDay` = the Israel calendar day (YYYY-MM-DD) it was created on. |
| GRP-02 | **Groups are day-scoped.** A group is only visible/joinable on its own `activityDay`. On any later day it is treated as non-existent for creation, listing, name lookup, and invite links. |
| GRP-03 | Group name uniqueness is **per activity per day** (unique index `{activityId, activityDay, nameNormalized}`), so the same name can be reused on a different day. |
| GRP-04 | Groups are **never deleted** — previous days' documents (and all their reports) remain in the database for reporting/analytics. |
| GRP-05 | `GET /:code/groups/today` returns only groups whose `activityDay` is today (the join-screen picker list). |
| GRP-06 | `GET /:code/groups/check-name` and `/by-name` only consider today's groups — a name used only on a previous day reads as available/not-found today. |
| GRP-07 | `GET /:code/groups/by-token/:token` returns `410 Gone` when the invite link's group belongs to a previous day (link expires with its day). |
| GRP-08 | Group readiness (`getGroupStatus`: member count, min-members gate, completion) only counts participants who joined **today**, so a reused name doesn't inherit a previous day's members. |
| GRP-09 | A one-time startup migration (`migrateActivityGroups`) backfills `activityDay` on legacy groups from `createdAt` and drops the old global-unique index `{activityId, nameNormalized}`. |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-GRP-01 | Create + same-day join | Create group "Alpha" today, then open the join screen | "Alpha" appears in today's list and can be joined via name/link |
| T-GRP-02 | Next-day invisibility | Create "Alpha" on day 1; on day 2 open the join screen | "Alpha" is absent from today's list; by-name returns not-found; its invite link returns 410 |
| T-GRP-03 | Name reuse | On day 2, create a new group also named "Alpha" | Creation succeeds (no "name already taken"); it is independent of day-1 "Alpha" |
| T-GRP-04 | Reports preserved | After day rolls over, open Statistics → the day-1 activity's reports | Day-1 "Alpha" and its participant reports are still present in analytics/exports |
| T-GRP-05 | Member count scoping | Reuse name "Alpha" on day 2 with 1 member | Group status shows 1 member (not day-1 members) |

---

## 34. Stations — Riddle

### Requirements

| ID | Requirement |
|----|-------------|
| SRID-01 | Shows the riddle text with optional media and a per-character answer input |
| SRID-02 | The answer is graded by `/api/check-answer` (AI), so near-misses and spelling variants can still pass |
| SRID-03 | Score decays by attempt: attempt 1 = `maxScore` (default 100), attempt 2 = half, attempt 3 = a quarter |
| SRID-04 | After 3 wrong attempts the station ends with score 0 and `attempts: 3` |
| SRID-05 | With `unlimitedAttempts` on, there is no 3-attempt cut-off and the participant keeps guessing |
| SRID-06 | On success, shows the success screen (custom `successImageUrl` when set) and a continue button whose label can be overridden |
| SRID-07 | Riddle media opens fullscreen via the shared `ImageZoomOverlay` |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SRID-01 | First-try correct | Enter the exact answer | Success screen; full `maxScore` awarded |
| T-SRID-02 | Score decay | Answer wrong twice, then correctly | Score is a quarter of `maxScore` |
| T-SRID-03 | Attempt cut-off | Answer wrong 3 times | Station ends, 0 points, advances |
| T-SRID-04 | Unlimited attempts | Enable `unlimitedAttempts`, answer wrong 4+ times | Still able to guess; no forced end |
| T-SRID-05 | Fuzzy grading | Enter a correct answer with a typo / different phrasing | Accepted (AI grading) |
| T-SRID-06 | Media zoom | Tap the riddle image | Fullscreen overlay opens; tap again closes |

---

## 35. Stations — Avatar (AI Chat)

### Requirements

| ID | Requirement |
|----|-------------|
| SAVA-01 | Shows a character (name + image) and a free-text chat box; replies come from `/api/avatar-chat` (Gemini) in the configured persona |
| SAVA-02 | Optional TTS reads each reply aloud using the configured voice type |
| SAVA-03 | The Continue button stays **disabled until the participant has asked at least one question** |
| SAVA-04 | `forbiddenPhrases` are never produced by the character; knowledge gates/clues are revealed only per the configured strategy |
| SAVA-05 | The station is unscored — it reports no points, it only gates progress |
| SAVA-06 | The description can be shown as an arrival popup instead of static text |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SAVA-01 | Continue gate | Open the station, immediately look at Continue | Disabled until the first question is sent |
| T-SAVA-02 | In-character reply | Ask a question about the persona's topic | Reply is in character and in the activity language |
| T-SAVA-03 | Off-topic | Ask something unrelated | Character deflects in-character; no system/prompt text leaks |
| T-SAVA-04 | TTS | Enable voice, send a message | Reply is spoken with the configured voice type |
| T-SAVA-05 | Rate limit | Send more than 20 messages in a minute | 429 handled gracefully (error message, no crash) |

---

## 36. Stations — Avatar Quiz

### Requirements

| ID | Requirement |
|----|-------------|
| SAVQ-01 | The character **asks** the participant questions; each free-text answer is graded by `/api/avatar-quiz` into `correct` / `partial` / `incorrect` with a 0–1 `scoreRatio` |
| SAVQ-02 | Points per question = `pointsPerQuestion × scoreRatio`, rounded |
| SAVQ-03 | Ideal answers and keywords are resolved **server-side from the station id** — they must never appear in a client response or network payload |
| SAVQ-04 | `questionCount` draws that many questions from the bank; `shuffleQuestions` randomizes the order |
| SAVQ-05 | `allowRetry` offers a second attempt only when the verdict is `incorrect` |
| SAVQ-06 | `allowSkip` shows a skip control; `autoAdvance` moves on without a tap after the reaction |
| SAVQ-07 | Each question can carry its own hint with its own penalty (default 2 points) — this station does **not** use the shared game hint UI |
| SAVQ-08 | `strictness` (lenient / balanced / strict) changes how generously partial answers are graded |
| SAVQ-09 | Reaction videos (asking / correct / partial / incorrect) play when configured; otherwise stock reactions are used, without repeating the same line every question |
| SAVQ-10 | Follow-up questions (`mode: 'followup'`) answer in character; with no Gemini key they return a fixed "can't expand right now" line rather than replaying the teaching point |
| SAVQ-11 | The outro screen summarises correct / partial counts and reports the total score |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SAVQ-01 | Correct answer | Answer a question fully | `correct` verdict, full question points, positive reaction |
| T-SAVQ-02 | Partial answer | Answer with only part of the ideal answer | `partial` verdict, proportional points, teaching point shown |
| T-SAVQ-03 | Incorrect + retry | Answer wrongly with `allowRetry` on | Offered a second attempt; second grading replaces the first |
| T-SAVQ-04 | No answer leak | Watch the network tab while answering | No response contains `idealAnswer` or `keywords` |
| T-SAVQ-05 | Skip | Enable `allowSkip`, skip a question | Question scores 0 and the flow advances |
| T-SAVQ-06 | Per-question hint | Take a question hint | Hint text shown; that question's points reduced by its penalty (default 2) |
| T-SAVQ-07 | Strictness | Grade the same partial answer at lenient vs strict | Strict awards a lower `scoreRatio` |
| T-SAVQ-08 | Follow-up without key | Unset `GEMINI_API_KEY`, ask a follow-up | Fixed "can't expand" reply; grading still works via keyword fallback |
| T-SAVQ-09 | Summary | Finish all questions | Outro lists correct/partial counts; total matches the sum of awarded points |

---

## 37. Stations — Entering Text

### Requirements

| ID | Requirement |
|----|-------------|
| SENT-01 | Renders one input per configured field, with the configured submit button label (default "תשובה סופית") |
| SENT-02 | Submit is blocked while any field is empty |
| SENT-03 | `maxAttempts` defaults to 3; each wrong submit shows the remaining attempts |
| SENT-04 | When attempts run out the station ends and advances |
| SENT-05 | Fields with no `rightAnswer` are collect-only — the station succeeds without validation |
| SENT-06 | On success, an optional popup shows `successTitle` / `successSubtitle` and success media (image or video), preloaded before it is shown |
| SENT-07 | A return/continue button label can be overridden per station |

### Test Cases

| # | Test | Steps | Expected |
|---|------|-------|----------|
| T-SENT-01 | Empty guard | Leave one field blank and submit | Submit rejected; nothing consumed from the attempt count |
| T-SENT-02 | Correct answers | Fill every field correctly and submit | Success popup (if configured) then advance |
| T-SENT-03 | Attempt countdown | Submit wrong answers | Remaining-attempts message decrements each time |
| T-SENT-04 | Attempts exhausted | Use all attempts | Station ends and advances |
| T-SENT-05 | Collect-only | Configure fields with no right answers, submit | Always succeeds; values recorded |
| T-SENT-06 | Success media | Configure success image/video | Media is preloaded and plays in the success popup without a blank frame |

---

## Appendix A — Scoring Summary Table

| Game | Points Formula | Timer | Hint | Max Score |
|------|---------------|-------|------|-----------|
| **Order** | firstAttemptPts or retryPts per round + golfBonus (hits_left × 5) + speedBonus | Per-round countdown | -5 pts | Σ(firstAttemptPts × rounds) + 35 |
| **Trivia** | correctPts × correctSelected - wrongPenalty × wrongSelected per question | Per-question countdown | -5 pts | Σ(correctPts × correctAnswersPerQ) |
| **Puzzle** | basePts + speedBonusMax × (remainingTime / totalTime) | Game timer + per-question | -5 pts | basePts + speedBonusMax |
| **True/False** | correctPts per correct - wrongPenalty per wrong | Per-statement countdown | -5 pts | correctPts × statements |
| **Ball Game** | Legacy score from Phaser game | Per-question in-game | N/A | ~100 + (questions × 2) |
| **Trash Sort** | correctPts per correct sort | Fall speed timer | N/A | correctPts × items |

All scores capped at minimum 0.

> **Known discrepancy:** the code deducts `GAME_CONSTANTS.HINT_PENALTY = 4` (`client/src/components/games/types.ts`), while the hint warning copy in every game's `.i18n.ts` still says 5 points. The tests below follow the on-screen copy — decide which number is correct and align the other side.

---

## Appendix B — Token Reference

| Token | localStorage Key | Purpose | Contents |
|-------|-----------------|---------|----------|
| Activity | `yooz_token` | Participant session | participantName, activityCode, connectionType, email, phone, group |
| Portal | `yooz_portal_token` | Portal user session | Portal JWT |
| Portal User | `yooz_portal_user` | Portal username cache | Username string |
| Admin | `yooz_admin_token` | Admin dashboard | Admin JWT |
| Manager | `yooz_manager_token` | Manager endpoints | Manager JWT |

---

## Appendix C — Session Storage

| Key | Format | Contents |
|-----|--------|----------|
| `yooz_session_{code}` | JSON | currentItemIndex, scores[], phase, shownPopupIds[], stationHintUsed[], guidelinesDismissed, scoresSaved, lastActive timestamp |

---

## Appendix D — API Endpoints Referenced

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/login` | Participant login |
| GET | `/api/activities/:code` | Public activity config |
| GET | `/api/activities/:code/module` | Module data + items |
| PATCH | `/api/activities/:code/progress` | Incremental item save |
| POST | `/api/activities/:code/scores` | Final score submission |
| GET | `/api/activities/:code/leaderboard` | Top 50 scores |
| GET | `/api/activities/:code/my-progress` | Resume from server |
| DELETE | `/api/activities/:code/my-report` | Delete report (continuous exit) |
| POST | `/api/help` | AI help chat (Gemini) |
| POST | `/api/admin/portals/public/:code/login` | Portal login |
| POST | `/api/admin/portals/public/:code/register` | Portal register |
| POST | `/api/admin/portals/public/:code/google-login` | Portal Google login |
| PATCH | `/api/admin/portals/public/:code/profile` | Portal profile/password |
| GET | `/api/admin/analytics/overview` | Global KPIs |
| GET | `/api/admin/analytics/activities/:id` | Activity KPIs |
| GET | `/api/admin/analytics/activities/:id/funnel` | Funnel data |
| GET | `/api/admin/analytics/activities/:id/items` | Per-item stats |
| GET | `/api/admin/analytics/activities/:id/export` | Excel export |
