import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { JwtPayload } from '../types';

/**
 * Rate limiting for the endpoints a participant's device calls while playing:
 * speech, the avatar's replies, the help assistant.
 *
 * These were all counted per address, which is the wrong unit for how the app
 * is reached. A group plays together from one venue's WiFi, so every phone
 * shares a single NAT address and therefore a single allowance - a cap of
 * "30 a minute" was 30 for the whole group, and the tenth player fell silent
 * because of the first nine. In development it is starker still: the browser
 * talks to Vite, which proxies to Express, so every request in the building
 * arrives from one local address.
 *
 * What made it hard to see is that the refusal never surfaces. The station
 * treats a 429 like any other failure and falls back to the browser's own
 * voice, which on most desktops has no Hebrew installed and so plays nothing.
 * The symptom is silence, and silence looks like a broken voice setting.
 *
 * So a recognised participant is counted on their own, and the address keeps a
 * far higher ceiling as the guard against a caller with no session at all -
 * these endpoints spend money at paid providers.
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
 * Who is asking, when the request carries a participant session.
 *
 * `reportId` is the session's own identity. Tokens issued before it existed
 * fall back to the activity and name, which is the same participant for as
 * long as they are playing.
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

/**
 * A limiter with its own counters. Each route keeps its own, so a chatty
 * avatar cannot spend the allowance for speech.
 */
export function createRateLimiter(limits: Limits, identify: Identify = participantFromRequest) {
  const counters = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of counters) {
      if (now > entry.resetAt) counters.delete(key);
    }
  }, 5 * WINDOW_MS);
  // Never hold the process open for a bookkeeping timer - tests import this.
  sweep.unref?.();

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
