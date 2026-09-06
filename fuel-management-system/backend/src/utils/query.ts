import { Request } from 'express';

/**
 * Extracts only plain string query parameters. This strips arrays and nested
 * objects, which also protects against query-string based NoSQL injection.
 */
export function getQueryParams(req: Request): Record<string, string | undefined> {
  const params: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      params[key] = value;
    } else if (Array.isArray(value) && typeof value[0] === 'string') {
      params[key] = value[0];
    }
  }
  return params;
}