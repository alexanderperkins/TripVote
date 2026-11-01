const DEFAULT_PORT = 4000;

// MONGODB_URI is optional so the app can start before a database is set up.
export function loadEnv(source = process.env) {
  return {
    nodeEnv: source.NODE_ENV ?? 'development',
    port: Number(source.PORT ?? DEFAULT_PORT),
    clientOrigin: source.CLIENT_ORIGIN ?? 'http://localhost:5173',
    mongoUri: source.MONGODB_URI ?? '',
  };
}
