import { Schema, model, Types } from 'mongoose';

export interface LocalizedText {
  he: string;
  en: string;
}

export interface IProject {
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
  linkUrl?: string;
}

export interface IAudience {
  key: string;
  title: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
  projects: IProject[];
}

export interface IBooster {
  key: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  description: LocalizedText;
  imageUrl?: string;
}

export interface ICustomerLogo {
  name: string;
  imageUrl?: string;
  linkUrl?: string;
}

export interface ISiteContent {
  _id: Types.ObjectId;
  brandLogoUrl: string;
  hero: {
    badge: LocalizedText;
    title: LocalizedText;
    subtitle: LocalizedText;
    ctaLabel: LocalizedText;
    ctaUrl: string;
    phoneImageUrl: string;
  };
  audiences: IAudience[];
  engine: {
    title: LocalizedText;
    intro: LocalizedText;
    boosters: IBooster[];
  };
  customers: {
    title: LocalizedText;
    logos: ICustomerLogo[];
  };
  contact: {
    title: LocalizedText;
    email: string;
    phone: string;
  };
  updatedAt: Date;
}

const localized = () => ({ he: { type: String, default: '' }, en: { type: String, default: '' } });

const projectSchema = new Schema<IProject>(
  { title: localized(), description: localized(), imageUrl: String, linkUrl: String },
  { _id: false },
);

const audienceSchema = new Schema<IAudience>(
  { key: String, title: localized(), description: localized(), imageUrl: String, projects: { type: [projectSchema], default: [] } },
  { _id: false },
);

const boosterSchema = new Schema<IBooster>(
  { key: String, title: localized(), subtitle: localized(), description: localized(), imageUrl: String },
  { _id: false },
);

const logoSchema = new Schema<ICustomerLogo>(
  { name: String, imageUrl: String, linkUrl: String },
  { _id: false },
);

const siteContentSchema = new Schema<ISiteContent>({
  brandLogoUrl: { type: String, default: '/images/logo-purple.png' },
  hero: {
    badge: localized(),
    title: localized(),
    subtitle: localized(),
    ctaLabel: localized(),
    ctaUrl: { type: String, default: 'mailto:info@yooz.plus' },
    phoneImageUrl: { type: String, default: '' },
  },
  audiences: { type: [audienceSchema], default: [] },
  engine: {
    title: localized(),
    intro: localized(),
    boosters: { type: [boosterSchema], default: [] },
  },
  customers: {
    title: localized(),
    logos: { type: [logoSchema], default: [] },
  },
  contact: {
    title: localized(),
    email: { type: String, default: 'info@yooz.plus' },
    phone: { type: String, default: '' },
  },
  updatedAt: { type: Date, default: Date.now },
});

export const SiteContent = model<ISiteContent>('SiteContent', siteContentSchema, 'siteContent');

const T = (he: string, en: string): LocalizedText => ({ he, en });

