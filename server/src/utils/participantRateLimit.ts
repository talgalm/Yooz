import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { JwtPayload } from '../types';

/**
 * Rate limiting for the endpoints a participant's device calls while playing:
 * speech, the avatar's replies, the help assistant.
 *
 * These were counted per address, which is the wrong unit: a group plays from
 * one venue's WiFi, so "30 a minute" was 30 for the whole group and the tenth
 * player fell silent because of the first nine. It was hard to see because the
 * refusal never surfaces - the station treats a 429 like any other failure and
 * falls back to a browser voice that most desktops do not have, so the symptom
 * is silence. A recognised participant is now counted on their own, with the
 * address kept as a much higher ceiling against callers with no session.
 */

const WINDOW_MS = 60_000;

export interface Limits {
  /** Per minute, for one participant with a valid session. */
  perParticipant: number;
  /** Per minute, for an address whose caller has no session - the strict case. */
  perAnonymous: number;
  /** Per minute, for a whole address once sessions are recognised. */
  perAddress: number;
}

/**
 * Who is asking. `reportId` is the session's own identity; tokens issued before
 * it existed fall back to the activity and name.
 */
export function participantFromRequest(req: Pick<Request, 'headers'>): string | null {
  const header = req.headers?.['authorization'];
  const raw = Array.isArray(header) ? header[0] : header;
  const token = typeof raw === 'string' ? raw.split(' ')[1] : undefined;
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    return payload.reportId || `${payload.activityCode}:${payload.participantName}`;
  } catch {
    return null;
  }
}

type Identify = (req: Pick<Request, 'headers'>) => string | null;

/** Each route keeps its own counters, so a chatty avatar cannot spend speech's allowance. */
export function createRateLimiter(limits: Limits, identify: Identify = participantFromRequest) {
  const counters = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of counters) {
      if (now > entry.resetAt) counters.delete(key);
    }
  }, 5 * WINDOW_MS);
  sweep.unref?.(); // never hold the process open for bookkeeping

  function over(key: string, max: number): boolean {
    const now = Date.now();
    const entry = counters.get(key);
    if (!entry || now > entry.resetAt) {
      counters.set(key, { count: 1, resetAt: now + WINDOW_MS });
      return false;
    }
    entry.count++;
    return entry.count > max;
  }

  return function isRateLimited(req: Pick<Request, 'headers' | 'ip' | 'socket'>): boolean {
    const address = req.ip || req.socket?.remoteAddress || 'unknown';
    const participant = identify(req);
    if (!participant) return over(`ip:${address}`, limits.perAnonymous);
    return (
      over(`participant:${participant}`, limits.perParticipant) ||
      over(`address:${address}`, limits.perAddress)
    );
  };
}
