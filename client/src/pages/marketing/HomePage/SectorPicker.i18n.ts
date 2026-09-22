/**
 * Only the strings the sector chooser adds. Everything else on the page - hero,
 * logos, testimonials, FAQ - is read from `HomePage.i18n`, and the tile labels
 * from `Nav.i18n`, so they always match the nav.
 */
export const texts = {
  he: {
    title: 'באיזה מגזר תרצו לשמוע פירוט על הפתרונות?',
    taglines: {
      business: 'מסעדות, רשתות מזון, חדרי כושר וחנויות',
      academy: 'מוסדות אקדמיים, קורסים והדרכה',
      tourism: 'פארקים, מוזיאונים, מסלולים ומרכזי מבקרים',
    },
  },
  en: {
    title: 'Which sector would you like to hear about in detail?',
    taglines: {
      business: 'Restaurants, food chains, gyms and shops',
      academy: 'Academic institutions, courses and training',
      tourism: 'Parks, museums, trails and visitor centres',
    },
  },
};
