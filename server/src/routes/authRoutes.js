import { Router } from 'express';
import { register, login, logout, getCurrentUser } from '../controllers/authController.js';
import { validateBody } from '../middleware/validate.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { createAuthRateLimiter } from '../middleware/rateLimit.js';
import { registerSchema, loginSchema } from '../validators/authSchemas.js';

export function createAuthRouter({ authRateLimit }) {
  const router = Router();
  const authRateLimiter = createAuthRateLimiter(authRateLimit);

  router.post('/register', authRateLimiter, validateBody(registerSchema), register);
  router.post('/login', authRateLimiter, validateBody(loginSchema), login);
  router.post('/logout', logout);
  router.get('/me', requireAuth, getCurrentUser);

  return router;
}
