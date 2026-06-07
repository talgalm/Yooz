export const texts = {
  en: {
    fabAria: 'DumbDumbBot admin help',
    fabTooltip: 'Ask DumbDumbBot! 🤖',
    headerTitle: 'DumbDumbBot',
    greeting:
      "Hi! I'm DumbDumbBot, your admin helper. Pick a topic or ask me how to do anything in the dashboard:",
    chipCreateActivity: 'Create an activity',
    chipAddGame: 'Configure a game',
    chipStatistics: 'View statistics',
    chipExport: 'Export participants',
    chipPortal: 'Set up a portal',
    chipDevTasks: 'Dev tasks',
    devTasksPickType: 'What would you like to report? Choose a type:',
    devTasksDescribe: 'Describe the task in detail (optional: attach a document):',
    devTasksSubmitted: 'Thanks! Your task was submitted to the dev team.',
    devTasksSubmitError: 'Could not submit the task. Please try again.',
    devUploadDoc: 'Attach document',
    devUploading: 'Uploading…',
    devDocAttached: 'Document attached',
    devRemoveDoc: 'Remove',
    devViewDoc: 'View document',
    devOpenDoc: 'Open in new tab',
    devDocPreviewTitle: 'Attached document',
    devTypeFeature: 'Feature',
    devTypeBug: 'Bug',
    devTypeChange: 'Change',
    devPanelTitle: 'Dev task management',
    devPanelLoading: 'Loading tasks…',
    devPanelEmpty: 'No tasks yet.',
    devFilterAll: 'All',
    devStatusOpen: 'Open',
    devStatusInProgress: 'In progress',
    devStatusDone: 'Done',
    devStatusClosed: 'Closed',
    devPanelOpened: 'Opening dev task management…',
    devPanelNoAccess: 'Dev panel is available to developers only (admin/super_admin).',
    inputPlaceholder: 'How do I…?',
    inputPlaceholderDevTask: 'Describe the task…',
    errorGeneral: 'Something went wrong. Please try again.',
    errorRate: 'Too many requests — wait a minute and try again.',
    footnote: 'Powered by AI · Answers based on admin docs',
  },
  he: {
    fabAria: 'DumbDumbBot עוזר ניהול',
    fabTooltip: 'שאלו את DumbDumbBot! 🤖',
    headerTitle: 'DumbDumbBot',
    greeting:
      'היי! אני DumbDumbBot, העוזר שלכם בניהול. בחרו נושא או שאלו אותי איך לעשות משהו בלוח הבקרה:',
    chipCreateActivity: 'יצירת פעילות',
    chipAddGame: 'הגדרת משחק',
    chipStatistics: 'צפייה בדוחות',
    chipExport: 'ייצוא משתתפים',
    chipPortal: 'הגדרת פורטל',
    chipDevTasks: 'משימות פיתוח',
    devTasksPickType: 'מה תרצו לדווח? בחרו סוג:',
    devTasksDescribe: 'תארו את המשימה בפירוט (אפשר גם לצרף מסמך):',
    devTasksSubmitted: 'תודה! המשימה נרשמה ונשלחה לצוות הפיתוח.',
    devTasksSubmitError: 'לא הצלחנו לשמור את המשימה. נסו שוב.',
    devUploadDoc: 'צרף מסמך',
    devUploading: 'מעלה…',
    devDocAttached: 'מסמך מצורף',
    devRemoveDoc: 'הסר',
    devViewDoc: 'צפייה במסמך',
    devOpenDoc: 'פתיחה בלשונית חדשה',
    devDocPreviewTitle: 'מסמך מצורף',
    devTypeFeature: "פיצ'ר",
    devTypeBug: 'באג',
    devTypeChange: 'שינוי',
    devPanelTitle: 'ניהול משימות פיתוח',
    devPanelLoading: 'טוען משימות…',
    devPanelEmpty: 'אין משימות עדיין.',
    devFilterAll: 'הכל',
    devStatusOpen: 'פתוח',
    devStatusInProgress: 'בטיפול',
    devStatusDone: 'בוצע',
    devStatusClosed: 'סגור',
    devPanelOpened: 'פותח את לוח ניהול המשימות…',
    devPanelNoAccess: 'לוח הפיתוח זמין למפתחים בלבד (admin/super_admin).',
    inputPlaceholder: 'איך אני…?',
    inputPlaceholderDevTask: 'תארו את המשימה…',
    errorGeneral: 'משהו השתבש. נסו שוב.',
    errorRate: 'יותר מדי בקשות — המתינו דקה ונסו שוב.',
    footnote: 'מופעל ב-AI · תשובות מבוססות על מדריך הניהול',
  },
};

export const DEV_TASKS_TRIGGERS = ['משימות פיתוח', 'dev tasks', 'development tasks'];

export const DEV_TYPE_LABELS: Record<string, 'feature' | 'bug' | 'change'> = {
  "פיצ'ר": 'feature',
  פיצר: 'feature',
  feature: 'feature',
  באג: 'bug',
  bug: 'bug',
  שינוי: 'change',
  change: 'change',
};

export function isDevCommand(text: string): boolean {
  return /^\/dev$/i.test(text.trim());
}

export function isDevTasksTrigger(text: string): boolean {
  const normalized = text.trim().toLowerCase();
  return DEV_TASKS_TRIGGERS.some((trigger) => normalized === trigger.toLowerCase());
}

export function parseDevTaskType(text: string): 'feature' | 'bug' | 'change' | null {
  const key = text.trim().toLowerCase();
  return DEV_TYPE_LABELS[key] ?? DEV_TYPE_LABELS[text.trim()] ?? null;
}

export function getDocPreviewKind(url: string, name?: string): 'pdf' | 'image' | 'other' {
  const hint = (name || url).toLowerCase();
  if (hint.endsWith('.pdf') || url.toLowerCase().includes('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|gif|webp|svg)(\?|$)/i.test(hint)) return 'image';
  return 'other';
}
