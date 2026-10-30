import { AppError } from '../services/errors.js';

// First message per top-level field, e.g. { email: 'Enter a valid email address.' }.
function toFieldErrors(issues) {
  const fields = {};
  for (const issue of issues) {
    const field = issue.path[0] ?? 'body';
    fields[field] ??= issue.message;
  }
  return fields;
}

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Please fix the highlighted fields.',
        toFieldErrors(result.error.issues),
      );
    }
    req.body = result.data;
    next();
  };
}
