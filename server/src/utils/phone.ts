/**
 * Canonical form of a phone number, so every way of writing the same number
 * compares equal: "050-123-4567", "0501234567", "+972 50-123-4567",
 * "00972501234567" and the stray-zero "+9720501234567" all become "0501234567".
 *
 * Only the Israeli country code is folded, because that is the one whose local
 * form (leading 0, 8- or 9-digit subscriber) can't be derived from the digits
 * alone — an Israeli landline "+972-3-1234567" is "031234567" locally, which no
 * generic suffix rule gets right. Foreign numbers keep their digits, minus the
 * international access code, so "+1-415-555-0123" and "001 415 555 0123" match.
 *
 * ponytail: a foreign number written in its own local form (no country code)
 * still won't match the same number written internationally — that needs
 * libphonenumber and a known caller country. Add it if non-Israeli numbers
 * ever show up in practice.
 */
export function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  // International access codes people dial instead of "+": 00 (most of the
  // world), 011 (North America).
  digits = digits.replace(/^(?:00|011)/, '');
  if (digits.startsWith('972')) {
    // Drop the country code and restore the single local leading zero — extra
    // zeros show up when someone glues "+972" onto an already-local number.
    return `0${digits.slice(3).replace(/^0+/, '')}`;
  }
  return digits;
}
