import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['skills/**/*.js', 'hooks/**/*.js', 'mcp/**/*.js'],
      exclude: [
        'node_modules/**',
        'tests/**',
        '**/*.test.js',
        'scripts/**'
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    reporters: ['verbose'],
    pool: 'forks'
  }
});
