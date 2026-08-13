import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { logger } from '../config/logger.js';

/**
 * Request logging middleware.
 * Assigns a unique request ID and logs request/response.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const requestId = randomUUID();
  const startTime = Date.now();

  // Attach request ID for downstream use
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);

  // Log request
  logger.info(
    {
      requestId,
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
    },
    'Incoming request',
  );

  // Log response on finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(
      {
        requestId,
        method: req.method,
        url: req.originalUrl,
        statusCode: res.statusCode,
        duration: `${duration}ms`,
      },
      'Request completed',
    );
  });

  next();
}
