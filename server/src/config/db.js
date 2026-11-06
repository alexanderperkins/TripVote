import mongoose from 'mongoose';
import { logger } from './logger.js';

export async function connectDb(uri) {
  await mongoose.connect(uri);
  logger.info('Connected to MongoDB');
}

export async function disconnectDb() {
  await mongoose.disconnect();
}
