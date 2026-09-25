import crypto from 'node:crypto';
import { GEMINI_API_KEY, GEMINI_MODEL } from '../config';
import { ContentTranslation } from '../models/ContentTranslation';
import { DEFAULT_LANG, languageOf } from '../utils/languages';

const HEBREW = /[֐-׿]/;

const SKIP_KEYS = new Set([
  '_id', 'id', 'ref', 'code', 'type', 'key', 'slug', 'lang', 'token', 'password',
  'url', 'image', 'imageUrl', 'images', 'video', 'videoUrl', 'audio', 'audioUrl',
  'icon', 'iconUrl', 'logo', 'logoUrl', 'backgroundImage', 'spiderSvg', 'svg',
  'color', 'bg', 'background', 'theme', 'font', 'className',
  'email', 'phone', 'phoneNumber', 'managerEmail', 'splitGroupId',
]);

function isProse(value: string): boolean {
  if (!HEBREW.test(value)) return false;
  if (value.length > 2000) return false;
  if (/^(https?:\/\/|\/|data:)/.test(value)) return false;
  return true;
}

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

const BATCH_SIZE = 40;

function buildPrompt(lang: string, sources: string[]): string {
  return [
    `Translate each item of this JSON array from ${languageOf(DEFAULT_LANG).name} into ${languageOf(lang).name}.`,
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

export async function cachedTranslations(
  sources: string[],
  lang: string
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (sources.length === 0 || lang === DEFAULT_LANG) return map;

  const keys = sources.map((s) => cacheKey(lang, s));
  const cached = await ContentTranslation.find({ key: { $in: keys } }).lean();
  for (const row of cached) map.set(row.source, row.translated);
  return map;
}

export async function translationsFor(sources: string[], lang: string): Promise<Map<string, string>> {
  const map = await cachedTranslations(sources, lang);
  if (sources.length === 0 || lang === DEFAULT_LANG) return map;

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
    await ContentTranslation.insertMany(rows, { ordered: false }).catch(() => undefined);
  }

  return map;
}

export async function translateText(text: string, lang: string): Promise<string> {
  if (!text || !lang || lang === DEFAULT_LANG) return text;
  if (!HEBREW.test(text)) return text;
  try {
    const map = await translationsFor([text], lang);
    return map.get(text) ?? text;
  } catch {
    return text;
  }
}

export async function translateContent<T>(payload: T, lang: string): Promise<T> {
  if (!lang || lang === DEFAULT_LANG) return payload;
  const sources = [...collectProse(payload)];
  if (sources.length === 0) return payload;

  const map = await translationsFor(sources, lang);
  return map.size === 0 ? payload : applyTranslations(payload, map);
}
