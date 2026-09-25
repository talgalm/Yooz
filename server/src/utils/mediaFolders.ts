export const ROOT_FOLDER = 'yooz';

export const MACHINE_FOLDERS = ['collage-inputs', 'collages', 'face-swap', 'tutorials'];

export function resolveFolder(input: unknown): string | null {
  if (input === undefined || input === null || input === '') return ROOT_FOLDER;
  if (typeof input !== 'string') return null;

  const trimmed = input.trim().replace(/^\/+|\/+$/g, '');
  if (!trimmed) return ROOT_FOLDER;

  const withRoot = trimmed === ROOT_FOLDER || trimmed.startsWith(`${ROOT_FOLDER}/`)
    ? trimmed
    : `${ROOT_FOLDER}/${trimmed}`;

  const segments = withRoot.split('/');
  if (segments[0] !== ROOT_FOLDER) return null;
  if (segments.length > 4) return null;

  for (const segment of segments.slice(1)) {
    if (!segment || segment === '.' || segment === '..') return null;
    if (!/^[\p{L}\p{N} _-]{1,40}$/u.test(segment)) return null;
  }
  if (MACHINE_FOLDERS.includes(segments[1])) return null;

  return withRoot;
}

export function isDeletableAsset(publicId: string): boolean {
  if (typeof publicId !== 'string' || !publicId.startsWith(`${ROOT_FOLDER}/`)) return false;
  const rest = publicId.slice(ROOT_FOLDER.length + 1);
  if (!rest || rest.includes('..')) return false;
  return !MACHINE_FOLDERS.some((folder) => rest.startsWith(`${folder}/`));
}
