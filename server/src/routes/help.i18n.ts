
export interface OrganizerContact {
  name: string;
  phone: string;
}

function contactList(lang: 'en' | 'he', contacts: OrganizerContact[], hebrewPrefix: string): string {
  const each = contacts.map((c) => (lang === 'he' ? `${hebrewPrefix}${c.name} בטלפון ${c.phone}` : `${c.name} at ${c.phone}`));
  if (each.length < 2) return each.join('');
  return `${each.slice(0, -1).join(', ')}${lang === 'he' ? ' או ' : ' or '}${each[each.length - 1]}`;
}

export function contactClause(lang: 'en' | 'he', contacts: OrganizerContact[] = []): string {
  if (contacts.length > 0) {
    return lang === 'he' ? `פנו ${contactList(lang, contacts, 'ל')}` : `contact ${contactList(lang, contacts, '')}`;
  }
  return lang === 'he' ? 'פנו למארגן הפעילות' : 'contact the activity organizer';
}

export function askClause(lang: 'en' | 'he', contacts: OrganizerContact[] = []): string {
  if (contacts.length > 0) {
    return lang === 'he' ? `בקשו ${contactList(lang, contacts, 'מ')}` : `ask ${contactList(lang, contacts, '')}`;
  }
  return lang === 'he' ? 'בקשו מהמנחה' : 'ask your facilitator';
}

export function buildFallbackMessage(lang: 'en' | 'he', contacts: OrganizerContact[] = []): string {
  return lang === 'he'
    ? `אם אתם חווים בעיות, נסו לרענן את הדף קודם. אם הבעיה ממשיכה, ${contactClause(lang, contacts)} או התקשרו לקו התמיכה שלנו.`
    : `If you're having trouble, try refreshing the page first. If the issue persists, ${contactClause(lang, contacts)} or call our support line.`;
}
