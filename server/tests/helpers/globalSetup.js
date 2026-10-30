import { MongoMemoryServer } from 'mongodb-memory-server';

// Starts one in-memory MongoDB for the whole run (the first run downloads the binary).
export default async function setup({ provide }) {
  const mongoServer = await MongoMemoryServer.create();
  provide('mongoUri', mongoServer.getUri());

  return async () => {
    await mongoServer.stop();
  };
}
