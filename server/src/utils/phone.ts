export function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '');
  digits = digits.replace(/^(?:00|011)/, '');
  if (digits.startsWith('972')) {
    return `0${digits.slice(3).replace(/^0+/, '')}`;
  }
  return digits;
}
