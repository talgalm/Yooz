/**
 * No Figma frame exists for this page. The copy is drawn from real material in
 * the repo rather than invented: `DEFAULT_SITE_CONTENT` in
 * `server/src/models/SiteContent.ts` (the deck the old site shipped - audiences,
 * named projects, the three boosters) and MEMORY.md sections 1, 9, 10 and 12
 * (what the platform is, the game and station types, the collage/AutoClip
 * pipeline).
 *
 * Every client and figure below appears in one of those. Nothing here asserts a
 * founding date, team size or headcount, none of which the repo records.
 */
export const texts = {
  he: {
    heroTitleTop: 'מנוע שיווק',
    heroTitleBottom: 'שמופעל במשחק',
    heroLead:
      'Yooz היא פלטפורמת משחוק לשיווק ולהדרכה. משתתף מצטרף לפעילות בעזרת קוד בן 6 תווים, ישירות מהדפדפן בנייד וללא הורדת אפליקציה, ויוצא למסע של תחנות ומשחקים שאתם בונים. בסוף המסע נשאר בידיכם דוח מלא - ובידיו סרטון אישי שהוא רוצה לשתף.',
    heroCta: 'הזמנת דמו',
    heroMediaAlt: 'משתתפים בפעילות Yooz',

    howTitle: 'איך פעילות עובדת',
    howIntro: 'אותו מבנה בכל מגזר: אתם מגדירים את המסע, המשתתפים משחקים אותו, והנתונים חוזרים אליכם.',
    how: [
      {
        title: 'הצטרפות בקוד',
        body: 'קוד בן 6 תווים פותח את הפעילות בדפדפן. אין התקנה, אין חנות אפליקציות, ואפשר להצטרף אנונימית או דרך פורטל מאובטח.',
      },
      {
        title: 'מסע של תחנות ומשחקים',
        body: 'אתם מרכיבים מודול מסודר של תחנות מידע ומשחקים - מפת דרכים סיפורית, משימה, או גרף מסועף שבו המשתתף בוחר את הדרך.',
      },
      {
        title: 'דוח בצד אחד, סרטון בצד השני',
        body: 'כל תחנה מדווחת ניקוד והתקדמות לדוח שלכם, ובמקביל נבנה למשתתף תוצר אישי לשיתוף.',
      },
    ],

    boostersTitle: 'שלושת הבוסטרים',
    boostersIntro:
      'המנוע הופך ביקור בודד למחזור שיווקי: המבקרים הופכים לשגרירים דיגיטליים, מעמיקים את החוויה וחוזרים.',
    boosters: [
      {
        label: 'Share Booster',
        title: 'מכונת תוכן לרשתות חברתיות',
        body: 'Yooz AutoClip מרכיב מהתמונות של המשתתפים סרטון אישי אוטומטי, מוכן לשיתוף בלחיצה אחת או לשליחה ב-SMS - והאתר מרוויח תוכן אורגני.',
      },
      {
        label: 'Stay Booster',
        title: 'חוויה הוליסטית סוחפת',
        body: 'משימות מאתגרות ופעילות משחקית יוצרות חיבור רגשי למקום ומאריכות את זמן השהייה בו.',
      },
      {
        label: 'Spend Booster',
        title: 'הגדלת פדיון ורכישות',
        body: 'המערכת שולחת קופוני הנחה לרכישה במקום ולביקור הבא, והופכת את החוויה להכנסה.',
      },
    ],

    toolboxTitle: 'מה יש בארגז הכלים',
    toolboxIntro: 'כל פעילות מורכבת מאותן אבני בניין, ואפשר לערבב ביניהן בכל שילוב.',
    toolbox: [
      {
        title: 'משחקים',
        body: 'טריוויה עם רמזים, משחקי סדר, פאזלים, נכון/לא נכון, מיון פריטים ומשחק כדור מבוסס פיזיקה. לצידם סקר דירוג חי שהמנחה מריץ מול הקבוצה בזמן אמת.',
      },
      {
        title: 'תחנות מבוססות AI',
        body: 'דמות שמנהלת שיחה עם המשתתף, ותחנת תשאול שבה ה-AI מדרג תשובה חופשית בציון 0 עד 100 לפי תשובת מופת, מילות מפתח ורמת נוקשות שאתם קובעים.',
      },
      {
        title: 'סיפור, מדיה ומשימות שטח',
        body: 'תחנות טקסט, וידאו ותמונה, מסכי נרטיב עם הקראה קולית, חידות עם בדיקת תשובה, תגי הישג ואיסוף תמונות לאורך המסלול.',
      },
      {
        title: 'ניהול, ניתוח ובקרה',
        body: 'דוח ברמת המשתתף והקבוצה, ממוצעים מנורמלים בין פעילויות שונות, קישור סטטיסטיקה לצפייה בלבד לשיתוף עם לקוח, ומנחה שמריץ מפגש חי מהנייד.',
      },
    ],

    audiencesTitle: 'למי זה מתאים',
    audiencesIntro: 'ארבעה מגזרים, אותה פלטפורמה, התאמה שונה לכל אחד.',
    audiences: [
      {
        title: 'תיירות',
        body: 'פארקים עירוניים, אתרי מורשת, מרכזי מבקרים וחברות טיולים.',
        work: 'פארקוד בגני יהושוע, המטמון של ביברס בתל קאקון, מרכז המבקרים בשדה אליהו ומשחק נסיעה לטיולי בתי ספר.',
      },
      {
        title: 'עסקים',
        body: 'רשתות מזון מהיר, חדרי כושר ובתי עסק שרוצים להפוך זמן המתנה לזמן מכירה.',
        work: 'משחקונים לרגעי המתנה, מימוש קופונים במקום ועידוד ביקור חוזר.',
      },
      {
        title: 'אקדמיה',
        body: 'מכללות ואוניברסיטאות שמשחקות קורסים שלמים, לא רק חידון בודד.',
        work: 'כחמש שנים של משחוק קורסים בחוג לסיעוד באקדמית תל אביב יפו, סימולטור לקבלת החלטות רפואיות משולב AI, ופרויקטים שבנו סטודנטים במכללות כנרת ופרס.',
      },
      {
        title: 'ארגונים',
        body: 'הי-טק, שירותים, בריאות, פיננסים וגופים ציבוריים שמטמיעים תהליכי שינוי.',
        work: 'הטמעת הקוד האתי בחברת החשמל, הטמעת הערך "חוסן קבוצתי" ב-MAX, וערכת הפעלה להטמעת תקן בינלאומי לאיכות הסביבה שנשלחה ל-52 אתרי החברה ברחבי העולם.',
      },
    ],

    customersTitle: 'לקוחות מרוצים',
    customers: [
      { name: 'תל קאקון', caption: 'תעלומת האוצר הממלוכי', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'מכללת כנרת', caption: 'הנחיית קורסים תואר ראשון ושני', logoUrl: '/images/marketing/logo-kinneret.png' },
      { name: 'גני יהושוע', caption: 'פעילות למשפחות (פתוחה כל השנה)', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'שדה אליהו', caption: 'פעילות במרכז המבקרים', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
      { name: 'מכללת פרס', caption: 'הנחיית קורסים תואר ראשון ושני', logoUrl: '/images/marketing/logo-peres.png' },
      { name: 'האקדמית', caption: 'סימולטור לקבלת החלטות רפואיות', logoUrl: '/images/marketing/logo-academic-tlv.png' },
      { name: 'קופ״ח כללית', caption: 'פעילות גיבוש של מאות עובדים ב-40 סניפים', logoUrl: '/images/marketing/logo-clalit.svg' },
    ],

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
  },

  en: {
    heroTitleTop: 'A marketing engine',
    heroTitleBottom: 'that runs on play',
    heroLead:
      'Yooz is a gamification platform for marketing and training. A participant joins an activity with a six-character code, straight from their phone browser with nothing to install, and sets off through a journey of stations and games you build. At the end you keep a full report, and they keep a personal clip they actually want to share.',
    heroCta: 'Book a demo',
    heroMediaAlt: 'Participants in a Yooz activity',

    howTitle: 'How an activity works',
    howIntro: 'The same shape in every sector: you define the journey, participants play it, and the data comes back to you.',
    how: [
      {
        title: 'Join with a code',
        body: 'A six-character code opens the activity in the browser. No install, no app store, and participants can join anonymously or through a gated portal.',
      },
      {
        title: 'A journey of stations and games',
        body: 'You assemble an ordered module of information stations and games - a story roadmap, a mission, or a branching graph where the participant picks the route.',
      },
      {
        title: 'A report one side, a clip the other',
        body: 'Every station reports score and progress into your data, while a personal artefact is built for the participant to share.',
      },
    ],

    boostersTitle: 'The three boosters',
    boostersIntro:
      'The engine turns a single visit into a marketing cycle: visitors become digital ambassadors, go deeper into the experience, and come back.',
    boosters: [
      {
        label: 'Share Booster',
        title: 'A content machine for social networks',
        body: 'Yooz AutoClip assembles a personal video from participants’ own photos, ready to share in one tap or delivered by SMS - and the site earns organic content.',
      },
      {
        label: 'Stay Booster',
        title: 'An immersive, holistic experience',
        body: 'Challenging missions and gameplay build an emotional connection to the place and extend how long people stay in it.',
      },
      {
        label: 'Spend Booster',
        title: 'Growing revenue and repeat purchase',
        body: 'The system sends discount coupons for buying on site and for the next visit, turning the experience into income.',
      },
    ],

    toolboxTitle: 'What is in the toolbox',
    toolboxIntro: 'Every activity is assembled from the same building blocks, in any combination.',
    toolbox: [
      {
        title: 'Games',
        body: 'Trivia with hints, ordering games, puzzles, true/false, item sorting and a physics-based ball game. Alongside them, a live ranking poll a facilitator runs against the room in real time.',
      },
      {
        title: 'AI-driven stations',
        body: 'A character that holds a conversation with the participant, and a questioning station where AI grades a free-text answer from 0 to 100 against an ideal answer, keywords and a strictness level you set.',
      },
      {
        title: 'Story, media and field missions',
        body: 'Text, video and image stations, narrative screens with voice narration, riddles with checked answers, achievement badges, and photo capture spread along the route.',
      },
      {
        title: 'Running it and reading it',
        body: 'Reporting at participant and group level, averages normalised across different activities, a read-only stats link to share with a client, and a facilitator who runs a live session from their phone.',
      },
    ],

    audiencesTitle: 'Who it is for',
    audiencesIntro: 'Four sectors, one platform, a different fit for each.',
    audiences: [
      {
        title: 'Tourism',
        body: 'Urban parks, heritage sites, visitor centres and travel companies.',
        work: 'ParKod at Ganei Yehoshua, Baybars’ Treasure at Tel Qaqun, the Sde Eliyahu visitor centre, and a travel game for school trips.',
      },
      {
        title: 'Business',
        body: 'Fast-food chains, gyms and venues that want to turn waiting time into selling time.',
        work: 'Gameplay for the waiting moments, coupons redeemed on the spot, and a reason to come back.',
      },
      {
        title: 'Academy',
        body: 'Colleges and universities gamifying whole courses, not a single quiz.',
        work: 'Around five years of gamified courses in the nursing department at the Academic College of Tel Aviv-Yafo, an AI-integrated medical decision-making simulator, and projects built by students at Kinneret and Peres.',
      },
      {
        title: 'Organizations',
        body: 'Hi-tech, services, health, finance and public bodies rolling out change processes.',
        work: 'Embedding the code of ethics at Israel Electric Corporation, embedding the value of "group resilience" at MAX, and an activation kit for an international environmental standard sent to 52 company sites worldwide.',
      },
    ],

    customersTitle: 'Happy customers',
    customers: [
      { name: 'Tel Qaqun', caption: 'The Mamluk treasure mystery', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'Kinneret College', caption: 'Bachelor and master course delivery', logoUrl: '/images/marketing/logo-kinneret.png' },
      { name: 'Ganei Yehoshua', caption: 'A family activity, open all year round', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'Sde Eliyahu', caption: 'An activity at the visitor centre', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
      { name: 'Peres College', caption: 'Bachelor and master course delivery', logoUrl: '/images/marketing/logo-peres.png' },
      { name: 'Academic TLV', caption: 'Medical decision-making simulator', logoUrl: '/images/marketing/logo-academic-tlv.png' },
      { name: 'Clalit Health', caption: 'Team-building for hundreds of employees across 40 branches', logoUrl: '/images/marketing/logo-clalit.svg' },
    ],

    testimonials: [
      {
        quote:
          '"For five years I have used the Yooz platform to build an engaging, challenging learning experience... three years of research I ran show a rise in both achievement and involvement"',
        author: 'Lecturer, Academic College of Tel Aviv-Yafo',
        initials: 'D.V',
        avatarBg: '#D1FAE5',
      },
      {
        quote:
          '"We built an advanced simulator to assess medical decision-making by students. It models real situations using AI tools and adds to both the experience and the effectiveness of the learning"',
        author: 'Lecturer, Nursing Department',
        initials: 'M.T',
        avatarBg: '#F3E8FF',
      },
    ],
  },
};
