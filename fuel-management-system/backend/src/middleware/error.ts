import { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import { MulterError } from 'multer';
import { env } from '../config/env';
import { ApiError } from '../utils/ApiError';
import { logger } from '../utils/logger';

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`
  });
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  let statusCode = 500;
  let message = 'Something went wrong on our side. Please try again.';
  let errors: Record<string, string[]> | undefined;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof MulterError) {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      statusCode = 413;
      message = `File is too large. Maximum allowed slip size is ${env.MAX_FILE_SIZE_MB} MB.`;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field. Please upload the slip using the form-data field name "file".';
    } else {
      message = `File upload error: ${err.message}`;
    }
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = 'Validation failed. Please check your input.';
    errors = {};
    for (const [key, subError] of Object.entries(err.errors)) {
      errors[key] = [subError.message];
    }
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = `Invalid value for "${err.path}".`;
  } else if ((err as { code?: number })?.code === 11000) {
    statusCode = 409;
    const keyValue = (err as { keyValue?: Record<string, unknown> }).keyValue ?? {};
    const fields = Object.keys(keyValue);
    message = fields.length
      ? `Duplicate value for: ${fields.join(', ')}. This record already exists.`
      : 'Duplicate record detected.';
  } else if (err instanceof Error) {
    message = env.NODE_ENV === 'production' ? 'Something went wrong on our side. Please try again.' : err.message;
  }

  if (statusCode >= 500) {
    logger.error(`${req.method} ${req.originalUrl} → ${statusCode}`, {
      message: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined
    });
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {})
  });
}