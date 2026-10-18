export const CIPHER_ONE_ROW_MAX = 8;

export function cipherRows<T>(slots: T[]): T[][] {
  if (slots.length <= CIPHER_ONE_ROW_MAX) return [slots];
  const rowCount = Math.max(2, Math.ceil(slots.length / CIPHER_ONE_ROW_MAX));
  const perRow = Math.ceil(slots.length / rowCount);
  return Array.from({ length: Math.ceil(slots.length / perRow) }, (_, row) => slots.slice(row * perRow, (row + 1) * perRow));
}
