const DEFAULT_PORT = 4000;
const ONE_DAY_IN_SECONDS = 24 * 60 * 60;
const DEFAULT_AUTH_RATE_LIMIT = 20;
const MIN_JWT_SECRET_LENGTH = 32;

function parseList(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// MONGODB_URI is optional so the API can start before a database is set up (sign up and log in need it).
// DNS_SERVERS is optional; it works around Node failing SRV lookups (querySrv ECONNREFUSED) on some networks.
// JWT_SECRET is required: without it nobody could log in safely.
export function loadEnv(source = process.env) {
  const env = {
    nodeEnv: source.NODE_ENV ?? 'development',
    port: Number(source.PORT ?? DEFAULT_PORT),
    clientOrigin: source.CLIENT_ORIGIN ?? 'http://localhost:5173',
    mongoUri: source.MONGODB_URI ?? '',
    dnsServers: parseList(source.DNS_SERVERS),
    jwtSecret: source.JWT_SECRET ?? '',
    sessionTtlSeconds: Number(source.SESSION_TTL_SECONDS || ONE_DAY_IN_SECONDS),
    isCookieSecure: source.COOKIE_SECURE !== 'false',
    authRateLimit: Number(source.AUTH_RATE_LIMIT || DEFAULT_AUTH_RATE_LIMIT),
  };

  if (env.jwtSecret.length < MIN_JWT_SECRET_LENGTH) {
    throw new Error(
      `JWT_SECRET must be set and at least ${MIN_JWT_SECRET_LENGTH} characters. See server/.env.example.`,
    );
  }
  return env;
}
