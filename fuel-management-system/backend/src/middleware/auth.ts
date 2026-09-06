import { NextFunction, Response } from 'express';
import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { env } from '../config/env';
import User, { IUser, UserRole } from '../models/user.model';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../types';

/**
 * Verifies the Bearer JWT, loads the user, checks account activation,
 * and attaches the user document to req.user.
 */
export const requireAuth = asyncHandler(
  async (req: AuthRequest, _res: Response, next: NextFunction): Promise<void> => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Authentication required. Please log in.');
    }

    const token = authHeader.split(' ')[1];
    let payload: JwtPayload;
    try {
      payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw ApiError.unauthorized('Your session has expired. Please log in again.');
      }
      throw ApiError.unauthorized('Invalid authentication token. Please log in again.');
    }

    const userId = typeof payload.sub === 'string' ? payload.sub : String(payload.sub);
    if (!userId) throw ApiError.unauthorized('Invalid authentication token.');

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.unauthorized('This account no longer exists. Please contact the administrator.');
    }
    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact the administrator.');
    }

    req.user = user;
    next();
  }
);

/**
 * Role-based authorization guard. Usage: requireRole('admin'),
 * requireRole('admin', 'accountant'), requireRole('driver').
 */
export const requireRole =
  (...roles: UserRole[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(ApiError.unauthorized('Authentication required. Please log in.'));
      return;
    }
    if (!roles.includes(req.user.role)) {
      next(ApiError.forbidden(`Access denied. This action requires role: ${roles.join(' or ')}.`));
      return;
    }
    next();
  };