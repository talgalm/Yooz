import crypto from 'node:crypto';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { ContentTranslation } from '../models/ContentTranslation';

/**
 * Machine translation of admin-authored activity content.
 *
 * The UI chrome is translated by hand in the `.i18n.ts` files. The content
 * inside an activity - station titles, riddles, trivia questions, popups - is
 * written by whoever built the activity, so there is nothing to hand-translate
 * in advance: it is translated on demand and cached by content hash.
 *
 * Two rules the game depends on:
 *   1. It never fails a request. A model error, a timeout or a missing key
 *      leaves the Hebrew in place - a participant sees the original text
 *      instead of a broken screen.
 *   2. It never touches anything that is not prose. URLs, ids, colours and
 *      answer keys that are already Latin stay exactly as they are.
 */

const HEBREW = /[֐-׿]/;

/** Keys whose values are never prose, whatever they contain. */
const SKIP_KEYS = new Set([
  '_id', 'id', 'ref', 'code', 'type', 'key', 'slug', 'lang', 'token', 'password',
  'url', 'image', 'imageUrl', 'images', 'video', 'videoUrl', 'audio', 'audioUrl',
  'icon', 'iconUrl', 'logo', 'logoUrl', 'backgroundImage', 'spiderSvg', 'svg',
  'color', 'bg', 'background', 'theme', 'font', 'className',
  'email', 'phone', 'phoneNumber', 'managerEmail', 'splitGroupId',
]);

/** Values that are technically strings but never sentences. */
function isProse(value: string): boolean {
  if (!HEBREW.test(value)) return false;
  if (value.length > 2000) return false;
  if (/^(https?:\/\/|\/|data:)/.test(value)) return false;
  return true;
}

/**
 * Every translatable string in a payload, de-duplicated.
 *
 * De-duplication is what makes this cheap: one activity repeats the same button
 * label and the same station name across dozens of items, and each distinct
 * sentence is translated once.
 */
export function collectProse(payload: unknown, out = new Set<string>()): Set<string> {
  if (typeof payload === 'string') {
    if (isProse(payload)) out.add(payload);
    return out;
  }
  if (Array.isArray(payload)) {
    for (const item of payload) collectProse(item, out);
    return out;
  }
  if (payload && typeof payload === 'object') {
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      if (SKIP_KEYS.has(key)) continue;
      collectProse(value, out);
    }
  }
  return out;
}

/**
 * The same payload with every translated string swapped in. Anything the map
 * does not know about is left alone, so a partial translation degrades to
 * partly-Hebrew rather than to blanks.
 */
export function applyTranslations<T>(payload: T, map: Map<string, string>): T {
  if (typeof payload === 'string') return (map.get(payload) ?? payload) as T;
  if (Array.isArray(payload)) return payload.map((item) => applyTranslations(item, map)) as T;
  if (payload && typeof payload === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(payload as Record<string, unknown>)) {
      out[key] = SKIP_KEYS.has(key) ? value : applyTranslations(value, map);
    }
    return out as T;
  }
  return payload;
}

export function cacheKey(lang: string, source: string): string {
  return crypto.createHash('sha256').update(`${lang}:${source}`).digest('hex');
}

/** One model call per batch; a long activity is a handful of calls, not hundreds. */
const BATCH_SIZE = 40;

function buildPrompt(lang: string, sources: string[]): string {
  return [
    `Translate each item of this JSON array from Hebrew into ${lang === 'en' ? 'English' : lang}.`,
    'These are strings from a game: station names, riddles, questions, hints and button labels.',
    'Rules:',
    '- Reply with a JSON array of the same length and order, nothing else.',
    '- Keep the tone and the register of the original, including how formal it is.',
    '- Keep names of places, people and brands as they are.',
    '- Keep any numbers, punctuation and emoji exactly as they appear.',
    '- A riddle stays a riddle: translate it so it still works as one, do not solve it.',
    '',
    JSON.stringify(sources),
  ].join('\n');
}

async function askGemini(lang: string, sources: string[]): Promise<string[] | null> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20_000);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': GEMINI_API_KEY },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: buildPrompt(lang, sources) }] }],
        generationConfig: { temperature: 0.2, responseMimeType: 'application/json' },
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    const parsed: unknown = JSON.parse(text);
    if (!Array.isArray(parsed) || parsed.length !== sources.length) return null;
    return parsed.map((v, i) => (typeof v === 'string' && v.trim() ? v : sources[i]));
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Translations for these strings, from cache where possible. Anything the model
 * could not translate is simply absent from the map, which leaves the Hebrew in
 * place downstream.
 */
/**
 * What has already been translated, without translating anything new.
 *
 * Reading a screen should never spend money at the model on its own. The admin
 * translation screen opens with this, and only asks for the rest when someone
 * says to.
 */
export async function cachedTranslations(
  sources: string[],
  lang: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (sources.length === 0 || lang === 'he') return map;

  const keys = sources.map((s) => cacheKey(lang, s));
  const cached = await ContentTranslation.find({ key: { $in: keys } }).lean();
  for (const row of cached) map.set(row.source, row.translated);
  return map;
}

export async function translationsFor(sources: string[], lang: string): Promise<Map<string, string>> {
  const map = await cachedTranslations(sources, lang);
  if (sources.length === 0 || lang === 'he') return map;

  const missing = sources.filter((s) => !map.has(s));
  if (missing.length === 0 || !GEMINI_API_KEY) return map;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);
    const translated = await askGemini(lang, batch);
    if (!translated) continue;

    const rows = batch.map((source, j) => ({
      key: cacheKey(lang, source),
      lang,
      source,
      translated: translated[j],
    }));
    for (const row of rows) map.set(row.source, row.translated);
    /** Two participants can open the same station at once; the loser is a no-op. */
    await ContentTranslation.insertMany(rows, { ordered: false }).catch(() => undefined);
  }

  return map;
}

/**
 * The entry point a route uses: hand it what it was about to send, get the same
 * shape back in the participant's language.
 */
export async function translateContent<T>(payload: T, lang: string): Promise<T> {
  if (!lang || lang === 'he') return payload;
  const sources = [...collectProse(payload)];
  if (sources.length === 0) return payload;

  const map = await translationsFor(sources, lang);
  return map.size === 0 ? payload : applyTranslations(payload, map);
}
