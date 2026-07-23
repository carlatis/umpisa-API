import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config.js';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer /, '');
 
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  
  try {
    req.userId = (jwt.verify(token, config.JWT_SECRET) as { sub: string }).sub;
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}
