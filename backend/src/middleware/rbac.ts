import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../models/User.js';
import { hasPermission, Permission } from '../config/permissions.js';
import { AppError } from './errorHandler.js';

/**
 * Get the effective role to use for permission checks.
 * If X-Active-Role header is provided and is valid (in user's roles array), use it.
 * Otherwise, fallback to the user's primary role.
 */
const getEffectiveRole = (req: Request): UserRole => {
  const activeRoleHeader = req.headers['x-active-role'] as string | undefined;
  const user = req.user as any;
  const userRoles = user?.roles || [user?.role];
  
  // If activeRole header is provided and is valid (user has that role), use it
  if (activeRoleHeader && userRoles.includes(activeRoleHeader)) {
    return activeRoleHeader as UserRole;
  }
  
  // Fallback to primary role
  return user?.role as UserRole;
};

export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      const error: AppError = new Error('Authentication required');
      error.statusCode = 401;
      return next(error);
    }

    const effectiveRole = getEffectiveRole(req);

    if (!allowedRoles.includes(effectiveRole)) {
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

    const effectiveRole = getEffectiveRole(req);

    if (!hasPermission(effectiveRole, permission)) {
      const error: AppError = new Error('Insufficient permissions');
      error.statusCode = 403;
      return next(error);
    }

    next();
  };
};


