const NUMBER_RANGE = /(\d)[ \t]*[–—][ \t]*(\d)/g;
const SPACED_DASH = /[ \t]*[–—][ \t]*/g;
const LINE_START_DASH = /(^|\n) - /g;

export function plainDashes(text: string): string {
  return text
    .replace(NUMBER_RANGE, '$1-$2')
    .replace(SPACED_DASH, ' - ')
    .replace(LINE_START_DASH, '$1- ');
}
