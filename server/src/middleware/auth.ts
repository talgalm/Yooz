import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { JwtPayload } from '../types';
import { startOfTodayIsrael } from '../utils/israelTime';

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    // A `dailyReset` session dies with its Israel day. Without this a token
    // kept overnight still addresses yesterday's report by id, and the final
    // `/scores` upsert would overwrite it — destroying the history the daily
    // reset now exists to preserve. 401 sends the participant back to login,
    // which issues a fresh report for today.
    if (decoded.dailyReset && (decoded.iat ?? 0) * 1000 < startOfTodayIsrael().getTime()) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }
    req.participant = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
