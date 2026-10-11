import type { IOrganizerContact } from '../models/Activity';

export const ORGANIZER_CONTACTS_MAX = 5;

export function sanitizeOrganizerContacts(raw: unknown): IOrganizerContact[] {
  if (!Array.isArray(raw)) return [];
  const contacts: IOrganizerContact[] = [];
  for (const entry of raw) {
    if (contacts.length === ORGANIZER_CONTACTS_MAX) break;
    if (!entry || typeof entry !== 'object') continue;
    const { name, phone } = entry as Record<string, unknown>;
    const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : '';
    const cleanPhone = typeof phone === 'string' ? phone.trim().slice(0, 30) : '';
    if (cleanName && cleanPhone) contacts.push({ name: cleanName, phone: cleanPhone });
  }
  return contacts;
}

export function organizerContactsOf(activity: {
  organizerContacts?: IOrganizerContact[] | null;
  organizerContactName?: string | null;
  organizerContactPhone?: string | null;
}): IOrganizerContact[] {
  if (activity.organizerContacts?.length) return activity.organizerContacts.map(({ name, phone }) => ({ name, phone }));
  if (activity.organizerContactName && activity.organizerContactPhone) {
    return [{ name: activity.organizerContactName, phone: activity.organizerContactPhone }];
  }
  return [];
}
