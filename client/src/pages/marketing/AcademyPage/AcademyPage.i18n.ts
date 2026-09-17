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

    valueTitle: 'מה יוצא למוסד שלכם מהטמעת Yooz?',
    valueIntro: 'פתרון מקיף שמחבר בין פדגוגיה איכותית לתוצאות ארגוניות מדידות.',
    valueCards: [
      {
        tag: 'מניעת נטישה פרואקטיבית',
        tagColor: '#1E8A53',
        tileBg: '#E4F6EA',
        icon: '❓',
        title: 'זינוק בשימור סטודנטים ומניעת נשירה מקורסים קשים',
        body: 'קורסי סינון ומבואות גורמים לתסכול רב. בעזרת מיקרו-תגמולים, משוב מיידי ומנגנון "Level-Up", הסטודנטים מרגישים התקדמות רציפה ולא נכנעים לפערי למידה ראשוניים.',
        proof: 'שיפור של 28% בממוצע ציוני מעבר קורסים ראשוניים',
      },
      {
        tag: 'Plug & Play אמיתי',
        tagColor: '#6A0E9A',
        tileBg: '#EEE2FA',
        icon: '🧩',
        title: 'מיצוב אקדמי חדשני',
        body: 'הובלת חדשנות בהוראה אקדמית והטמעת טכנולוגיות מתקדמות, המבדלות את המוסד ומושכות סטודנטים המחפשים למידה רלוונטית ומותאמת לעידן הדיגיטלי.',
        proof: 'הטמעת טכנולוגיות AI',
      },
      {
        tag: 'החזר השקעה מובהק',
        tagColor: '#1E8A53',
        tileBg: '#E4F6EA',
        icon: '🐷',
        title: 'חיסכון בשעות תגבור ושיפור המוניטין',
        body: 'שימור סטודנטים באקדמיה שווה מאות אלפי שקלים בשכר לימוד. הפחתת עומסי מרצים במענה לשאלות חוזרות, חיסכון במועדי ג׳ ושיפור משמעותי במשוב ההוראה המוסדי.',
        proof: 'החזר השקעה מלא כבר בסמסטר הראשון',
      },
      {
        tag: 'Pedagogical Intelligence',
        tagColor: '#D6337F',
        tileBg: '#FBE2EE',
        icon: '📈',
        title: 'דאטה ואנליטיקה התנהגותית בזמן אמת לסגל האקדמי',
        body: 'מערכת בינה מלאכותית מנטרת תבניות אינטראקציה, מזהה מראש נקודות חולשה של סטודנטים מתקשים, ומתריעה למרצה עוד לפני שהסטודנט שוקל לפרוש מהקורס.',
        proof: 'דוחות חיזוי הצלחה בדיוק של מעל 91%',
      },
    ],

    experienceTitle: 'החוויה הפדגוגית',
    experienceIntro:
      'חוויה פדגוגית שלמה שנבנתה בשיתוף חוקרי מוח, מעצבי משחקים עטורי פרסים ומומחי הוראה אקדמית.',
    experienceCards: [
      { icon: '🗺️', tileBg: '#4A1172', fg: '#FFFFFF', badge: 'AI', title: 'Quest Engine', body: 'הופך סילבוס סטטי למפת הרפתקה אינטראקטיבית. אלגוריתם ה-AI מתאים את רמת הקושי של המשימות לקצב האישי של כל סטודנט.' },
      { icon: '⚕️', tileBg: '#17935C', fg: '#FFFFFF', badge: 'AI', title: 'Medical Simulator', body: 'סימולטור אינטראקטיבי לקבלת החלטות רפואיות בזמן אמת, במטרה להכין את הסטודנטים לעולם האמיתי.' },
      { icon: '⚔️', tileBg: '#E0357F', fg: '#FFFFFF', title: 'Peer Challenges', body: 'תחרויות עמיתים שבועיות, אתגרי צוותים פקולטיים שמדרבנים שיתוף פעולה ולמידה חברתית עמוקה.' },
      { icon: '🛡️', tileBg: '#7B1FC0', fg: '#FFFFFF', title: 'Faculty Command Center', body: 'דשבורד אינטואיטיבי המאפשר למרצה להשיק אתגר כיתתי בלחיצת כפתור אחת, לעקוב אחר הבנת החומר בזמן אמת, ולהעניק ״בוסטים״.' },
    ],

    testimonials: [
      {
        quote:
          '"מזה 5 שנים אני משתמש בפלטפורמת Yooz כדי לייצר חוויית למידה מעניינת ומאתגרת... תוצאות המחקר שערכתי במשך 3 שנים מצביעות על עלייה בהישגים ובמעורבות"',
        author: 'מרצה במכללה האקדמית בתל אביב יפו',
        initials: 'ד.ו',
        avatarBg: '#CFEBD8',
      },
      {
        quote:
          '"פיתחנו סימולטור מתקדם לבדיקת מידת קבלת החלטות רפואיות על ידי הסטודנטים. הסימולטור מדמה מצבי אמת באמצעות כלי AI ותורם לחוויית ואפקטיביות הלמידה"',
        author: 'מרצה בחוג לסיעוד',
        initials: 'מ.ט',
        avatarBg: '#E3D4F5',
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

    valueTitle: 'What does your institution gain from Yooz?',
    valueIntro: 'A comprehensive solution connecting quality pedagogy to measurable institutional results.',
    valueCards: [
      { tag: 'Proactive retention', tagColor: '#1E8A53', tileBg: '#E4F6EA', icon: '❓', title: 'A leap in retention, and fewer dropouts from hard courses', body: 'Gateway and foundation courses cause real frustration. With micro-rewards, instant feedback and a Level-Up mechanic, students feel continuous progress instead of surrendering to early gaps.', proof: '28% improvement in average foundation-course pass grades' },
      { tag: 'Genuine Plug & Play', tagColor: '#6A0E9A', tileBg: '#EEE2FA', icon: '🧩', title: 'An innovative academic position', body: 'Leading innovation in academic teaching and embedding modern technology, differentiating the institution and attracting students who want learning fitted to the digital era.', proof: 'AI technology embedded' },
      { tag: 'Clear return on investment', tagColor: '#1E8A53', tileBg: '#E4F6EA', icon: '🐷', title: 'Fewer support hours, a better reputation', body: 'Retaining students is worth hundreds of thousands in tuition. Less lecturer load answering repeat questions, fewer resit sittings, and a marked lift in institutional teaching feedback.', proof: 'Full payback within the first semester' },
      { tag: 'Pedagogical Intelligence', tagColor: '#D6337F', tileBg: '#FBE2EE', icon: '📈', title: 'Real-time behavioural analytics for faculty', body: 'An AI system monitors interaction patterns, identifies weak points for struggling students in advance, and alerts the lecturer before the student considers leaving the course.', proof: 'Success-prediction reports accurate to over 91%' },
    ],

    experienceTitle: 'The pedagogical experience',
    experienceIntro: 'A complete learning experience built with brain researchers, award-winning game designers and academic teaching experts.',
    experienceCards: [
      { icon: '🗺️', tileBg: '#4A1172', fg: '#FFFFFF', badge: 'AI', title: 'Quest Engine', body: 'Turns a static syllabus into an interactive adventure map. The AI algorithm fits mission difficulty to each student’s own pace.' },
      { icon: '⚕️', tileBg: '#17935C', fg: '#FFFFFF', badge: 'AI', title: 'Medical Simulator', body: 'An interactive simulator for real-time medical decision-making, preparing students for the real world.' },
      { icon: '⚔️', tileBg: '#E0357F', fg: '#FFFFFF', title: 'Peer Challenges', body: 'Weekly peer contests and faculty team challenges that drive collaboration and deep social learning.' },
      { icon: '🛡️', tileBg: '#7B1FC0', fg: '#FFFFFF', title: 'Faculty Command Center', body: 'An intuitive dashboard letting a lecturer launch a class challenge in one click, track comprehension live, and hand out boosts.' },
    ],

    testimonials: [
      { quote: '"For five years I have used the Yooz platform to build an engaging, challenging learning experience... three years of research I ran show a rise in both achievement and involvement"', author: 'Lecturer, Academic College of Tel Aviv-Yafo', initials: 'D.V', avatarBg: '#CFEBD8' },
      { quote: '"We built an advanced simulator to assess medical decision-making by students. It models real situations using AI tools and adds to both the experience and the effectiveness of the learning"', author: 'Lecturer, Nursing Department', initials: 'M.T', avatarBg: '#E3D4F5' },
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
