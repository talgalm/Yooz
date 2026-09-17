/**
 * Copy read off the exported Figma frame `temp-imgs/אתר yooz/המגזר העסקי.png`.
 * Headings and card titles are transcribed directly; a few long paragraphs were
 * reconstructed where the export blurred at small sizes.
 */
export const texts = {
  he: {
    heroTitleTop: 'הופכים חוויות',
    heroTitleBottom: 'למנוע צמיחה עסקי',
    heroBullets: [
      'מיועד לרשתות מזון מהיר, פארקים, אתרי תיירות ועוד',
      'שילוב משחקונים להנאת הלקוח בזמן ההמתנה לאוכל או לשירות',
      'אפשרות להענקת קופונים למימוש מיידי המעלות את ממוצע הרכישה ומעודדות קנייה חוזרת',
      'הפיכת הלקוח לשגריר המותג דרך שיתוף תכנים ברשתות החברתיות',
    ],
    heroCta: 'הזמנת דמו',
    heroSecondary: 'המודל העסקי',
    heroMediaAlt: 'לקוחות משחקים במסעדה',

    salesTitle: 'להפוך זמן המתנה למנוע מכירות',
    salesIntro:
      'הפכו את הדקות המתות שבין ההזמנה לקבלת המנה או השירות לחוויה ממכרת שמעלה רווחים ומחזירה לקוחות',
    salesCards: [
      { icon: '🏪', title: 'מותאם לכל ענף בקלות', desc: 'מסעדות והמבורגרים, פיצריות, בתי קפה, מכוני כושר, קליניקות וחנויות רחוב - התאמה מלאה למותג.' },
      { icon: '📣', title: 'ויראליות ושיתוף ברשתות', desc: 'העלאת סטורי לאינסטגרם או לטיקטוק עם תיוג העסק, תמורת תגמול משחקי אטרקטיבי.' },
      { icon: '🏷️', title: 'קנייה חוזרת ומועדון לקוחות', desc: 'צבירת נקודות וקופון אישי עבור הקנייה הבאה, המבטיחים ביקור חוזר.' },
      { icon: '🛒', title: 'הגדלת סל הקנייה במקום', desc: 'שדרוג מנה, שתייה מוגדלת, קינוח או תוספת באמצעות זכייה בפרס מיידי תוך כדי שהלקוח יושב בעסק.' },
      { icon: '⏱️', title: 'קיצור זמן המתנה סובייקטיבי', desc: 'חוויית לקוח כיפית בלי תסכול בזמן שהאוכל בהכנה, בתור לקופה או בהמתנה למאמן בסטודיו.' },
    ],

    audienceTitle: 'למי Yooz יתאים?',
    audienceCards: [
      { label: 'רשתות מזון והמבורגרים', title: 'משחקים על המגש והשולחן', body: 'משחקונים מהירים מהטלפון בזמן צליית ההמבורגר, הגדלת ארוחה בחינם או הנחה על קינוח במימוש מיידי בקופה.' },
      { label: 'פיצריות', title: 'טריוויה וכרטיסיית ניקוב', body: 'אתגרי טריוויה מהנים בזמן אפיית הפיצה, הזדמנות לתת ללקוחות ללמוד על העסק ולהתחבר אליו.' },
      { label: 'חדרי כושר וסטודיו', title: 'אתגרי אימון ושייק-בר', body: 'אתגרי אימון יומיים, צבירת נקודות על התמדה, משחקונים בלובי המועדון והטבות שוות לרכישת שייקים וביגוד.' },
      { label: 'קמעונאות וחנויות', title: 'סריקה בקופה ובמדף', body: 'סריקת קוד QR בעמדת התור או על גבי המדף מעניקה הנחה מפתיעה הממומשת ישירות בעמדת התשלום.' },
    ],

    customersTitle: 'לקוחות מרוצים',
    customers: [
      { name: 'קופ״ח כללית', caption: 'פעילות גיבוש עובדים בפריסה רחבה' },
      { name: 'תל קאקון', caption: 'תעלומת האוצר הממלכתי', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'גני יהושוע', caption: 'פארקוד - פעילות קבועה לקבוצות', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'שדה אליהו', caption: 'פעילות מרכז מבקרים', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
    ],

    testimonials: [
      {
        quote: '"הפעילות הפכה את זמן ההמתנה מנטל לחלק מהחוויה. הלקוחות יוצאים מרוצים ומשתפים את זה ברשתות"',
        author: 'מנהל רשת מסעדות',
        initials: 'א.ל',
        avatarBg: '#CFEBD8',
      },
      {
        quote: '"ראינו עלייה מדידה בשווי ההזמנה הממוצעת כבר בחודש הראשון להפעלה, בלי להוסיף אף עובד"',
        author: 'סמנכ״ל שיווק ברשת קמעונאית',
        initials: 'ס.כ',
        avatarBg: '#E3D4F5',
      },
    ],

    faqTitle: 'שאלות נפוצות',
    faq: [
      { q: 'איך הלקוח מתחיל לשחק? צריך להוריד אפליקציה?', a: 'לא. סריקת QR בשולחן או בעמדה פותחת את הפעילות בדפדפן של הלקוח, בלי התקנה ובלי הרשמה.' },
      { q: 'איך מונעים חלוקת יתר של פרסים ושומרים על התקציב?', a: 'אתם מגדירים תקרה לכמות הקופונים, את שוויים ואת תנאי המימוש. המערכת עוצרת אוטומטית בהגעה לתקרה.' },
      { q: 'האם המשחקים ממותגים בשפת העסק ובתפריט שלי?', a: 'כן. צבעים, לוגו, תמונות ותוכן המשימות נבנים סביב המותג והתפריט שלכם.' },
      { q: 'כמה זמן לוקח להקים ולהשיק פעילות?', a: 'פעילות מבוססת תבנית עולה לאוויר תוך ימים ספורים. התאמה מלאה נמשכת בדרך כלל מספר שבועות.' },
      { q: 'איזה מידע ונתונים מקבלים בסיום או תוך כדי הפעילות?', a: 'כמות משתתפים, זמני שהייה, מימוש קופונים, שיתופים ברשתות ונקודות נטישה - בזמן אמת ובייצוא בסיום.' },
    ],
  },

  en: {
    heroTitleTop: 'Turn experiences',
    heroTitleBottom: 'into a growth engine',
    heroBullets: [
      'Built for fast-food chains, parks, tourist sites and more',
      'Gameplay the customer enjoys while waiting for food or service',
      'Coupons for immediate redemption that lift average spend and drive repeat purchase',
      'Turns the customer into a brand ambassador through social sharing',
    ],
    heroCta: 'Book a demo',
    heroSecondary: 'The business model',
    heroMediaAlt: 'Customers playing in a restaurant',

    salesTitle: 'Turn waiting time into a sales engine',
    salesIntro:
      'Turn the dead minutes between the order and the food into an experience that lifts profit and brings customers back',
    salesCards: [
      { icon: '🏪', title: 'Fits any sector easily', desc: 'Restaurants, pizzerias, cafes, gyms, clinics and high-street shops - fully adapted per brand.' },
      { icon: '📣', title: 'Virality and social sharing', desc: 'A story posted to Instagram or TikTok tagging the business, in exchange for an attractive in-game reward.' },
      { icon: '🏷️', title: 'Repeat purchase and loyalty', desc: 'Points and a personal coupon toward the next purchase, which secures a return visit.' },
      { icon: '🛒', title: 'Real basket growth on site', desc: 'A larger dish, an upsized drink or a dessert won as an instant prize while the customer is still seated.' },
      { icon: '⏱️', title: 'Shorter perceived wait', desc: 'An enjoyable experience instead of frustration while food is prepared or a queue moves.' },
    ],

    audienceTitle: 'Who is Yooz for?',
    audienceCards: [
      { label: 'Food and burger chains', title: 'Games on the tray and the table', body: 'Quick phone games while the burger grills, a free upsize or a dessert discount redeemed at the till.' },
      { label: 'Pizzerias', title: 'Trivia and a punch card', body: 'Enjoyable trivia while the pizza bakes, a chance for customers to learn about the business and connect with it.' },
      { label: 'Gyms and studios', title: 'Training challenges and the shake bar', body: 'Daily training challenges, points for consistency, lobby games and real rewards toward shakes and kit.' },
      { label: 'Retail and stores', title: 'Scan at the till and the shelf', body: 'Scanning a QR in the queue or on the shelf gives a surprise discount redeemed straight at the checkout.' },
    ],

    customersTitle: 'Happy customers',
    customers: [
      { name: 'Clalit Health', caption: 'Employee engagement activity at scale' },
      { name: 'Tel Qaqun', caption: 'The royal treasure mystery', logoUrl: '/images/marketing/logo-tel-qaqun.png' },
      { name: 'Ganei Yehoshua', caption: 'ParKod - a standing group activity', logoUrl: '/images/marketing/logo-ganei-yehoshua.png' },
      { name: 'Sde Eliyahu', caption: 'Visitor centre activity', logoUrl: '/images/marketing/logo-sde-eliyahu.png' },
    ],

    testimonials: [
      { quote: '"The activity turned waiting time from a burden into part of the experience. Customers leave happy and share it."', author: 'Restaurant chain manager', initials: 'A.L', avatarBg: '#CFEBD8' },
      { quote: '"We saw a measurable rise in average order value within the first month, without adding a single member of staff."', author: 'VP Marketing, retail chain', initials: 'S.K', avatarBg: '#E3D4F5' },
    ],

    faqTitle: 'Frequently asked questions',
    faq: [
      { q: 'How does a customer start playing? Is an app needed?', a: 'No. Scanning a QR at the table or stand opens the activity in the browser, with no install and no signup.' },
      { q: 'How do we avoid over-issuing prizes and keep to budget?', a: 'You set a cap on coupon volume, their value and the redemption terms. The system stops automatically at the cap.' },
      { q: 'Are the games branded in our own look and menu?', a: 'Yes. Colours, logo, imagery and mission content are built around your brand and menu.' },
      { q: 'How long does it take to build and launch?', a: 'A template-based activity goes live within days. Full customisation usually takes a few weeks.' },
      { q: 'What data do we get during and after the activity?', a: 'Participant volume, dwell times, coupon redemption, social shares and drop-off points, live and as an export.' },
    ],
  },
};
