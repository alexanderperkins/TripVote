import { defineConfig, devices } from '@playwright/test';

// E2E runs its own API (on an in-memory MongoDB) and Vite server on separate ports,
// so it never touches Atlas and does not clash with `npm run dev`.
const API_PORT = 4100;
const WEB_PORT = 5174;
const BASE_URL = `http://localhost:${WEB_PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/support/startApi.js',
      url: `http://localhost:${API_PORT}/api/health`,
      env: { E2E_API_PORT: String(API_PORT), E2E_CLIENT_ORIGIN: BASE_URL },
      timeout: 180_000,
      reuseExistingServer: false,
    },
    {
      command: `npm run dev --workspace client -- --port ${WEB_PORT} --strictPort`,
      url: BASE_URL,
      env: { API_PROXY_TARGET: `http://localhost:${API_PORT}` },
      timeout: 120_000,
      reuseExistingServer: false,
    },
  ],
});
