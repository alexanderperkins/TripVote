import { AppError } from '../services/errors.js';
import { logger } from '../config/logger.js';

export function notFound(req, res, next) {
  next(new AppError(404, 'NOT_FOUND', 'This endpoint does not exist.'));
}

function sendError(res, status, { code, message, fields }) {
  res.status(status).json({ error: { code, message, ...(fields && { fields }) } });
}

// Express only treats a middleware as an error handler when it declares all four arguments.
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return sendError(res, err.status, err);
  }
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, {
      code: 'VALIDATION_ERROR',
      message: 'Request body is not valid JSON.',
    });
  }
  logger.error(err);
  return sendError(res, 500, {
    code: 'INTERNAL_ERROR',
    message: 'Something went wrong. Please try again.',
  });
}
