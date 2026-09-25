import type { Request } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { JwtPayload } from '../types';

const WINDOW_MS = 60_000;

export interface Limits {
  perParticipant: number;
  perAnonymous: number;
  perAddress: number;
}

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

export function createRateLimiter(limits: Limits, identify: Identify = participantFromRequest) {
  const counters = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of counters) {
      if (now > entry.resetAt) counters.delete(key);
    }
  }, 5 * WINDOW_MS);
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
