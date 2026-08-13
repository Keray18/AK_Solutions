import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/db/schema/**', 'src/db/migrations/**', 'src/config/**'],
    },
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': '/src',
      '@config': '/src/config',
      '@db': '/src/db',
      '@modules': '/src/modules',
      '@middleware': '/src/middleware',
      '@shared': '/src/shared',
    },
  },
});
