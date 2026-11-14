import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const API_TARGET = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Playwright points this at its own API (see playwright.config.js).
    proxy: {
      '/api': API_TARGET,
      '/socket.io': { target: API_TARGET, ws: true },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    coverage: { include: ['src/lib/**'] },
  },
});
