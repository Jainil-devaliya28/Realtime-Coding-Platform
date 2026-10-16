// ============================================================
// RATE LIMITING MIDDLEWARE - Protect against abuse
// ============================================================

import rateLimit from 'express-rate-limit';
import { config } from '../config';
import { redis } from '../config/redis';
import { logger } from '../utils/logger';

// General API rate limiter
export const apiRateLimit = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many requests, please try again later',
      code: 'RATE_LIMIT_EXCEEDED',
    },
  },
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', {
      ip: req.ip,
      url: req.url,
      userId: req.user?.userId,
    });
    res.status(429).json(options.message);
  },
});

// Strict rate limiter for auth endpoints
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      message: 'Too many authentication attempts, please try again in 15 minutes',
      code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
  },
});

// Execution rate limiter
export const executionRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
  message: {
    error: {
      message: 'Execution rate limit exceeded. Max 10 executions per minute.',
      code: 'EXECUTION_RATE_LIMIT',
    },
  },
});

// AI rate limiter
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
  message: {
    error: {
      message: 'AI request rate limit exceeded. Max 20 requests per minute.',
      code: 'AI_RATE_LIMIT',
    },
  },
});
