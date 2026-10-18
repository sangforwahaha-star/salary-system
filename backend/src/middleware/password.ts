import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';

export const requirePasswordChanged = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.must_change_password) {
    return res.status(403).json({ 
      error: '请先修改密码',
      code: 'MUST_CHANGE_PASSWORD'
    });
  }
  next();
};
