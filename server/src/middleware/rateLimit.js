import { rateLimit } from 'express-rate-limit';
import { AppError } from '../services/errors.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export function createAuthRateLimiter(limit) {
  return rateLimit({
    windowMs: FIFTEEN_MINUTES_MS,
    limit,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    handler: (req, res, next) =>
      next(
        new AppError(
          429,
          'TOO_MANY_REQUESTS',
          'Too many attempts. Please wait a few minutes and try again.',
        ),
      ),
  });
}
