/**
 * Digits-only form of a phone number, so "050-123-4567", "0501234567" and
 * "+972501234567" all compare equal. Israeli numbers written with the country
 * code are folded back to their leading-zero local form.
 */
export function normalizePhone(raw: string): string {
  const digits = (raw || '').replace(/\D/g, '');
  if (digits.startsWith('972')) return `0${digits.slice(3)}`;
  return digits;
}
