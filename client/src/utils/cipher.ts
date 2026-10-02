export interface CipherSlot {
  itemIndex: number;
  char: string;
  revealed: boolean;
}

export function cipherSlots(items: { cipherChar?: string }[], completedIndices: number[]): CipherSlot[] {
  return items.flatMap((item, itemIndex) => (
    item.cipherChar ? [{ itemIndex, char: item.cipherChar, revealed: completedIndices.includes(itemIndex) }] : []
  ));
}

function inRange(char: string, from: number, to: number): boolean {
  return Array.from(char).some((c) => {
    const code = c.codePointAt(0) ?? 0;
    return code >= from && code <= to;
  });
}

const isHebrew = (char: string) => inRange(char, 0x0590, 0x05ff);
const isRightToLeft = (char: string) => inRange(char, 0x0590, 0x06ff);

export function cipherDirection(slots: CipherSlot[]): 'rtl' | 'ltr' {
  return slots.some((slot) => isRightToLeft(slot.char)) ? 'rtl' : 'ltr';
}

export function unseenSlots(slots: CipherSlot[], seen: number[]): number[] {
  return slots.filter((slot) => slot.revealed && !seen.includes(slot.itemIndex)).map((slot) => slot.itemIndex);
}

const DIGITS = '0123456789';
const HEBREW_FINAL_FORMS = [0x05da, 0x05dd, 0x05df, 0x05e3, 0x05e5];
const HEBREW = String.fromCharCode(...Array.from({ length: 27 }, (_, k) => 0x05d0 + k).filter((code) => !HEBREW_FINAL_FORMS.includes(code)));
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const SYMBOLS = '#?&@*+%$!';

function reelAlphabet(char: string): string {
  if (/^\d+$/.test(char)) return DIGITS;
  if (isHebrew(char)) return HEBREW;
  if (/^[A-Z]+$/.test(char)) return LATIN;
  if (/^[a-z]+$/.test(char)) return LATIN.toLowerCase();
  return DIGITS + LATIN + SYMBOLS;
}

export const REEL_LENGTH = 16;

export function reelStrip(char: string, seed: number): string[] {
  const alphabet = Array.from(reelAlphabet(char));
  let state = (seed * 2654435761 + 97) >>> 0;
  const spin = Array.from({ length: REEL_LENGTH - 1 }, () => {
    state = (Math.imul(state, 1103515245) + 12345) >>> 0;
    return alphabet[(state >>> 8) % alphabet.length];
  });
  return [...spin, char];
}

export const CIPHER_CHAR_MAX = 2;

export function cleanCipherInput(value: string): string {
  return Array.from(value.trim()).slice(0, CIPHER_CHAR_MAX).join('');
}
