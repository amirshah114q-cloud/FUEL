import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserRole } from '../models/user.model';

export interface TokenPayload {
  sub: string;
  role: UserRole;
}

export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN });
}