import { Request } from 'express';
import { IUser } from '../models/user.model';

/**
 * Request augmented with the authenticated user (set by requireAuth).
 */
export interface AuthRequest extends Request {
  user?: IUser;
}