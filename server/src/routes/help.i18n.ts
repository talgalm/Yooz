
export interface OrganizerContact {
  name: string;
  phone: string;
}

export function contactClause(lang: 'en' | 'he', contact?: OrganizerContact): string {
  if (contact) {
    return lang === 'he' ? `פנו ל${contact.name} בטלפון ${contact.phone}` : `contact ${contact.name} at ${contact.phone}`;
  }
  return lang === 'he' ? 'פנו למארגן הפעילות' : 'contact the activity organizer';
}

export function askClause(lang: 'en' | 'he', contact?: OrganizerContact): string {
  if (contact) {
    return lang === 'he' ? `בקשו מ${contact.name} בטלפון ${contact.phone}` : `ask ${contact.name} at ${contact.phone}`;
  }
  return lang === 'he' ? 'בקשו מהמנחה' : 'ask your facilitator';
}

export function buildFallbackMessage(lang: 'en' | 'he', contact?: OrganizerContact): string {
  return lang === 'he'
    ? `אם אתם חווים בעיות, נסו לרענן את הדף קודם. אם הבעיה ממשיכה, ${contactClause(lang, contact)} או התקשרו לקו התמיכה שלנו.`
    : `If you're having trouble, try refreshing the page first. If the issue persists, ${contactClause(lang, contact)} or call our support line.`;
}
