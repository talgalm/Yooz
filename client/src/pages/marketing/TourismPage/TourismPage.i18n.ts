/**
 * Copy read off the exported Figma frame `temp-imgs/אתר yooz/תיירות.png`.
 *
 * Card rows are listed in DOM order, which in RTL renders right-to-left - so the
 * first entry is the rightmost column in the comp.
 */
export const texts = {
  he: {
    heroTitleTop: 'הופכים כל סיור',
    heroTitleBottom: 'לחוויה אינטרקטיבית',
    heroTitleThird: 'שמשאירה חותם',
    heroLead:
      'פתרונות גיימיפיקציה מתקדמים לאתרי תיירות, פארקים, מוזיאונים ומסלולי בטבע לשיפור החוויה והמעורבות.',
    heroCta: 'הזמנת דמו',
    heroSecondary: 'המודל העסקי',
    heroMediaAlt: 'מטיילים מצלמים סלפי בעיר העתיקה',
    stats: [
      { value: '1.5x', label: 'זמן שהייה ממוצע באתר' },
      { value: '+50%', label: 'השתתפות פעילה' },
      { value: '2x', label: 'פרסום ברשתות החברתיות' },
    ],

    knowledgeTitle: 'להפוך ידע לחוויה',
    knowledgeCards: [
      { iconUrl: '/images/marketing/icon-fortress.png', title: 'חיבור למקום', body: 'הארכת זמן השהייה באתר על ידי יצירת עניין' },
      { iconUrl: '/images/marketing/icon-landmark.png', title: 'הגדלת הכנסות', body: 'עידוד רכישות באתר על ידי תגמולים בצורת שוברים וקופונים' },
      { iconUrl: '/images/marketing/icon-cityview.png', title: 'יחודיות', body: 'חיזוק הבידול והמיצוב החדשני של האתר' },
      { iconUrl: '/images/marketing/icon-map.png', title: 'ידע שנגיש אחרת', body: 'הנגשת התכנים באמצעות טכניקות גיימיפיקציה והטמעת כלי AI' },
      { iconUrl: '/images/marketing/icon-engagement.png', title: 'מעורבות', body: 'תוכן רב-כיווני ודינמי שיוצר חיבור ישיר בין המבקר, הידע והמרחב הפיזי.' },
    ],
    bottomLineLabel: 'השורה התחתונה:',
    bottomLine: 'אנחנו לא רק מספרים את הסיפור של המקום - אנחנו גורמים למבקר לקחת בו חלק פעיל.',

    fitTitle: 'לאיזה אתרים ופארקים Yooz מתאימה?',
    fitIntro:
      'ממרחב פתוח ורחב ידיים ועד לחלל סגור וממוזג - הפלטפורמה מנגישה כל מסלול ונקודת עניין ללא צורך בהורדת אפליקציה.',
    fitCards: [
      { iconUrl: '/images/marketing/icon-family.png', title: 'פארקים וגנים', body: 'מרחבים פתוחים, גנים בוטניים ופארקים עירוניים. הפעלת משפחות וקבוצות לאורך נקודות עניין, מדשאות ופינות חמד.', tag: 'משחקי ניווט וסריקה' },
      { iconUrl: '/images/marketing/icon-museum.png', title: 'מוזיאונים ואתרי מורשת', body: 'הפיכת מוצגים סטטיים לחוויות אינטראקטיביות, פענוח כתבי חידה וסיפור היסטורי חי וסוחף לכל הגילאים.', tag: 'חדרי בריחה וטריוויה' },
      { iconUrl: '/images/marketing/icon-explorer.png', title: 'מסלולים בטבע ואתגר', body: 'שבילי הליכה, תצפיות נוף ונחלים. אתגרי מיקום מבוססי GPS ותחנות מידע דיגיטליות שמעודדות תנועה וסקרנות.', tag: 'מסלול מבוסס נקודות ציון' },
      { iconUrl: '/images/marketing/icon-child.png', title: 'מרכזי מבקרים וחוות', body: 'מפעלים, יקבים, חוות חקלאיות ומרכזי מדע. הנגשת תהליכי הייצור בדרך חווייתית ומתגמלת.', tag: 'משחקי משימות והדרכה' },
    ],

    caseTag: 'דוגמה מהשטח',
    caseTitle: 'איך זה נראה בפועל?',
    caseSubtitle: '״פארקוד״ בגני יהושוע',
    caseIntro: '3 שלבים פשוטים שמחברים את המבקר לסיפור, מעלים מעורבות ומייצרים שיתופים ברשתות',
    caseSteps: ['1. סרטון פתיחה לסדרה', '2. חידות שטח אינטראקטיביות', '3. סרטון מזכרת AI אישי'],
    /**
     * One entry per chip in `caseSteps`, in the same order.
     *
     * Stage 1 is transcribed from the frame. Stages 2 and 3 are WRITTEN to match
     * it - the comp only ever renders the first tab, so there is no source for
     * the other two. They want a proof-read before launch.
     */
    caseStages: [
      {
        label: 'שלב 1: הצתה וחיבור ראשוני',
        title: 'פתיחה סיפורית ששואבת את המבקר פנימה',
        body: 'סריקת QR מהירה בכניסה למצודה פותחת סרטון קצר של שומר הפארק שמציג את סיפור הרקע ומזמין את הקבוצה למצוא את המזוודה הגנובה.',
        checks: [
          'ללא צורך בהורדת אפליקציה מחנות האפליקציות',
          'זמן טעינה מהיר בכל מכשיר',
          'התאמה לשפות מרובות (עברית, אנגלית, ערבית)',
        ],
        mediaAlt: 'וידאו פתיחה קולנועי מותאם אישית',
      },
      {
        label: 'שלב 2: חקירה בשטח',
        title: 'חידות שמפעילות את הקבוצה לאורך כל המסלול',
        body: 'כל תחנה פותחת חידה שמבוססת על מה שרואים במקום - שילוט, פסל או נקודת נוף. הקבוצה מצלמת, עונה ומקבלת רמז לתחנה הבאה, כך שההליכה עצמה הופכת לחלק מהמשחק.',
        checks: [
          'ניווט לתחנה הבאה ללא צורך במדריך',
          'רמזים מדורגים שמונעים תקיעות',
          'ניקוד בזמן אמת מול שאר הקבוצות',
        ],
        mediaAlt: 'חידת שטח אינטראקטיבית באחת התחנות',
      },
      {
        label: 'שלב 3: סיום ושיתוף',
        title: 'סרטון מזכרת אישי שנבנה מהתמונות של הקבוצה',
        body: 'בסיום המסלול המערכת מרכיבה סרטון קצר מהתמונות והתשובות של הקבוצה, עם שם הקבוצה והתוצאה הסופית. הסרטון מוכן לשיתוף ברשתות תוך שניות.',
        checks: [
          'הרכבה אוטומטית ללא עריכה ידנית',
          'מיתוג האתר מוטבע על גבי הסרטון',
          'שיתוף ישיר לוואטסאפ ולאינסטגרם',
        ],
        mediaAlt: 'סרטון מזכרת אישי בסיום המסלול',
      },
    ],

    customersTitle: 'לקוחות מרוצים',
    customers: [
      { name: 'שדה אליהו', caption: 'פעילות מרכז מבקרים', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
      { name: 'גני יהושוע', caption: 'פארקוד - פעילות קבועה לקבוצות', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'תל קאקון', caption: 'תעלומת האוצר הממלכתי', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'קופ״ח כללית', caption: 'פעילות גיבוש עובדים בפריסה רחבה', logoUrl: '/images/marketing/logo-clalit.svg' },
    ],

    /** The same pair appears on all four frames - not page-specific. */
    testimonials: [
      {
        quote:
          '"מזה 5 שנים אני משתמש בפלטפורמת Yooz כדי לייצר חוויית למידה מעניינת ומאתגרת... תוצאות המחקר שערכתי במשך 3 שנים מצביעות על עלייה בהישגים ובמעורבות"',
        author: 'מרצה במכללה האקדמית בתל אביב יפו',
        initials: 'ד.ו',
        avatarBg: '#D1FAE5',
      },
      {
        quote:
          '"פיתחנו סימולטור מתקדם לבדיקת מידת קבלת החלטות רפואיות על ידי הסטודנטים. הסימולטור מדמה מצבי אמת באמצעות כלי AI ותורם לחוויית ואפקטיביות הלמידה"',
        author: 'מרצה בחוג לסיעוד',
        initials: 'מ.ט',
        avatarBg: '#F3E8FF',
      },
    ],

    faqTitle: 'שאלות נפוצות',
    faq: [
      { q: 'האם צריך קליטה סלולרית לאורך כל המסלול?', a: 'לא. הפעילות נטענת מראש וממשיכה לעבוד גם באזורים ללא קליטה, ומסתנכרנת כשהחיבור חוזר.' },
      { q: 'האם הפעילות מתאימה לכל הגילאים?', a: 'כן. רמת הקושי והתוכן מותאמים לקהל - משפחות, קבוצות בית ספר או מבוגרים.' },
      { q: 'כמה זמן לוקח להקים מסלול באתר שלנו?', a: 'סיור מבוסס תבנית עולה לאוויר תוך ימים ספורים. מסלול מותאם עם צילומים ותוכן ייעודי נמשך מספר שבועות.' },
      { q: 'איזה מידע ונתונים מקבלים בסיום או תוך כדי הפעילות?', a: 'מספר משתתפים, זמני שהייה בכל תחנה, נקודות נטישה, ציונים ושיתופים ברשתות - בזמן אמת ובייצוא.' },
    ],
  },

  en: {
    heroTitleTop: 'Turn every tour',
    heroTitleBottom: 'into an interactive experience',
    heroTitleThird: 'that leaves a mark',
    heroLead:
      'Advanced gamification for tourist sites, parks, museums and nature trails, to lift both the experience and involvement.',
    heroCta: 'Book a demo',
    heroSecondary: 'The business model',
    heroMediaAlt: 'Travellers taking a selfie in the old city',
    stats: [
      { value: '1.5x', label: 'Average dwell time on site' },
      { value: '+50%', label: 'Active participation' },
      { value: '2x', label: 'Social network posting' },
    ],

    knowledgeTitle: 'Turn knowledge into experience',
    knowledgeCards: [
      { iconUrl: '/images/marketing/icon-fortress.png', title: 'Connection to place', body: 'Extends dwell time on site by creating genuine interest' },
      { iconUrl: '/images/marketing/icon-landmark.png', title: 'Revenue growth', body: 'Encourages on-site purchases through vouchers and coupons' },
      { iconUrl: '/images/marketing/icon-cityview.png', title: 'Distinctiveness', body: 'Strengthens the site’s differentiation and modern positioning' },
      { iconUrl: '/images/marketing/icon-map.png', title: 'Knowledge made accessible', body: 'Content opened up through gamification techniques and embedded AI tools' },
      { iconUrl: '/images/marketing/icon-engagement.png', title: 'Involvement', body: 'Multi-directional, dynamic content connecting the visitor, the knowledge and the physical space.' },
    ],
    bottomLineLabel: 'The bottom line:',
    bottomLine: 'we do not just tell the story of the place - we make the visitor take an active part in it.',

    fitTitle: 'Which sites and parks is Yooz for?',
    fitIntro:
      'From wide open ground to an enclosed, air-conditioned hall - the platform opens up every route and point of interest, with no app to download.',
    fitCards: [
      { iconUrl: '/images/marketing/icon-family.png', title: 'Parks and gardens', body: 'Open spaces, botanical gardens and urban parks. Activities for families and groups across points of interest and lawns.', tag: 'Navigation and scanning games' },
      { iconUrl: '/images/marketing/icon-museum.png', title: 'Museums and heritage sites', body: 'Turns static displays into interactive experiences, with riddles to decode and living history for every age.', tag: 'Escape rooms and trivia' },
      { iconUrl: '/images/marketing/icon-explorer.png', title: 'Nature and challenge trails', body: 'Walking paths, viewpoints and streams. GPS-based location challenges and digital info stations that reward curiosity.', tag: 'Waypoint-based route' },
      { iconUrl: '/images/marketing/icon-child.png', title: 'Visitor centres and farms', body: 'Factories, wineries, farms and science centres. Production processes opened up in an experiential, rewarding way.', tag: 'Mission and guidance games' },
    ],

    caseTag: 'From the field',
    caseTitle: 'What does it look like in practice?',
    caseSubtitle: '"ParKod" at Ganei Yehoshua',
    caseIntro: 'Three simple stages that connect the visitor to the story, raise involvement and generate social shares',
    caseSteps: ['1. Opening clip for the series', '2. Interactive field riddles', '3. Personal AI keepsake clip'],
    caseStages: [
      {
        label: 'Stage 1: the spark and first connection',
        title: 'A story opening that pulls the visitor in',
        body: 'A quick QR scan at the fortress entrance opens a short clip of the park keeper, setting up the background story and inviting the group to find the stolen case.',
        checks: [
          'No app store download required',
          'Fast load time on any device',
          'Multi-language support (Hebrew, English, Arabic)',
        ],
        mediaAlt: 'Cinematic personalised opening video',
      },
      {
        label: 'Stage 2: investigation in the field',
        title: 'Riddles that keep the group moving along the route',
        body: 'Each station opens a riddle built on what is actually in front of them - a sign, a sculpture, a viewpoint. The group photographs, answers, and gets a clue to the next station, so the walk itself becomes part of the game.',
        checks: [
          'Navigation to the next station without a guide',
          'Tiered clues that prevent groups getting stuck',
          'Live scoring against the other groups',
        ],
        mediaAlt: 'An interactive field riddle at one of the stations',
      },
      {
        label: 'Stage 3: finish and share',
        title: 'A personal keepsake clip built from the group’s own photos',
        body: 'At the end of the route the system assembles a short clip from the group’s photos and answers, with their name and final score. It is ready to share on social networks within seconds.',
        checks: [
          'Assembled automatically, with no manual editing',
          'Site branding baked into the clip',
          'Shared straight to WhatsApp and Instagram',
        ],
        mediaAlt: 'A personal keepsake clip at the end of the route',
      },
    ],

    customersTitle: 'Happy customers',
    customers: [
      { name: 'Sde Eliyahu', caption: 'Visitor centre activity', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
      { name: 'Ganei Yehoshua', caption: 'ParKod - a standing group activity', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'Tel Qaqun', caption: 'The royal treasure mystery', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'Clalit Health', caption: 'Employee engagement activity at scale', logoUrl: '/images/marketing/logo-clalit.svg' },
    ],

    testimonials: [
      { quote: '"For five years I have used the Yooz platform to build an engaging, challenging learning experience... three years of research I ran show a rise in both achievement and involvement"', author: 'Lecturer, Academic College of Tel Aviv-Yafo', initials: 'D.V', avatarBg: '#D1FAE5' },
      { quote: '"We built an advanced simulator to assess medical decision-making by students. It models real situations using AI tools and adds to both the experience and the effectiveness of the learning"', author: 'Lecturer, Nursing Department', initials: 'M.T', avatarBg: '#F3E8FF' },
    ],

    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'Is mobile reception needed along the whole route?', a: 'No. The activity is preloaded and keeps working in areas without reception, syncing when the connection returns.' },
      { q: 'Does it suit every age group?', a: 'Yes. Difficulty and content are matched to the audience - families, school groups or adults.' },
      { q: 'How long does it take to build a route at our site?', a: 'A template-based tour goes live within days. A custom route with dedicated photography and content takes a few weeks.' },
      { q: 'What data do we get during and after the activity?', a: 'Participant numbers, dwell time per station, drop-off points, scores and social shares, live and as an export.' },
    ],
  },
};
