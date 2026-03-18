import { defineConfig } from 'vitest/config';
import { fileURLToPath, URL } from 'url';

export default defineConfig({
  resolve: {
    alias: {
      "~": fileURLToPath(new URL("./app", import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/**/*.test.{ts,tsx,js}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      statements: 80,
      branches: 70,
      functions: 80,
      lines: 80,
    },
  }
});
