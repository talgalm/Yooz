/**
 * Copy read off the exported Figma frame `temp-imgs/אתר yooz/עזרי למידה.png`.
 *
 * Card rows are listed in DOM order, which in RTL renders right-to-left - so the
 * first entry is the rightmost column in the comp.
 */
export const texts = {
  he: {
    heroTitleTop: 'הפכו כל קורס',
    heroTitleBottom: 'למסע למידה סוחף',
    heroLead:
      'למידה חווייתית | מעורבות ושביעות רצון | אפקטיביות פדגוגית | תובנות מבוססות נתונים | מיצוב אקדמי חדשני',
    heroCta: 'הזמנת דמו',
    heroMediaAlt: 'סטודנטים בכיתה אקדמית',

    // \u00A0 is a no-break space: it keeps 'ב' on the same line as Yooz.
    valueTitle: 'מה הערך המוסף למוסד האקדמי שלכם מפיתוח קורס ושימוש ב\u00A0Yooz',
    valueIntro: 'פתרון מקיף שמחבר בין פדגוגיה איכותית, שביעות רצון סטודנטים ומרצים ותוצאות מדידות.',
    /**
     * Order matters: the 2x2 grid fills top-right, top-left, bottom-right,
     * bottom-left under RTL, so swapping indices 2 and 3 mirrors the block.
     * No colours here: each card's colour (icon, tile, tag and proof line) is
     * set by position in the page (`VALUE_ICONS`).
     */
    valueCards: [
      {
        tag: 'מניעת נטישה פרואקטיבית',
        icon: '/images/marketing/icons/acad-head-question.svg',
        title: 'זינוק בשימור סטודנטים ומניעת נשירה מקורסים "משעממים"',
        body: 'מחקר של 3 שנים באקדמית תל אביב-יפו (2022-2025) מצא שקורסים משולבי Gamification העלו ב-21% את שביעות הרצון של סטודנטים ומרצים, ושיפרו את הציונים.',
        proof: 'שיפור ציונים ושביעות רצון',
      },
      {
        tag: 'Plug & Play אמיתי',
        icon: '/images/marketing/icons/acad-puzzle.svg',
        title: 'מיצוב אקדמי חדשני',
        body: 'הובלת חדשנות בהוראה אקדמית והטמעת טכנולוגיות מתקדמות, המבדלות את המוסד ומושכות סטודנטים המחפשים למידה רלוונטית ומותאמת לעידן הדיגיטלי.',
        proof: 'הטמעת טכנולוגיות AI',
      },
      {
        tag: 'Pedagogical Intelligence',
        icon: '/images/marketing/icons/acad-chart-up.svg',
        title: 'דאטה ואנליטיקה התנהגותית בזמן אמת לסגל האקדמי',
        body: 'מערכת AI מנתחת את ביצועי הסטודנטים, מתריעה למרצה על נושאי לימוד בעייתיים ועל נקודות חולשה של סטודנטים ספציפיים, ומאפשרת לתקן ולהתאים את החומר תוך כדי הקורס.',
        proof: 'דוחות שוטפים נשלחים למרצה באופן יזום',
      },
      {
        tag: 'החזר השקעה מובהק',
        icon: '/images/marketing/icons/acad-piggy.svg',
        title: 'חיסכון בשעות תגבור, שיפור מוניטין',
        body: 'שימור סטודנטים שווה כסף רב. שילוב הטכנולוגיה מעלה את העניין, הציונים, איכות הלמידה ושביעות הרצון במשוב ההוראה, ומפחית מהמרצים את עומס השאלות החוזרות.',
        proof: 'החזר השקעה בטווח קצר',
      },
    ],

    experienceTitle: 'החוויה הפדגוגית',
    experienceIntro:
      'חוויה פדגוגית שלמה שנבנתה בשיתוף משחקולוגים, מעצבים ומומחי הוראה אקדמית.',
    /**
     * Tiles are 48 square, flat colour, with a white line glyph - emoji render in
     * their own colours and ignore `fg`. Each tile has its own colour; the title
     * row stays uniform, so every AI pill uses the same lavender.
     */
    experienceCards: [
      { icon: '/images/marketing/icons/acad-map.svg', tileBg: '#5A1B87', fg: '#FFFFFF', badge: 'AI', badgeBg: '#F4EBFD', title: 'Quest Engine', body: 'דוחות מהירים בסיוע AI, המאפשרים לשנות בטווח קצר את רמת הקושי של המשימות ואת הידע הנדרש.' },
      { icon: '/images/marketing/icons/acad-star-circle.svg', tileBg: '#059669', fg: '#FFFFFF', badge: 'AI', badgeBg: '#F4EBFD', title: 'Medical Simulator', body: 'סימולטור אינטראקטיבי לקבלת החלטות רפואיות בזמן אמת, במטרה להכין את הסטודנטים לעולם האמיתי.' },
      { icon: '/images/marketing/icons/acad-swords.svg', tileBg: '#DB2777', fg: '#FFFFFF', title: 'Peer Challenges', body: 'תחרויות עמיתים שבועיות, אתגרי צוותים פקולטיים שמדרבנים שיתוף פעולה ולמידה חברתית עמוקה.' },
      { icon: '/images/marketing/icons/acad-shield.svg', tileBg: '#4F46E5', fg: '#FFFFFF', title: 'Faculty Command Center', body: 'דשבורד אינטואיטיבי המאפשר למרצה להשיק אתגר כיתתי בלחיצת כפתור אחת, לעקוב אחר הבנת החומר בזמן אמת, ולהעניק ״בוסטים״.' },
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

    customersTitle: 'לקוחות מרוצים',
    customers: [
      { name: 'מכללת פרס', caption: 'הנחיית קורסים תואר ראשון ושני', logoUrl: '/images/marketing/logo-peres.png' },
      { name: 'האקדמית', caption: '5 שנים של משחוק קורסים מאות סטודנטים בשנה', logoUrl: '/images/marketing/logo-academic-tlv.png' },
      { name: 'כנרת', caption: 'הנחיית קורסים תואר ראשון ושני', logoUrl: '/images/marketing/logo-kinneret.png' },
    ],

    faqTitle: 'שאלות נפוצות',
    faq: [
      { q: 'האם המערכת מתאימה לכל תחום דעת?', a: 'כן. המערכת אגנוסטית לתוכן - מדעי הבריאות, הנדסה, מדעי החברה ומשפטים כולם נבנים מאותם אבני בניין של תחנות ומשימות.' },
      { q: 'כמה זמן ומאמץ נדרשים מהסגל כדי להטמיע את המערכת?', a: 'הקמת קורס ראשון נעשית בליווי צמוד שלנו ואורכת מספר שעות. לאחר מכן מרצה מנוסה מרכיב מסע חדש באופן עצמאי.' },
      { q: 'האם הפורמט המשחקי לא ״מוריד״ את הרמה האקדמית?', a: 'התוכן והדרישות נשארים ברמה האקדמית שהמרצה קובע. המשחוק משנה את אופן ההגשה והתרגול, לא את הסטנדרט.' },
      { q: 'איזה מידע המרצה מקבל על ביצועי הסטודנטים?', a: 'התקדמות ברמת הסטודנט והכיתה, זמני מענה, שאלות עם אחוזי כישלון גבוהים וסימון סטודנטים בסיכון נשירה.' },
    ],
  },

  en: {
    heroTitleTop: 'Turn every course',
    heroTitleBottom: 'into an immersive journey',
    heroLead:
      'Experiential learning | Involvement and satisfaction | Pedagogical effectiveness | Data-driven insight | An innovative academic position',
    heroCta: 'Book a demo',
    heroMediaAlt: 'Students in an academic lecture hall',

    valueTitle: 'The added value for your academic institution of developing a course and using Yooz',
    valueIntro: 'A comprehensive solution connecting quality pedagogy, student and lecturer satisfaction, and measurable results.',
    valueCards: [
      { tag: 'Proactive retention', icon: '/images/marketing/icons/acad-head-question.svg', title: 'A leap in retention, and fewer dropouts from "boring" courses', body: 'A 3-year study at the Academic College of Tel Aviv-Yafo (2022-2025) found that gamified courses raised student and lecturer satisfaction by 21% and improved grades.', proof: 'Better grades and satisfaction' },
      { tag: 'Genuine Plug & Play', icon: '/images/marketing/icons/acad-puzzle.svg', title: 'An innovative academic position', body: 'Leading innovation in academic teaching and embedding modern technology, differentiating the institution and attracting students who want learning fitted to the digital era.', proof: 'AI technology embedded' },
      { tag: 'Pedagogical Intelligence', icon: '/images/marketing/icons/acad-chart-up.svg', title: 'Real-time behavioural analytics for faculty', body: 'An AI system analyses student performance, alerts the lecturer to problem topics and to the weak points of specific students, so the material can be fixed and adjusted while the course is running.', proof: 'Ongoing reports sent to the lecturer proactively' },
      { tag: 'Clear return on investment', icon: '/images/marketing/icons/acad-piggy.svg', title: 'Fewer support hours, a better reputation', body: 'Retaining students is worth a great deal. The technology lifts interest, grades, learning quality and satisfaction in teaching feedback, and takes repeat questions off lecturers.', proof: 'Return on investment in the short term' },
    ],

    experienceTitle: 'The pedagogical experience',
    experienceIntro: 'A complete learning experience built with ludologists, designers and academic teaching experts.',
    experienceCards: [
      { icon: '/images/marketing/icons/acad-map.svg', tileBg: '#5A1B87', fg: '#FFFFFF', badge: 'AI', badgeBg: '#F4EBFD', title: 'Quest Engine', body: 'Fast, AI-assisted reports that let you change mission difficulty and the knowledge required at short notice.' },
      { icon: '/images/marketing/icons/acad-star-circle.svg', tileBg: '#059669', fg: '#FFFFFF', badge: 'AI', badgeBg: '#F4EBFD', title: 'Medical Simulator', body: 'An interactive simulator for real-time medical decision-making, preparing students for the real world.' },
      { icon: '/images/marketing/icons/acad-swords.svg', tileBg: '#DB2777', fg: '#FFFFFF', title: 'Peer Challenges', body: 'Weekly peer contests and faculty team challenges that drive collaboration and deep social learning.' },
      { icon: '/images/marketing/icons/acad-shield.svg', tileBg: '#4F46E5', fg: '#FFFFFF', title: 'Faculty Command Center', body: 'An intuitive dashboard letting a lecturer launch a class challenge in one click, track comprehension live, and hand out boosts.' },
    ],

    testimonials: [
      { quote: '"For five years I have used the Yooz platform to build an engaging, challenging learning experience... three years of research I ran show a rise in both achievement and involvement"', author: 'Lecturer, Academic College of Tel Aviv-Yafo', initials: 'D.V', avatarBg: '#D1FAE5' },
      { quote: '"We built an advanced simulator to assess medical decision-making by students. It models real situations using AI tools and adds to both the experience and the effectiveness of the learning"', author: 'Lecturer, Nursing Department', initials: 'M.T', avatarBg: '#F3E8FF' },
    ],

    customersTitle: 'Happy customers',
    customers: [
      { name: 'Peres College', caption: 'Bachelor and master course delivery', logoUrl: '/images/marketing/logo-peres.png' },
      { name: 'Academic TLV', caption: 'Five years of gamified courses for hundreds of students a year', logoUrl: '/images/marketing/logo-academic-tlv.png' },
      { name: 'Kinneret', caption: 'Bachelor and master course delivery', logoUrl: '/images/marketing/logo-kinneret.png' },
    ],

    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'Does it suit every field of study?', a: 'Yes. The system is content-agnostic - health sciences, engineering, social sciences and law are all built from the same stations and missions.' },
      { q: 'How much time and effort does adoption take from faculty?', a: 'The first course is built with close support from us and takes a few hours. After that an experienced lecturer assembles a new journey alone.' },
      { q: 'Does a game format lower the academic level?', a: 'Content and requirements stay at the level the lecturer sets. Gamification changes delivery and practice, not the standard.' },
      { q: 'What data does the lecturer get on student performance?', a: 'Progress at student and class level, response times, questions with high failure rates, and flags on students at risk of dropping out.' },
    ],
  },
};
