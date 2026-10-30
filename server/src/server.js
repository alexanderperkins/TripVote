import { createApp } from './app.js';
import { loadEnv } from './config/env.js';
import { connectDb } from './config/db.js';
import { logger } from './config/logger.js';

const env = loadEnv();
await connectDb(env.mongoUri);

const app = createApp(env);
app.listen(env.port, () => {
  logger.info(`API listening on http://localhost:${env.port}`);
});
