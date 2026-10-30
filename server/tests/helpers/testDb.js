import { randomUUID } from 'node:crypto';
import mongoose from 'mongoose';
import { inject } from 'vitest';

// Each test file gets its own database on the shared in-memory server.
export async function startTestDb() {
  await mongoose.connect(inject('mongoUri'), { dbName: `test-${randomUUID()}` });
}

export async function clearTestDb() {
  const collections = Object.values(mongoose.connection.collections);
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
}

export async function stopTestDb() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
}
