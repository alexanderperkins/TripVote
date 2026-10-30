import { registerUser, authenticateUser } from '../services/authService.js';
import { signToken } from '../services/tokenService.js';
import { SESSION_COOKIE } from '../middleware/requireAuth.js';

function cookieOptions({ isCookieSecure }) {
  return { httpOnly: true, secure: isCookieSecure, sameSite: 'lax', path: '/' };
}

function startSession(res, userId, config) {
  const token = signToken(userId, {
    secret: config.jwtSecret,
    expiresIn: config.sessionTtlSeconds,
  });
  res.cookie(SESSION_COOKIE, token, {
    ...cookieOptions(config),
    maxAge: config.sessionTtlSeconds * 1000,
  });
}

export async function register(req, res) {
  const user = await registerUser(req.body);
  startSession(res, user.id, req.app.locals.config);
  res.status(201).json(user);
}

export async function login(req, res) {
  const user = await authenticateUser(req.body);
  startSession(res, user.id, req.app.locals.config);
  res.json(user);
}

export function logout(req, res) {
  res.clearCookie(SESSION_COOKIE, cookieOptions(req.app.locals.config));
  res.status(204).end();
}

export function getCurrentUser(req, res) {
  res.json(req.user);
}
