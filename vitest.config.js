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
        // Global thresholds - Phase 1 baseline
        lines: 20,
        functions: 25,
        branches: 20,
        statements: 20,
        // Core modules thresholds - must maintain 60%+
        'skills/knowledge-store.js': {
          lines: 60,
          functions: 60,
          branches: 50,
          statements: 60
        },
        'skills/session-learning-controller.js': {
          lines: 60,
          functions: 60,
          branches: 45,
          statements: 60
        }
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 5000,
    reporters: ['verbose'],
    pool: 'forks'
  }
});
