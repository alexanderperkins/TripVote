import dns from 'node:dns';
import { existsSync } from 'node:fs';
import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import { logger } from './config/logger.js';

// server/.env is optional; copy it from .env.example (see README).
if (existsSync('.env')) {
  process.loadEnvFile('.env');
}

const env = loadEnv();

if (env.dnsServers.length > 0) {
  dns.setServers(env.dnsServers);
}

if (env.mongoUri) {
  await connectDb(env.mongoUri);
} else {
  logger.warn('MONGODB_URI is not set: starting without a database. See README "MongoDB setup".');
}

const app = createApp({ clientOrigin: env.clientOrigin });
app.listen(env.port, () => {
  logger.info(`API listening on http://localhost:${env.port}`);
});
