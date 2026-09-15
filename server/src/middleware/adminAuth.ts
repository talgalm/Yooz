import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config';
import { AdminJwtPayload, AdminRole } from '../types';

const VALID_ADMIN_ROLES: AdminRole[] = ['viewer', 'admin', 'super_admin', 'customer'];
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function verifyAdminToken(req: Request, res: Response): boolean {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return false;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as AdminJwtPayload;
    if (!VALID_ADMIN_ROLES.includes(decoded.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return false;
    }
    req.admin = decoded;
    return true;
  } catch {
    res.status(401).json({ error: 'Invalid token' });
    return false;
  }
}

export function authenticateAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!verifyAdminToken(req, res)) return;
  if (req.admin?.role === 'viewer' && !READ_METHODS.has(req.method)) {
    res.status(403).json({ error: 'Forbidden: viewers are read-only' });
    return;
  }
  next();
}

export function authenticateAdminAllowViewerWrites(req: Request, res: Response, next: NextFunction): void {
  if (!verifyAdminToken(req, res)) return;
  next();
}

export function requireRole(...roles: AdminRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const admin = req.admin;
    if (!admin || !roles.includes(admin.role)) {
      res.status(403).json({ error: 'Forbidden: insufficient role' });
      return;
    }
    next();
  };
}
