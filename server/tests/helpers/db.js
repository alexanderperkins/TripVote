import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod;

export async function startTestDb() {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
}

export async function clearTestDb() {
  await Promise.all(Object.values(mongoose.connection.collections).map((c) => c.deleteMany({})));
}

export async function stopTestDb() {
  await mongoose.disconnect();
  await mongod.stop();
}

// Stand-in for Yanli's login: the x-test-user header picks who is "logged in".
export const fakeAuth = (req, res, next) => {
  const id = req.get('x-test-user');
  if (!id) {
    return res.status(401).json({ error: { code: 'UNAUTHENTICATED', message: 'Log in first.' } });
  }
  req.user = { id };
  next();
};
