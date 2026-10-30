import { createApp } from '../../src/app.js';

export const TEST_CONFIG = {
  clientOrigin: 'http://localhost:5173',
  jwtSecret: 'test-secret-that-is-long-enough-for-hs256',
  jwtExpiresIn: '1h',
  isCookieSecure: false,
  authRateLimit: 1000,
};

export function createTestApp(overrides = {}) {
  return createApp({ ...TEST_CONFIG, ...overrides });
}
