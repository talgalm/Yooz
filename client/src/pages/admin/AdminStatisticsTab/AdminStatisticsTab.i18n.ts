export const texts = {
  en: {
    // Overview
    overview: 'Overview',
    totalParticipants: 'Total Participants',
    completionRate: 'Completion Rate',
    avgDuration: 'Avg Duration',
    avgScore: 'Avg Score',
    today: 'Today',
    thisWeek: 'This Week',
    active: 'Active',
    activities: 'Activities',
    joinTimeline: 'Participant Joins (Last 30 Days)',
    activitiesTable: 'Activities',
    viewAuditLog: 'View Audit Log',
    noData: 'No data yet',
    loading: 'Loading...',
    back: 'Back',
    refresh: 'Refresh',
    participants: 'participants',
    participant: 'Participant',
    completed: 'completed',
    median: 'Median',
    code: 'Code',
    module: 'Module',
    liveStatus: 'Live',
    previewStatus: 'Preview',
    score: 'Score',
    duration: 'Duration',
    progress: 'Progress',
    avgProgress: 'Avg Progress',
    topScore: 'Top Score',
    passRate: 'Pass Rate',
    fastest: 'Fastest',
    abandonments: 'Drop-offs',
    abandonmentRate: 'drop-off rate',
    periodFilter: 'Period',
    periodDay: 'Day',
    periodWeek: 'Week',
    periodMonth: 'Month',
    periodYear: 'Year to date',
    completedLabel: 'Completed',
    inProgress: 'In Progress',
    joinedOnly: 'Joined Only',
    completionMix: 'Completion Mix',
    flowHealth: 'Station Success',
    recommendations: 'Recommendations',
    topPlayers: 'Top Players',
    recentPlayers: 'Recent Players',
    groupHighlights: 'Group Highlights',
    attention: 'Attention',
    healthy: 'Healthy',
    noPlayerData: 'No player data yet',
    noItemData: 'No item data yet',
    reviewBottlenecks: 'Review bottlenecks',
    nudgeParticipants: 'Nudge unfinished players',
    nudgeParticipantsBody: '{count} players are still in progress. Send a reminder or let the manager restart the room flow.',
    groupGap: 'Group performance gap',
    groupGapBody: '{top} leads {low} by {gap} score points. Use this in the debrief and check whether weaker groups missed a station.',
    readyForClient: 'Ready for client reporting',
    readyForClientBody: 'Completion, score, and player activity are all in a presentable range for a client or boss summary.',

    // Anomaly messages (built client-side from structured data)
    anomalyDropout: '"{item}" has {pct}% drop-off rate',
    anomalySlow: '"{item}" takes {sec}s avg — {mult}x the average',

    // Generic labels
    statusHeader: 'Status',
    station: 'Station',

    // Activity drill-down
    activityAnalytics: 'Activity Analytics',
    overviewTab: 'Overview',
    funnelTab: 'Funnel',
    itemsTab: 'Items',
    groupsTab: 'Groups',
    exportTab: 'Export',

    // Funnel
    joined: 'Joined',
    started: 'Started Playing',
    halfway: 'Halfway',
    completedStep: 'Completed',
    dropOff: 'drop-off',

    // Items
    itemName: 'Name',
    itemType: 'Type',
    avgItemScore: 'Avg Score',
    avgItemDuration: 'Avg Time',
    hintUsage: 'Hint Usage',
    completionPct: 'Completion',
    needsImprovement: 'Needs Improvement',
    questionsBreakdown: 'Question Breakdown',
    question: 'Question',
    successRate: 'Success Rate',
    avgTime: 'Avg Time',

    // Groups
    group: 'Group',
    members: 'Members',
    noGroups: 'This activity has no group data',

    // Export
    exportExecutive: 'Export Executive Report',
    exportParticipants: 'Export Participants',
    exportScores: 'Export Scores',
    exportProgress: 'Export Progress',
    exportExecutiveDescription: 'Designed workbook with all sheets',
    exportParticipantsDescription: 'Styled contact, status, and ranking report',
    exportScoresDescription: 'Detailed score, item, and question report',
    exportProgressDescription: 'Progress, bottlenecks, and follow-up report',
    downloading: 'Downloading...',
    exportFailed: 'Export failed. Please try again.',

    // Participants roster
    participantsTab: 'Participants',
    included: 'In stats',
    excludeFromStats: 'Include in statistics',
    excludedCount: 'Excluded: {count}',
    includeAll: 'Include all',
    searchParticipants: 'Search by name or group…',
    noParticipants: 'No participants yet',
    excludeHint: 'Unchecked players are removed from all statistics — the dashboard panels, the Excel exports, and the public share link. Reversible at any time.',
    exclusionSaveFailed: 'Could not save the change. Please try again.',

    // Pass grade
    passGrade: 'Pass grade',
    passGradeDesc: 'Participants whose normalized score (0-100) is at or above this value count as passing in reports and statistics. Choose None to skip pass/fail entirely.',
    passGradeNone: 'None',

    // Share link
    shareTitle: 'Share statistics page',
    shareDesc: 'Anyone with this link can view this activity\'s statistics and download the reports (including participant names, emails and phone numbers) — with no access to the admin panel.',
    shareCreate: 'Create share link',
    shareCopy: 'Copy',
    shareCopied: 'Copied',
    shareRegenerate: 'Regenerate',
    shareRevoke: 'Revoke',

    // Alerts
    alerts: 'Alerts',
    noAlerts: 'No anomalies detected',

    // Audit log
    auditLog: 'Admin Audit Log',
    adminEmail: 'Admin',
    action: 'Action',
    target: 'Target',
    timestamp: 'Time',
    page: 'Page',
    of: 'of',

    // Score distribution
    scoreDistribution: 'Score Distribution',
    scores: 'Scores',
    count: 'Count',

    // Share stats
    shareClicks: 'Share Clicks',
    shareCompleted: 'Actual Shares',

    // Mission stats
    missionStats: 'Mission Stats',
    puzzleCompletions: 'Puzzle Completions',
    avgPuzzleDuration: 'Avg Puzzle Time',
    trashSortCompletions: 'Trash Sort Completions',
    avgTrashSortScore: 'Avg Trash Sort Score',

    // Duration formatting
    seconds: 's',
    minutes: 'm',
  },
  he: {
    // Overview
    overview: 'סקירה',
    totalParticipants: 'סה״כ משתתפים',
    completionRate: 'אחוז סיום',
    avgDuration: 'זמן ממוצע',
    avgScore: 'ציון ממוצע',
    today: 'היום',
    thisWeek: 'השבוע',
    active: 'פעיל',
    activities: 'פעילויות',
    joinTimeline: 'הצטרפויות (30 יום אחרונים)',
    activitiesTable: 'פעילויות',
    viewAuditLog: 'צפה ביומן פעילות',
    noData: 'אין נתונים עדיין',
    loading: 'טוען...',
    back: 'חזרה',
    refresh: 'רענון',
    participants: 'משתתפים',
    participant: 'משתתף',
    completed: 'סיימו',
    median: 'חציון',
    code: 'קוד',
    module: 'מודול',
    liveStatus: 'פעיל',
    previewStatus: 'תצוגה מקדימה',
    score: 'ציון',
    duration: 'משך',
    progress: 'התקדמות',
    avgProgress: 'התקדמות ממוצעת',
    topScore: 'ציון מוביל',
    passRate: 'אחוז מעבר',
    fastest: 'המהיר ביותר',
    abandonments: 'נטישות',
    abandonmentRate: 'שיעור נטישה',
    periodFilter: 'תקופה',
    periodDay: 'יום',
    periodWeek: 'שבוע',
    periodMonth: 'חודש',
    periodYear: 'מתחילת שנה',
    completedLabel: 'הושלם',
    inProgress: 'בתהליך',
    joinedOnly: 'הצטרפו בלבד',
    completionMix: 'חלוקת התקדמות',
    flowHealth: 'הצלחת תחנות',
    recommendations: 'המלצות',
    topPlayers: 'שחקנים מובילים',
    recentPlayers: 'שחקנים אחרונים',
    groupHighlights: 'תובנות קבוצות',
    attention: 'דורש תשומת לב',
    healthy: 'תקין',
    noPlayerData: 'אין עדיין נתוני שחקנים',
    noItemData: 'אין עדיין נתוני תחנות',
    reviewBottlenecks: 'בדוק צווארי בקבוק',
    nudgeParticipants: 'תזכורת לשחקנים שלא סיימו',
    nudgeParticipantsBody: '{count} שחקנים עדיין בתהליך. כדאי לשלוח תזכורת או לאפשר למנהל להחזיר את הזרימה למסלול.',
    groupGap: 'פער בין קבוצות',
    groupGapBody: '{top} מובילה על {low} בפער של {gap} נקודות. השתמש בזה בתחקיר ובדוק אם הקבוצות החלשות פספסו תחנה.',
    readyForClient: 'מוכן לדוח לקוח',
    readyForClientBody: 'ההשלמה, הציונים ופעילות השחקנים נמצאים בטווח שניתן להציג ללקוח או מנהל.',

    // Anomaly messages (built client-side from structured data)
    anomalyDropout: '"{item}" עם {pct}% נשירה',
    anomalySlow: '"{item}" אורכת {sec} שניות בממוצע — פי {mult} מהממוצע',

    // Generic labels
    statusHeader: 'סטטוס',
    station: 'תחנה',

    // Activity drill-down
    activityAnalytics: 'ניתוח פעילות',
    overviewTab: 'סקירה',
    funnelTab: 'משפך',
    itemsTab: 'תחנות',
    groupsTab: 'קבוצות',
    exportTab: 'ייצוא',

    // Funnel
    joined: 'הצטרפו',
    started: 'התחילו לשחק',
    halfway: 'הגיעו לאמצע',
    completedStep: 'סיימו',
    dropOff: 'נטישה',

    // Items
    itemName: 'שם',
    itemType: 'סוג',
    avgItemScore: 'ציון ממוצע',
    avgItemDuration: 'זמן ממוצע',
    hintUsage: 'שימוש ברמז',
    completionPct: 'השלמה',
    needsImprovement: 'דורש שיפור',
    questionsBreakdown: 'פירוט שאלות',
    question: 'שאלה',
    successRate: 'אחוז הצלחה',
    avgTime: 'זמן ממוצע',

    // Groups
    group: 'קבוצה',
    members: 'חברים',
    noGroups: 'לפעילות זו אין נתוני קבוצות',

    // Export
    exportExecutive: 'ייצוא דוח מנהלים מלא',
    exportParticipants: 'ייצוא משתתפים',
    exportScores: 'ייצוא ציונים',
    exportProgress: 'ייצוא התקדמות',
    exportExecutiveDescription: 'קובץ אקסל מעוצב עם כל הגיליונות',
    exportParticipantsDescription: 'פרטי קשר, סטטוס, דירוג ופולו-אפ',
    exportScoresDescription: 'ציונים, תחנות, שאלות והתפלגות',
    exportProgressDescription: 'התקדמות, צווארי בקבוק ומי דורש טיפול',
    downloading: 'מוריד...',
    exportFailed: 'הייצוא נכשל. נסה שוב.',

    // Participants roster
    participantsTab: 'משתתפים',
    included: 'בסטטיסטיקה',
    excludeFromStats: 'כלול בסטטיסטיקה',
    excludedCount: 'מוחרגים: {count}',
    includeAll: 'כלול את כולם',
    searchParticipants: 'חיפוש לפי שם או קבוצה…',
    noParticipants: 'אין עדיין משתתפים',
    excludeHint: 'שחקנים שאינם מסומנים מוסרים מכל הסטטיסטיקות — מהפאנלים בלוח הבקרה, מקובצי האקסל ומקישור השיתוף הציבורי. ניתן לבטל בכל רגע.',
    exclusionSaveFailed: 'לא ניתן לשמור את השינוי. נסה שוב.',

    // Pass grade
    passGrade: 'ציון מעבר',
    passGradeDesc: 'משתתפים שהציון המנורמל שלהם (0-100) שווה לערך הזה או גבוה ממנו ייחשבו כעוברים בדוחות ובסטטיסטיקות. בחירה ב"ללא" מבטלת את חישוב העובר/נכשל.',
    passGradeNone: 'ללא',

    // Share link
    shareTitle: 'שיתוף דף הסטטיסטיקה',
    shareDesc: 'כל מי שיש לו את הקישור יכול לצפות בסטטיסטיקה של הפעילות ולהוריד את הדוחות (כולל שמות, אימיילים וטלפונים של המשתתפים) — ללא גישה לפאנל הניהול.',
    shareCreate: 'צור קישור שיתוף',
    shareCopy: 'העתק',
    shareCopied: 'הועתק',
    shareRegenerate: 'צור מחדש',
    shareRevoke: 'בטל קישור',

    // Alerts
    alerts: 'התראות',
    noAlerts: 'לא זוהו חריגות',

    // Audit log
    auditLog: 'יומן פעולות מנהל',
    adminEmail: 'מנהל',
    action: 'פעולה',
    target: 'יעד',
    timestamp: 'זמן',
    page: 'עמוד',
    of: 'מתוך',

    // Score distribution
    scoreDistribution: 'התפלגות ציונים',
    scores: 'ציונים',
    count: 'כמות',

    // Share stats
    shareClicks: 'לחיצות שיתוף',
    shareCompleted: 'שיתופים בפועל',

    // Mission stats
    missionStats: 'נתוני משימה',
    puzzleCompletions: 'השלמות פאזל',
    avgPuzzleDuration: 'זמן פאזל ממוצע',
    trashSortCompletions: 'השלמות מיון פסולת',
    avgTrashSortScore: 'ציון מיון ממוצע',

    // Duration formatting
    seconds: 'שניות',
    minutes: 'דקות',
  },
};
