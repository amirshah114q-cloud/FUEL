import { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { ZodSchema } from 'zod';
import { ApiError } from '../utils/ApiError';

/**
 * Validates req.body against a Zod schema. On success the parsed (and
 * coerced/cleaned) data replaces req.body. On failure a 400 with
 * field-level messages is returned.
 */
export function validateBody(schema: ZodSchema) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const errors: Record<string, string[]> = {};
      for (const [field, messages] of Object.entries(fieldErrors)) {
        if (messages && messages.length > 0) errors[field] = messages;
      }
      next(ApiError.badRequest('Validation failed. Please check the highlighted fields.', errors));
      return;
    }
    req.body = result.data;
    next();
  };
}

/**
 * Ensures a route parameter is a valid MongoDB ObjectId.
 */
export function validateObjectId =
  (paramName: string) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    const value = req.params[paramName];
    if (!value || !Types.ObjectId.isValid(value)) {
      next(ApiError.badRequest(`Invalid "${paramName}" parameter — expected a MongoDB ObjectId.`));
      return;
    }
    next();
  };