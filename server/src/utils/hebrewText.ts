/**
 * Hebrew-aware text comparison helpers.
 *
 * Extracted from avatarChat.ts so avatarQuiz's no-AI fallback judges answers
 * with exactly the same normalisation the chat station already uses — a
 * participant's phrasing shouldn't be graded differently depending on which
 * station they're in.
 */

/** Lowercase, strip niqqud and punctuation, collapse whitespace. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[֑-ֽֿ-ׇ]/g, '') // strip Hebrew niqqud
    .replace(/[׳״".,!?\-–—:;()'\[\]{}]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const HEB_PREFIXES = ['ה', 'ו', 'ש', 'ב', 'כ', 'ל', 'מ'];

/** Strip up to two layered Hebrew prefixes (e.g. "וה", "שה"). */
export function stripHebPrefixes(word: string): string {
  let w = word;
  for (let i = 0; i < 2; i++) {
    if (w.length > 3 && HEB_PREFIXES.includes(w[0])) w = w.slice(1);
    else break;
  }
  return w;
}

export function tokens(s: string): string[] {
  return normalizeText(s)
    .split(' ')
    .filter(Boolean)
    .map(stripHebPrefixes);
}

export function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(tokens(a));
  const setB = new Set(tokens(b));
  if (setA.size === 0 || setB.size === 0) return 0;
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  return inter / (setA.size + setB.size - inter);
}

/**
 * How well is `answer` "covered" by `response`? (fraction of answer's tokens
 * that also appear in the response). High coverage means the response said
 * the answer plus some extra wording.
 */
export function coverage(answer: string, response: string): number {
  const ans = tokens(answer);
  if (ans.length === 0) return 0;
  const resp = new Set(tokens(response));
  let hit = 0;
  for (const t of ans) if (resp.has(t)) hit++;
  return hit / ans.length;
}

/**
 * True when `phrase` appears in `haystack` after normalisation, matching on
 * token boundaries so "לא לוחץ" doesn't match inside an unrelated word.
 */
/**
 * Like `containsPhrase`, but tolerates filler words between the phrase's
 * tokens — "לא לוחץ" should match "לא הייתי לוחץ".
 *
 * Order is still required and the gap is capped, which is what keeps negation
 * intact: "אני לוחץ אבל לא פותח" must NOT match "לא לוחץ", and it doesn't,
 * because there the words appear in the wrong order.
 */
export function containsPhraseNear(haystack: string, phrase: string, maxGap = 3): boolean {
  const needle = tokens(phrase);
  if (needle.length === 0) return false;
  const hay = tokens(haystack);
  if (needle.length === 1) return hay.includes(needle[0]);

  for (let start = 0; start < hay.length; start++) {
    if (hay[start] !== needle[0]) continue;
    let pos = start;
    let matched = 1;
    for (let n = 1; n < needle.length; n++) {
      let found = -1;
      for (let h = pos + 1; h <= Math.min(hay.length - 1, pos + maxGap); h++) {
        if (hay[h] === needle[n]) { found = h; break; }
      }
      if (found === -1) break;
      pos = found;
      matched++;
    }
    if (matched === needle.length) return true;
  }
  return false;
}

export function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = tokens(phrase);
  if (needle.length === 0) return false;
  const hay = tokens(haystack);
  if (hay.length < needle.length) return false;
  for (let i = 0; i <= hay.length - needle.length; i++) {
    let match = true;
    for (let j = 0; j < needle.length; j++) {
      if (hay[i + j] !== needle[j]) { match = false; break; }
    }
    if (match) return true;
  }
  return false;
}
