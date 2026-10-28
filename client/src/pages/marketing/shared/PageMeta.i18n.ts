import type { Texts } from '../../../context/LanguageContext';
import type { MarketingRoute } from './routes';

export interface PageMetaText {
  title: string;
  description: string;
}

export type PageMetaTexts = Record<MarketingRoute['key'], PageMetaText>;

export const texts: Texts<PageMetaTexts> = {
  he: {
    home: {
      title: 'Yooz | פלטפורמת גיימיפיקציה לחוויות שמביאות תוצאות',
      description:
        'Yooz היא פלטפורמה משולבת גיימיפיקציה לבניית פעילויות אינטראקטיביות שמשחקים מהנייד, בלי להוריד אפליקציה. לאתרי תיירות, עסקים, מוסדות אקדמיים וארגונים.',
    },
    business: {
      title: 'Yooz לעסקים | משחקים שמגדילים מכירות ומחזירים לקוחות',
      description:
        'הופכים את זמן ההמתנה במסעדה, בחנות או בסטודיו לחוויה: משחקונים מהנייד, קופונים למימוש מיידי ושיתוף ברשתות שמגדילים את הסל ומחזירים לקוחות.',
    },
    tourism: {
      title: 'Yooz לתיירות | סיורים ופעילויות אינטראקטיביות',
      description:
        'גיימיפיקציה לאתרי תיירות, פארקים, מוזיאונים ומסלולים בטבע: חידות שטח, סריקת QR ומשימות מהנייד שמאריכות את הביקור ומעלות את המעורבות.',
    },
    academy: {
      title: 'Yooz לאקדמיה | קורסים משולבי גיימיפיקציה',
      description:
        'הופכים קורס למסע למידה: משחוק, כלי AI ודוחות למרצה בזמן אמת. מחקר של 3 שנים מצא עלייה של 21% בשביעות הרצון של סטודנטים ומרצים ושיפור בציונים.',
    },
    about: {
      title: 'אודות Yooz | הסיפור והצוות שלנו',
      description:
        'Yooz מחברת בין גיימיפיקציה, תוכן, טכנולוגיה וחוויה ליצירת פתרונות לארגונים, תיירות, עסקים ואקדמיה. הכירו את הסיפור שלנו ואת הצוות.',
    },
  },
  en: {
    home: {
      title: 'Yooz | Gamification for experiences that deliver results',
      description:
        'Yooz is a gamification platform for interactive activities played on the phone, no app needed. For tourism sites, businesses, academia and organizations.',
    },
    business: {
      title: 'Yooz for business | Games that grow sales and loyalty',
      description:
        'Turn waiting time at restaurants, shops and studios into play: phone games, instant coupons and social sharing that grow sales and bring customers back.',
    },
    tourism: {
      title: 'Yooz for tourism | Interactive tours and activities',
      description:
        'Gamification for tourism sites, parks, museums and nature trails: field puzzles, QR scans and phone missions that extend the visit and raise engagement.',
    },
    academy: {
      title: 'Yooz for academia | Gamified courses',
      description:
        'Turn a course into a learning journey: gamification, AI tools and live lecturer reports. A 3-year study found 21% higher satisfaction and better grades.',
    },
    about: {
      title: 'About Yooz | Our story and team',
      description:
        'Yooz combines gamification, content, technology and experience into solutions for organizations, tourism, businesses and academia. Meet our story and our team.',
    },
  },
};
