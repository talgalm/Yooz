import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { ManagerJwtPayload } from '../types';

export function authenticateManager(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ManagerJwtPayload;
    if (decoded.role !== 'manager') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.manager = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}
