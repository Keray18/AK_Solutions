import type { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/types/errors.js';
import { sendError } from '../shared/utils/apiResponse.js';
import { logger } from '../config/logger.js';
import { env } from '../config/env.js';

/**
 * Centralized error handling middleware.
 * Must be registered LAST in the middleware chain.
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Operational errors (expected)
  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message, err.details);
    return;
  }

  // JSON parse errors
  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 400, 'INVALID_JSON', 'Invalid JSON in request body');
    return;
  }

  // Unexpected errors
  logger.error({ err }, 'Unhandled error');

  const message =
    env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message;

  sendError(res, 500, 'INTERNAL_ERROR', message);
}
