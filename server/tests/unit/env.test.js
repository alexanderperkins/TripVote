import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const BASE = { JWT_SECRET: 'a-secret-that-is-at-least-32-chars-long' };

describe('loadEnv', () => {
  it('reads the MongoDB connection string from MONGODB_URI', () => {
    const env = loadEnv({ ...BASE, MONGODB_URI: 'mongodb://localhost:27017/tripvote-dev' });

    expect(env.mongoUri).toBe('mongodb://localhost:27017/tripvote-dev');
  });

  it('uses port 4000 and the Vite dev origin by default', () => {
    const env = loadEnv(BASE);

    expect(env.port).toBe(4000);
    expect(env.clientOrigin).toBe('http://localhost:5173');
  });

  it('allows starting without a database when MONGODB_URI is missing', () => {
    expect(loadEnv(BASE).mongoUri).toBe('');
  });

  it('reads a comma-separated DNS_SERVERS list', () => {
    expect(loadEnv({ ...BASE, DNS_SERVERS: '8.8.8.8, 1.1.1.1' }).dnsServers).toEqual([
      '8.8.8.8',
      '1.1.1.1',
    ]);
  });

  it('uses the system DNS when DNS_SERVERS is missing', () => {
    expect(loadEnv(BASE).dnsServers).toEqual([]);
  });

  it('reads the JWT secret from JWT_SECRET', () => {
    expect(loadEnv(BASE).jwtSecret).toBe(BASE.JWT_SECRET);
  });

  it('fails fast when JWT_SECRET is missing or shorter than 32 characters', () => {
    expect(() => loadEnv({})).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('keeps a login for one day by default', () => {
    expect(loadEnv(BASE).sessionTtlSeconds).toBe(86400);
    expect(loadEnv({ ...BASE, SESSION_TTL_SECONDS: '3600' }).sessionTtlSeconds).toBe(3600);
  });

  it('uses Secure cookies unless COOKIE_SECURE is false', () => {
    expect(loadEnv(BASE).isCookieSecure).toBe(true);
    expect(loadEnv({ ...BASE, COOKIE_SECURE: 'false' }).isCookieSecure).toBe(false);
  });

  it('allows 20 sign-up and log-in attempts per window by default', () => {
    expect(loadEnv(BASE).authRateLimit).toBe(20);
  });
});
