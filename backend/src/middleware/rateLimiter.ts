import rateLimit from 'express-rate-limit';
import { RATE_LIMITS } from '../shared/constants/index.js';
import { sendError } from '../shared/utils/apiResponse.js';

/**
 * Global rate limiter — applied to all routes.
 */
export const globalLimiter = rateLimit({
  windowMs: RATE_LIMITS.GLOBAL.windowMs,
  max: RATE_LIMITS.GLOBAL.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Too many requests, please try again later');
  },
});

/**
 * Auth rate limiter — stricter, applied to login/register.
 */
export const authLimiter = rateLimit({
  windowMs: RATE_LIMITS.AUTH.windowMs,
  max: RATE_LIMITS.AUTH.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Too many authentication attempts, please try again later');
  },
});

/**
 * AI rate limiter — moderate, applied to AI consultation endpoints.
 */
export const aiLimiter = rateLimit({
  windowMs: RATE_LIMITS.AI.windowMs,
  max: RATE_LIMITS.AI.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'AI consultation rate limit reached, please try again shortly');
  },
});

/**
 * Search rate limiter.
 */
export const searchLimiter = rateLimit({
  windowMs: RATE_LIMITS.SEARCH.windowMs,
  max: RATE_LIMITS.SEARCH.max,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Search rate limit reached, please try again shortly');
  },
});
