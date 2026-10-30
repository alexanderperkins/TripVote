const DEFAULT_PORT = 4000;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
const DEFAULT_AUTH_RATE_LIMIT = 20;
const MIN_JWT_SECRET_LENGTH = 32;

function readEnv(source) {
  return {
    nodeEnv: source.NODE_ENV ?? 'development',
    port: Number(source.PORT ?? DEFAULT_PORT),
    clientOrigin: source.CLIENT_ORIGIN ?? 'http://localhost:5173',
    mongoUri: source.MONGODB_URI,
    jwtSecret: source.JWT_SECRET,
    sessionTtlSeconds: Number(source.SESSION_TTL_SECONDS ?? ONE_DAY_IN_SECONDS),
    isCookieSecure: source.COOKIE_SECURE !== 'false',
    authRateLimit: Number(source.AUTH_RATE_LIMIT ?? DEFAULT_AUTH_RATE_LIMIT),
  };
}

export function loadEnv(source = process.env) {
  const env = readEnv(source);
  if (!env.mongoUri) {
    throw new Error('MONGODB_URI is not set. Copy server/.env.example to server/.env.');
  }
  if (!env.jwtSecret || env.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(`JWT_SECRET must be set and at least ${MIN_JWT_SECRET_LENGTH} characters.`);
  }
  return env;
}
