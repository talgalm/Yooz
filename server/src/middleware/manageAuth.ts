import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { ManageJwtPayload } from '../types';
import { ManageRole } from '../models/manage/ManageUser';

const VALID_MANAGE_ROLES: ManageRole[] = ['owner', 'pm', 'member'];

export function authenticateManage(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as ManageJwtPayload;
    if (decoded.realm !== 'manage' || !VALID_MANAGE_ROLES.includes(decoded.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
    req.manageUser = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function requireManageRole(...roles: ManageRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.manageUser || !roles.includes(req.manageUser.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}
