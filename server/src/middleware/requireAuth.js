import { verifyToken } from '../services/tokenService.js';
import { findUserById } from '../services/authService.js';
import { AppError } from '../services/errors.js';

export const SESSION_COOKIE = 'token';

export async function requireAuth(req, res, next) {
  const { jwtSecret } = req.app.locals.config;
  const userId = verifyToken(req.cookies[SESSION_COOKIE], { secret: jwtSecret });
  const user = userId && (await findUserById(userId));
  if (!user) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Please log in to continue.');
  }
  req.user = user;
  next();
}
