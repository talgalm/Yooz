/**
 * Copy read off the exported Figma frame `temp-imgs/אתר yooz/ראשי.png`.
 * Headings and list lead-ins are transcribed directly; a few long paragraphs were
 * reconstructed where the export blurred at small sizes, so they are worth a
 * proof-read before launch.
 */
export const texts = {
  he: {
    heroTitleTop: 'יוצרים חוויה.',
    heroTitleBottom: 'מביאים תוצאות.',
    heroLead:
      'פלטפורמה חכמה המשלבת משחוק (Gamification), המעודדת משתתפים להגביר מעורבות, להניע לפעולה ולייצר השפעה מדידה בכל מסע לקוח.',
    heroCta: 'הזמנת דמו',
    heroMediaAlt: 'משתתפים בפעילות Yooz',

    whyTitle: 'למה לבחור Yooz?',
    engage: 'Engage',
    engageText: 'משחוק (gamification) ככלי ליצירת מעורבות אקטיבית ורציפה',
    grow: 'Grow',
    growText: 'פתרונות מיוחדים שמעלים שביעות רצון וביצועים מדידים',
    share: 'Share',
    shareText: 'פתרונות המייצרים אירועים זכירים עבור המשתתפים ומגבירים חשיפה לעסק',

    sectorsTitle: 'מנוע אחד - שלושה מגזרים',
    more: 'איך זה עובד',

    businessTitle: 'הופכים זמן המתנה למנוע צמיחה עסקי',
    businessItems: [
      { bold: 'שילוב משחקונים להנאת הלקוח:', rest: 'פתרון מושלם לרגעי המתנה בתפריט או בהזמנה.' },
      { bold: 'מימוש הטבות מיידי:', rest: 'קופונים ומתנות שמעלים את ממוצע הרכישה ומעודדים חזרה.' },
      { bold: 'הפיכת לקוח לשגריר:', rest: 'שיתוף אורגני של ההישגים ברשתות חברתיות.' },
    ],
    businessMediaAlt: 'לקוח משחק במסעדה',

    academyTitle: 'משחוק מותאם אישית ללימודים והדרכה',
    academyItems: [
      { bold: 'למידה חווייתית ואינטראקטיבית:', rest: 'הופכים סילבוס ומצגות למסע הרפתקה פעיל.' },
      { bold: 'מניעת נשירה ואפקטיביות פדגוגית:', rest: 'מוטיבציה תכופה והגשת מטלות בזמן.' },
      { bold: 'מיצוב אקדמי חדשני:', rest: 'למידה מותאמת לעידן הדיגיטלי והטמעת כלים מתקדמים.' },
    ],
    academyMediaAlt: 'כיתה אקדמית בפעילות Yooz',

    tourismTitle: 'הופכים כל סיור לחוויה אינטראקטיבית',
    tourismItems: [
      { bold: 'ניווט ומשימות שטח:', rest: 'אתגרי GPS, חידוני מורשת ונקודות עניין סוחפות.' },
      { bold: 'הארכת זמן שהייה באתר:', rest: 'עלייה של פי 1.5 בזמן הביקור והנאה מכל תחנה.' },
      { bold: 'ללא צורך בהורדת אפליקציה:', rest: 'פתיחה ישירה בדפדפן בטלפון הנייד.' },
    ],
    tourismMediaAlt: 'מטיילים בעיר העתיקה',

    customersTitle: 'לקוחות מרוצים',
    customers: [
      { name: 'תל קאקון', caption: 'תעלומת האוצר הממלכתי', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'מכללת כנרת', caption: 'הנחיית קורסים תואר ראשון ושני', logoUrl: '/images/marketing/logo-kinneret.png' },
      { name: 'גני יהושוע', caption: 'פארקוד - פעילות קבועה לקבוצות', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'שדה אליהו', caption: 'פעילות מרכז מבקרים', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
      { name: 'מכללת פרס', caption: 'הנחיית קורסים תואר ראשון ושני', logoUrl: '/images/marketing/logo-peres.png' },
      { name: 'האקדמית', caption: 'סימולטור לקבלת החלטות רפואיות', logoUrl: '/images/marketing/logo-academic-tlv.png' },
      { name: 'קופ״ח כללית', caption: 'פעילות גיבוש עובדים בפריסה רחבה', logoUrl: '/images/marketing/logo-clalit.svg' },
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

    faqTitle: 'שאלות נפוצות',
    faq: [
      {
        q: 'מה זה בעצם Yooz ואיך זה עובד?',
        a: 'Yooz היא פלטפורמת משחוק שמאפשרת לבנות פעילות אינטראקטיבית שהמשתתפים מריצים מהנייד שלהם, בלי להוריד אפליקציה. אתם מגדירים תחנות, משימות וניקוד, והמערכת מנהלת את המסע ואוספת את הנתונים.',
      },
      {
        q: 'למי השירות שלנו מתאים?',
        a: 'לאתרי תיירות ופארקים, למוסדות אקדמיים, לארגונים שמטמיעים תהליכי שינוי ולעסקים שרוצים להפוך זמן המתנה לזמן מכירה. כל מגזר מקבל התאמה משלו.',
      },
      {
        q: 'במה זה שונה מעוד אפליקציה או חידון רגיל?',
        a: 'החוויה נבנית סביב המקום והתוכן שלכם, רצה בדפדפן ללא התקנה, ומייצרת בסופה תוצר אישי שהמשתתף רוצה לשתף. במקביל אתם מקבלים מדידה מלאה של כל שלב.',
      },
      {
        q: 'כמה זמן לוקח להקים ולהשיק פעילות?',
        a: 'פעילות מבוססת תבנית קיימת עולה לאוויר תוך ימים ספורים. פעילות מותאמת לעומק, עם תוכן וצילומים ייעודיים, נמשכת בדרך כלל מספר שבועות.',
      },
      {
        q: 'איזה מידע ונתונים מקבלים בסיום או תוך כדי הפעילות?',
        a: 'דוח מלא ברמת המשתתף והקבוצה: התקדמות בין תחנות, ציונים, זמני שהייה, נקודות נטישה ושיתופים ברשתות. הנתונים זמינים בזמן אמת ובייצוא בסיום.',
      },
    ],
  },

  en: {
    heroTitleTop: 'Create the experience.',
    heroTitleBottom: 'Deliver the results.',
    heroLead:
      'A smart platform built on gamification that raises participant involvement, moves people to act, and creates measurable impact across the whole customer journey.',
    heroCta: 'Book a demo',
    heroMediaAlt: 'Participants in a Yooz activity',

    whyTitle: 'Why choose Yooz?',
    engage: 'Engage',
    engageText: 'Gamification as the tool for active, sustained involvement',
    grow: 'Grow',
    growText: 'Distinctive solutions that raise satisfaction and measurable performance',
    share: 'Share',
    shareText: 'Solutions that create memorable moments for participants and grow exposure for the business',

    sectorsTitle: 'One engine, three sectors',
    more: 'How it works',

    businessTitle: 'Turn waiting time into a business growth engine',
    businessItems: [
      { bold: 'Gameplay the customer enjoys:', rest: 'a perfect fit for the waiting moments over a menu or an order.' },
      { bold: 'Instant reward redemption:', rest: 'coupons and gifts that lift average spend and encourage a return.' },
      { bold: 'The customer becomes an ambassador:', rest: 'organic sharing of achievements on social networks.' },
    ],
    businessMediaAlt: 'A customer playing in a restaurant',

    academyTitle: 'Personalised gamification for learning and training',
    academyItems: [
      { bold: 'Experiential, interactive learning:', rest: 'turns a syllabus and slides into an active adventure.' },
      { bold: 'Retention and pedagogical effectiveness:', rest: 'frequent motivation and assignments handed in on time.' },
      { bold: 'An innovative academic position:', rest: 'learning fitted to the digital era, with modern tools embedded.' },
    ],
    academyMediaAlt: 'An academic classroom in a Yooz activity',

    tourismTitle: 'Turn every tour into an interactive experience',
    tourismItems: [
      { bold: 'Navigation and field missions:', rest: 'GPS challenges, heritage quizzes and absorbing points of interest.' },
      { bold: 'Longer dwell time on site:', rest: 'a 1.5x rise in visit length, and enjoyment at every station.' },
      { bold: 'No app download needed:', rest: 'opens straight in the browser on a mobile phone.' },
    ],
    tourismMediaAlt: 'Travellers in the old city',

    customersTitle: 'Happy customers',
    customers: [
      { name: 'Tel Qaqun', caption: 'The royal treasure mystery', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'Kinneret College', caption: 'Bachelor and master course delivery', logoUrl: '/images/marketing/logo-kinneret.png' },
      { name: 'Ganei Yehoshua', caption: 'ParKod - a standing group activity', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'Sde Eliyahu', caption: 'Visitor centre activity', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
      { name: 'Peres College', caption: 'Bachelor and master course delivery', logoUrl: '/images/marketing/logo-peres.png' },
      { name: 'Academic TLV', caption: 'Medical decision-making simulator', logoUrl: '/images/marketing/logo-academic-tlv.png' },
      { name: 'Clalit Health', caption: 'Employee engagement activity at scale', logoUrl: '/images/marketing/logo-clalit.svg' },
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

    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'What is Yooz, and how does it work?', a: 'Yooz is a gamification platform for building interactive activities that participants run from their own phone, with no app to install. You define stations, missions and scoring; the system runs the journey and collects the data.' },
      { q: 'Who is the service for?', a: 'Tourist sites and parks, academic institutions, organisations rolling out change processes, and businesses that want to turn waiting time into selling time. Each sector gets its own adaptation.' },
      { q: 'How is this different from another app or an ordinary quiz?', a: 'The experience is built around your place and your content, runs in the browser with no install, and ends in a personal artefact participants want to share. Meanwhile you get full measurement of every step.' },
      { q: 'How long does it take to build and launch an activity?', a: 'An activity based on an existing template goes live within days. A deeply customised one, with dedicated content and photography, usually takes a few weeks.' },
      { q: 'What data do we get during and after the activity?', a: 'A full report at participant and group level: progress between stations, scores, dwell times, drop-off points and social shares. Available live and as an export at the end.' },
    ],
  },
};