export const DEFAULT_SITE_CONTENT = {
  brandLogoUrl: '/images/logo-purple.png',
  hero: {
    badge: T('פלטפורמה', 'Platform'),
    title: T('YOOZ – Marketing Engine', 'YOOZ – Marketing Engine'),
    subtitle: T('הופכים חוויות למנוע צמיחה עסקי דיגיטלי', 'Turning experiences into a digital business-growth engine'),
    ctaLabel: T('קבעו דמו עכשיו', 'Book a demo now'),
    ctaUrl: '#contact',
    phoneImageUrl: '',
  },
  audiences: [
    {
      key: 'tourism',
      title: T('תיירות', 'Tourism'),
      description: T('פארקים עירוניים, אתרי תיירות וחברות טיולים', 'Urban parks, tourist sites and travel companies'),
      imageUrl: '',
      projects: [
        { title: T('גני יהושוע – פארקוד', 'Yehoshua Gardens – ParKod'), description: T('פרויקט לדוגמא', 'Featured project'), linkUrl: 'https://youtu.be/8Fzy4t5Sm-E' },
        { title: T('תל קאקון – המטמון של ביברס', "Tel Qaqun – Baybars' Treasure"), description: T('', '') },
        { title: T('מרכז מבקרים שדה אליהו', 'Sde Eliyahu Visitor Center'), description: T('', '') },
        { title: T('משחק נסיעה לטיולי בתי ספר', 'A travel game for school trips'), description: T('פתרונות משחוק לחברות טיולים', 'Gamified solutions for travel companies') },
      ],
    },
    {
      key: 'business',
      title: T('עסקים', 'Business'),
      description: T('רשתות מזון מהיר, חדרי כושר ועוד', 'Fast-food chains, gyms and more'),
      imageUrl: '',
      projects: [],
    },
    {
      key: 'academy',
      title: T('מוסדות אקדמאיים', 'Academic Institutions'),
      description: T('מכללות ואוניברסיטאות – לצבוע את הלמידה וההדרכה בעזרת GAMIFICATION', 'Colleges and universities – coloring learning and training with GAMIFICATION'),
      imageUrl: '',
      projects: [
        { title: T('האקדמית תל אביב יפו – החוג לסיעוד', 'Academic College of Tel Aviv-Yafo – Nursing Dept.'), description: T('משחוק קורסים (כ-5 שנים)', 'Gamified courses (~5 years)') },
        { title: T('סימולטור לקבלת החלטות רפואיות משולב AI', 'AI-integrated medical decision-making simulator'), description: T('', '') },
        { title: T('המכללה האקדמית כנרת', 'Kinneret Academic College'), description: T('הקמת פרויקט על ידי הסטודנטים', 'A project built by the students') },
        { title: T('מכללת פרס', 'Peres College'), description: T('פרויקט לסטודנטים', 'A student project') },
      ],
    },
    {
      key: 'organizations',
      title: T('ארגונים', 'Organizations'),
      description: T('הי-טק, שירותים, בריאות, פיננסים וציבורי – משחוק תהליכי שינוי בעזרת GAMIFICATION', 'Hi-tech, services, health, finance and public – gamifying change processes with GAMIFICATION'),
      imageUrl: '',
      projects: [
        { title: T('הטמעת תקן בינלאומי לאיכות סביבה', 'Rolling out an international environmental-quality standard'), description: T('פיתוח ערכת הפעלה (בטרולי) ושליחת הערכה ל-52 אתרי החברה בעולם', 'An activation kit (trolley) sent to 52 company sites worldwide') },
        { title: T('חברת חשמל – הטמעת הקוד האתי', 'Israel Electric Corp. – embedding the code of ethics'), description: T('', '') },
        { title: T('MAX – הטמעת הערך "חוסן קבוצתי"', 'MAX – embedding the value of "group resilience"'), description: T('באמצעות ערכת הפעלה', 'Via an activation kit') },
        { title: T('משחוק תהליכי שינוי בארגונים', 'Gamifying organizational change'), description: T('out4in', 'out4in'), linkUrl: 'https://www.out4in.com/organizational-process' },
      ],
    },
  ],
  engine: {
    title: T('Yooz Marketing Engine', 'Yooz Marketing Engine'),
    intro: T(
      'הופכת את ביקור הלקוח למחזור שיווקי: באמצעות שלושת הבוסטרים המרכזיים המערכת הופכת את המבקרים לשגרירים דיגיטליים, מעמיקה את החוויה שלהם באתר ומניעה אותם לרכישות וביקורים חוזרים.',
      'Turns a customer visit into a marketing cycle: three core boosters turn visitors into digital ambassadors, deepen their experience and drive repeat purchases and visits.',
    ),
    boosters: [
      { key: 'share', title: T('Share Booster', 'Share Booster'), subtitle: T('מכונת תוכן לרשתות חברתיות', 'Content machine for social networks'), description: T('Yooz AutoClip מייצר סרטון אישי אוטומטי שהמבקר משתף בלחיצת כפתור – והאתר מרוויח תוכן אורגני.', 'Yooz AutoClip auto-generates a personal clip visitors share in one tap – free organic content for the site.'), imageUrl: '' },
      { key: 'stay', title: T('Stay Booster', 'Stay Booster'), subtitle: T('חוויה הוליסטית סוחפת', 'An immersive holistic experience'), description: T('משימות מאתגרות ופעילות משחקית יוצרות חיבור רגשי ומאריכות את השהות.', 'Challenging missions and gameplay create emotional connection and extend the stay.'), imageUrl: '' },
      { key: 'spend', title: T('Spend Booster', 'Spend Booster'), subtitle: T('הגדלת פדיון ורכישות', 'Growing revenue and purchases'), description: T('המערכת שולחת קופוני הנחה לרכישות באתר ולביקור הבא.', 'The system sends discount coupons for on-site purchases and the next visit.'), imageUrl: '' },
    ],
  },
  customers: {
    title: T('לקוחות', 'Customers'),
    logos: [],
  },
  contact: {
    title: T('צרו קשר', "Let's Connect"),
    email: 'info@yooz.plus',
    phone: '',
  },
};
