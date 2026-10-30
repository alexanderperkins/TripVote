const DEFAULT_PORT = 4000;

function readEnv(source = process.env) {
  return {
    nodeEnv: source.NODE_ENV ?? 'development',
    port: Number(source.PORT ?? DEFAULT_PORT),
    clientOrigin: source.CLIENT_ORIGIN ?? 'http://localhost:5173',
    mongoUri: source.MONGODB_URI,
  };
}

export function loadEnv(source = process.env) {
  const env = readEnv(source);
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env.');
  }
  return env;
}
