import express from 'express';
import helmet from 'helmet';
import cors from 'cors';

export function createApp({ clientOrigin = 'http://localhost:5173' } = {}) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: clientOrigin, credentials: true }));
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  return app;
}
