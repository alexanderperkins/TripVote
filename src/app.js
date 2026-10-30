import express from 'express';
import { fileURLToPath } from 'node:url';
import { authRouter } from './auth/routes.js';
import { loadUser } from './auth/middleware.js';

const PUBLIC_DIR = fileURLToPath(new URL('../public', import.meta.url));

export function createApp({ db, secureCookies = false, loginLimiter } = {}) {
  const app = express();
  app.disable('x-powered-by');

  app.use(express.json({ limit: '10kb' }));
  app.use(loadUser(db));

  app.use('/api/auth', authRouter(db, { secureCookies, loginLimiter }));
  app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

  app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found.' }));

  // eslint-disable-next-line no-unused-vars
  app.use((err, _req, res, _next) => {
    if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Malformed JSON body.' });
    if (err.type === 'entity.too.large') return res.status(413).json({ error: 'Request body too large.' });
    console.error(err);
    res.status(500).json({ error: 'Something went wrong.' });
  });

  return app;
}
