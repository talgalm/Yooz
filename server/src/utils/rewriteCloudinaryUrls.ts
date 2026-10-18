const CLOUDINARY_URL = /https?:\/\/res\.cloudinary\.com\/[^\s"'<>()\\]+/g;
const TRAILING_PUNCTUATION = /[.,;:!?]+$/;

export type UrlMapper = (cloudinaryUrl: string) => string | null;

export interface RewriteResult<T> {
  value: T;
  replaced: number;
  unmapped: string[];
}

export function rewriteUrlsInText(text: string, mapUrl: UrlMapper): RewriteResult<string> {
  let replaced = 0;
  const unmapped: string[] = [];
  const value = text.replace(CLOUDINARY_URL, (match) => {
    const trailing = TRAILING_PUNCTUATION.exec(match)?.[0] ?? '';
    const url = trailing ? match.slice(0, -trailing.length) : match;
    const mapped = mapUrl(url);
    if (!mapped) {
      unmapped.push(url);
      return match;
    }
    replaced++;
    return mapped + trailing;
  });
  return { value, replaced, unmapped };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object') return false;
  const proto = Object.getPrototypeOf(value);
  return proto === Object.prototype || proto === null;
}

export function rewriteUrlsDeep<T>(value: T, mapUrl: UrlMapper): RewriteResult<T> {
  if (typeof value === 'string') return rewriteUrlsInText(value, mapUrl) as RewriteResult<T>;
  if (!Array.isArray(value) && !isPlainObject(value)) return { value, replaced: 0, unmapped: [] };

  let replaced = 0;
  const unmapped: string[] = [];
  const visit = (child: unknown) => {
    const result = rewriteUrlsDeep(child, mapUrl);
    replaced += result.replaced;
    unmapped.push(...result.unmapped);
    return result.value;
  };
  const rewritten = Array.isArray(value)
    ? value.map(visit)
    : Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, visit(v)]));
  return { value: (replaced ? rewritten : value) as T, replaced, unmapped };
}
