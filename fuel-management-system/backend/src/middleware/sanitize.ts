import { NextFunction, Request, Response } from 'express';

function stripOperatorKeys(obj: Record<string, unknown>): void {
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$') || key.includes('.')) {
      delete obj[key];
      continue;
    }
    const value = obj[key];
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      stripOperatorKeys(value as Record<string, unknown>);
    }
  }
}

/**
 * Defense-in-depth against NoSQL operator injection: removes any request-body
 * keys like "$gt" or "user.email" before they can reach Mongoose. Zod
 * validators already whitelist fields; this additionally guards nested
 * objects and any payload that bypasses a schema.
 */
export function mongoSanitize(req: Request, _res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
    stripOperatorKeys(req.body as Record<string, unknown>);
  }
  next();
}