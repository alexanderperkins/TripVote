const DEFAULT_PORT = 4000;

function parseList(value = '') {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

// MONGODB_URI is optional so the app can start before a database is set up.
// DNS_SERVERS is optional; it works around Node failing SRV lookups (querySrv ECONNREFUSED) on some networks.
export function loadEnv(source = process.env) {
  return {
    nodeEnv: source.NODE_ENV ?? 'development',
    port: Number(source.PORT ?? DEFAULT_PORT),
    clientOrigin: source.CLIENT_ORIGIN ?? 'http://localhost:5173',
    mongoUri: source.MONGODB_URI ?? '',
    dnsServers: parseList(source.DNS_SERVERS),
  };
}
