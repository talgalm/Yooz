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
