import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { createAuthRouter } from './routes/authRoutes.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

const DEFAULT_CONFIG = {
  clientOrigin: 'http://localhost:5173',
  sessionTtlSeconds: 24 * 60 * 60,
  isCookieSecure: true,
  authRateLimit: 20,
};

export function createApp(overrides = {}) {
  const config = { ...DEFAULT_CONFIG, ...overrides };
  const app = express();
  app.locals.config = config;

  app.use(helmet());
  app.use(cors({ origin: config.clientOrigin, credentials: true }));
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });
  app.use('/api/auth', createAuthRouter(config));

  app.use('/api', notFound);
  app.use(errorHandler);

  return app;
}
