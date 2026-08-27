/** The Cloudinary folder admin uploads land in (`routes/upload.ts`). */
export const ROOT_FOLDER = 'yooz';

/**
 * Subfolders of `yooz/` written by the app, not by an admin: participant
 * selfies, generated collages, face-swap output, AI tutorial videos. The media
 * library never lists, moves, deletes or nests inside these.
 */
export const MACHINE_FOLDERS = ['collage-inputs', 'collages', 'face-swap', 'tutorials'];

/**
 * Normalize a folder path from a request, or null if it is not a folder this
 * screen may touch. Accepts `yooz`, `yooz/logos`, `logos` (root-relative) and
 * rejects traversal, machine folders, and anything outside `yooz/`.
 */
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
  if (segments.length > 4) return null; // yooz + 3 levels

  for (const segment of segments.slice(1)) {
    if (!segment || segment === '.' || segment === '..') return null;
    // Anything that could confuse a path or a Cloudinary expression.
    if (!/^[\p{L}\p{N} _-]{1,40}$/u.test(segment)) return null;
  }
  if (MACHINE_FOLDERS.includes(segments[1])) return null;

  return withRoot;
}

/**
 * May the media library move or destroy this asset?
 *
 * The account is in `dynamic` folder mode, so moving a file changes only its
 * `asset_folder` — the `public_id` it was uploaded with never changes. That
 * makes the public_id a stable answer to "who created this": admin uploads are
 * `yooz/<name>` (or `yooz/<folder>/<name>` when uploaded into a subfolder),
 * machine output keeps its own prefix forever.
 */
export function isDeletableAsset(publicId: string): boolean {
  if (typeof publicId !== 'string' || !publicId.startsWith(`${ROOT_FOLDER}/`)) return false;
  const rest = publicId.slice(ROOT_FOLDER.length + 1);
  if (!rest || rest.includes('..')) return false;
  return !MACHINE_FOLDERS.some((folder) => rest.startsWith(`${folder}/`));
}
