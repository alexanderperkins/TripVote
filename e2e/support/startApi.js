// Starts the real Express app on a throwaway in-memory MongoDB for Playwright.
// Started by playwright.config.js; never uses server/.env or Atlas.
import { randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { createApp } from '../../server/src/app.js';
import { connectDb, disconnectDb } from '../../server/src/config/db.js';
import { logger } from '../../server/src/config/logger.js';
import { attachRealtime } from '../../server/src/realtime/socketServer.js';

const port = Number(process.env.E2E_API_PORT ?? 4100);

const mongoServer = await MongoMemoryServer.create();
await connectDb(mongoServer.getUri());

const app = createApp({
  clientOrigin: process.env.E2E_CLIENT_ORIGIN ?? 'http://localhost:5174',
  jwtSecret: randomBytes(48).toString('hex'),
  isCookieSecure: false,
  // Every spec signs up fresh users, so the per-IP auth limit would trip during a run.
  authRateLimit: 10_000,
});

const server = createServer(app);
attachRealtime(server, app);
server.listen(port, () => {
  logger.info(`E2E API listening on http://localhost:${port}`);
});

async function shutdown() {
  server.close();
  await disconnectDb();
  await mongoServer.stop();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
