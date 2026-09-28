const heDistance = (m: number) => (m < 1000 ? `${Math.max(1, Math.round(m / 10) * 10)} מ׳` : `${(m / 1000).toFixed(1)} ק״מ`);
const heMinutes = (s: number) => `${Math.max(1, Math.round(s / 60))} דק׳`;
const enDistance = (m: number) => (m < 1000 ? `${Math.max(1, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`);
const enMinutes = (s: number) => `${Math.max(1, Math.round(s / 60))} min`;

export const texts = {
  he: {
    you: 'אתם',
    start: 'יוצאים לדרך',
    stop: 'עצירת ניווט',
    recenter: 'חזרה אליי',
    openStation: 'פתחו את התחנה',
    imHere: 'הגעתי לתחנה',
    arrivedTitle: 'הגעתם!',
    locating: 'מאתרים את המיקום שלכם...',
    routing: 'מחשבים מסלול הליכה...',
    noRoute: 'לא נמצא מסלול הליכה, עקבו אחרי הסימון על המפה.',
    geoDenied: 'הגישה למיקום חסומה. כדי להמשיך, אפשרו גישה למיקום בהגדרות הדפדפן ורעננו את העמוד.',
    geoUnavailable: 'לא מצליחים לאתר את המיקום כרגע. נסו לצאת למקום פתוח.',
    mapUnavailable: 'לא הצלחנו לטעון את המפה.',
    noStationLocation: 'לא הוגדר מיקום לתחנה הזו.',
    walkSummary: (meters: number, seconds: number) => `${heMinutes(seconds)} הליכה · ${heDistance(meters)}`,
    inDistance: (meters: number) => `בעוד ${heDistance(meters)}`,
    arriveHere: 'היעד לפניכם',
    fromHere: (meters: number) => `${heDistance(meters)} מכאן`,
  },

  en: {
    you: 'You',
    start: 'Start walking',
    stop: 'Stop navigation',
    recenter: 'Back to me',
    openStation: 'Open station',
    imHere: "I'm at the station",
    arrivedTitle: "You're here!",
    locating: 'Finding your location...',
    routing: 'Finding a walking route...',
    noRoute: 'No walking route found - follow the marker on the map.',
    geoDenied: 'Location is blocked. To continue, allow location in your browser settings and refresh the page.',
    geoUnavailable: 'Cannot get your location right now. Try moving into the open.',
    mapUnavailable: 'The map could not be loaded.',
    noStationLocation: 'This station has no location set.',
    walkSummary: (meters: number, seconds: number) => `${enMinutes(seconds)} walk · ${enDistance(meters)}`,
    inDistance: (meters: number) => `In ${enDistance(meters)}`,
    arriveHere: 'Your destination is ahead',
    fromHere: (meters: number) => `${enDistance(meters)} away`,
  },
};
