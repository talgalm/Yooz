import { decodeJwtPayload } from './jwt';

const PLAY_CODE_SESSION_KEY = 'yooz_play_code';
const PLAY_CODE_LOCAL_KEY = 'yooz_play_code';

const ACTIVITY_PATH_RE = /\/(?:play|story|mission)\/([^/]+)/;

/** Remember which activity this device was playing (survives sessionStorage wipes on mobile). */
export function rememberActivityCode(code: string): void {
  const trimmed = code.trim();
  if (!trimmed) return;
  try {
    sessionStorage.setItem(PLAY_CODE_SESSION_KEY, trimmed);
    localStorage.setItem(PLAY_CODE_LOCAL_KEY, trimmed);
  } catch {
    /* storage full / private mode */
  }
}

export function readStoredActivityCode(): string | null {
  try {
    return sessionStorage.getItem(PLAY_CODE_SESSION_KEY) || localStorage.getItem(PLAY_CODE_LOCAL_KEY);
  } catch {
    return null;
  }
}

export function activityCodeFromPathname(pathname: string): string | null {
  const match = pathname.match(ACTIVITY_PATH_RE);
  return match?.[1] ?? null;
}

export function isParticipantActivityPath(pathname: string): boolean {
  return ACTIVITY_PATH_RE.test(pathname) || pathname === '/home';
}

export function activityCodeFromToken(): string | null {
  try {
    const token = localStorage.getItem('yooz_token');
    if (!token) return null;
    const payload = decodeJwtPayload<{ activityCode?: string }>(token);
    return typeof payload.activityCode === 'string' && payload.activityCode ? payload.activityCode : null;
  } catch {
    return null;
  }
}

/** Resolve the activity code from URL, storage, or JWT — never guess. */
export function resolveParticipantActivityCode(opts?: {
  urlCode?: string | null;
  pathname?: string;
}): string | null {
  const fromParam = opts?.urlCode?.trim();
  if (fromParam) return fromParam;

  const fromPath = opts?.pathname ? activityCodeFromPathname(opts.pathname) : null;
  if (fromPath) return fromPath;

  const fromStorage = readStoredActivityCode();
  if (fromStorage) return fromStorage;

  return activityCodeFromToken();
}

export function rememberParticipantActivity(code?: string | null): void {
  const resolved = code?.trim() || resolveParticipantActivityCode();
  if (resolved) rememberActivityCode(resolved);
}

/** Participant login screen for an activity. */
export function participantPlayPath(code?: string | null): string {
  const resolved = code?.trim() || resolveParticipantActivityCode();
  return resolved ? `/play/${resolved}` : '/';
}

export function participantStoryPath(code: string): string {
  return `/story/${code.trim()}`;
}

export function participantMissionPath(code: string): string {
  return `/mission/${code.trim()}`;
}

const SESSION_ID_KEY = 'yooz_participant_session_id';

/**
 * Random id minted on every login. Scopes per-participant device storage (the
 * collage IndexedDB stores and the server-side collage job id) so a second
 * participant playing on the same phone starts from scratch.
 *
 * It used to be derived from email/phone/name, which collided in two ways:
 * a shared phone number is identical by construction, and Hebrew names all
 * sanitize down to underscores. Either way run #2 was handed run #1's job —
 * already `done` on the server — and instantly got the first video back.
 */
export function newParticipantSessionId(): string {
  const id = (crypto.randomUUID?.() ?? `${Date.now()}${Math.random()}`).replace(/[^a-zA-Z0-9]/g, '').slice(0, 16);
  try {
    localStorage.setItem(SESSION_ID_KEY, id);
  } catch {
    /* private mode — caller still gets a usable (non-colliding) id */
  }
  return id;
}

export function participantSessionId(): string {
  try {
    const existing = localStorage.getItem(SESSION_ID_KEY);
    if (existing) return existing;
  } catch {
    /* fall through to a fresh id */
  }
  return newParticipantSessionId();
}
