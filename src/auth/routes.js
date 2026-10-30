import { Router } from 'express';
import { hashPassword, verifyPassword } from './passwords.js';
import { createLoginLimiter } from './rateLimit.js';
import { SESSION_COOKIE, SESSION_TTL_MS, createSession, deleteSession } from './sessions.js';
import { requireAuth } from './middleware.js';
import { validateLogin, validateSignup } from './validation.js';

const INVALID_CREDENTIALS = 'Invalid email or password.';

export function authRouter(db, { secureCookies = false, loginLimiter = createLoginLimiter() } = {}) {
  const router = Router();

  // Verifying against a throwaway hash when the email is unknown keeps response times
  // similar, so login timing doesn't reveal which emails are registered.
  let dummyHash;
  const getDummyHash = async () => (dummyHash ??= await hashPassword('not-a-real-password'));

  const startSession = (res, userId) => {
    const { token } = createSession(db, userId);
    res.cookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: secureCookies,
      maxAge: SESSION_TTL_MS,
      path: '/',
    });
  };

  router.post('/signup', async (req, res) => {
    const { value, errors } = validateSignup(req.body);
    if (errors) return res.status(400).json({ error: 'Please fix the highlighted fields.', fields: errors });

    const passwordHash = await hashPassword(value.password);
    let userId;
    try {
      const result = db
        .prepare('INSERT INTO users (email, display_name, password_hash) VALUES (?, ?, ?)')
        .run(value.email, value.displayName, passwordHash);
      userId = Number(result.lastInsertRowid);
    } catch (err) {
      if (/UNIQUE constraint failed: users\.email/.test(err.message)) {
        return res.status(409).json({
          error: 'An account with that email already exists.',
          fields: { email: 'An account with that email already exists.' },
        });
      }
      throw err;
    }

    startSession(res, userId);
    res.status(201).json({ user: { id: userId, email: value.email, displayName: value.displayName } });
  });

  router.post('/login', async (req, res) => {
    const { value, errors } = validateLogin(req.body);
    if (errors) return res.status(400).json({ error: errors.form });

    if (loginLimiter.isBlocked(value.email)) {
      return res.status(429).json({ error: 'Too many failed attempts. Please try again later.' });
    }

    const user = db
      .prepare('SELECT id, email, display_name AS displayName, password_hash AS passwordHash FROM users WHERE email = ?')
      .get(value.email);
    const ok = await verifyPassword(value.password, user?.passwordHash ?? (await getDummyHash()));

    if (!user || !ok) {
      loginLimiter.recordFailure(value.email);
      return res.status(401).json({ error: INVALID_CREDENTIALS });
    }

    loginLimiter.reset(value.email);
    // Drop any session the client already had so a fixed/old token can't ride along.
    deleteSession(db, req.sessionToken);
    startSession(res, user.id);
    res.json({ user: { id: user.id, email: user.email, displayName: user.displayName } });
  });

  router.post('/logout', (req, res) => {
    deleteSession(db, req.sessionToken);
    res.clearCookie(SESSION_COOKIE, { httpOnly: true, sameSite: 'lax', secure: secureCookies, path: '/' });
    res.status(204).end();
  });

  router.get('/me', requireAuth, (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}
