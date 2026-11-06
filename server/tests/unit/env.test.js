import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

describe('loadEnv', () => {
  it('reads the MongoDB connection string from MONGODB_URI', () => {
    const env = loadEnv({ MONGODB_URI: 'mongodb://localhost:27017/tripvote-dev' });

    expect(env.mongoUri).toBe('mongodb://localhost:27017/tripvote-dev');
  });

  it('uses port 4000 and the Vite dev origin by default', () => {
    const env = loadEnv({});

    expect(env.port).toBe(4000);
    expect(env.clientOrigin).toBe('http://localhost:5173');
  });

  it('allows starting without a database when MONGODB_URI is missing', () => {
    expect(loadEnv({}).mongoUri).toBe('');
  });

  it('reads a comma-separated DNS_SERVERS list', () => {
    expect(loadEnv({ DNS_SERVERS: '8.8.8.8, 1.1.1.1' }).dnsServers).toEqual(['8.8.8.8', '1.1.1.1']);
  });

  it('uses the system DNS when DNS_SERVERS is missing', () => {
    expect(loadEnv({}).dnsServers).toEqual([]);
  });
});
