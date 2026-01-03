import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.js';
import { hasPermission, Permission } from '../config/permissions.js';
import { AppError } from './errorHandler.js';

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const userRole = req.user.role as UserRole;

    if (!allowedRoles.includes(userRole)) {
      const error: AppError = new Error('Insufficient permissions');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};

export const requirePermission = (permission: Permission) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const userRole = req.user.role as UserRole;

    if (!hasPermission(userRole, permission)) {
      const error: AppError = new Error('Insufficient permissions');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};


