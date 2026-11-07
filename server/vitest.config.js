import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    hookTimeout: 60000, // first run downloads a MongoDB binary for mongodb-memory-server
    coverage: { include: ['src/services/**'] },
  },
});
