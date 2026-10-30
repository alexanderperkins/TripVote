import { describe, it, expect } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

const VALID = {
  MONGODB_URI: 'mongodb://localhost/tripvote',
  JWT_SECRET: 'a-secret-that-is-at-least-32-chars-long',
};

describe('loadEnv', () => {
  it('reads the database connection string from MONGODB_URI', () => {
    expect(loadEnv(VALID).mongoUri).toBe('mongodb://localhost/tripvote');
  });

  it('fails fast when MONGODB_URI is missing', () => {
    expect(() => loadEnv({ ...VALID, MONGODB_URI: '' })).toThrow(/MONGODB_URI/);
  });

  it('fails fast when JWT_SECRET is missing or too short', () => {
    expect(() => loadEnv({ ...VALID, JWT_SECRET: undefined })).toThrow(/JWT_SECRET/);
    expect(() => loadEnv({ ...VALID, JWT_SECRET: 'short' })).toThrow(/JWT_SECRET/);
  });

  it('uses Secure cookies unless explicitly turned off', () => {
    expect(loadEnv(VALID).isCookieSecure).toBe(true);
    expect(loadEnv({ ...VALID, COOKIE_SECURE: 'false' }).isCookieSecure).toBe(false);
  });
});
