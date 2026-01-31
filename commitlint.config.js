/**
 * Commitlint Configuration
 *
 * Enforces conventional commit format for consistent changelog generation.
 *
 * Format: <type>(<scope>): <subject>
 *
 * Types:
 * - feat: New feature
 * - fix: Bug fix
 * - docs: Documentation changes
 * - style: Code style changes (formatting, etc.)
 * - refactor: Code refactoring
 * - perf: Performance improvements
 * - test: Adding or updating tests
 * - build: Build system changes
 * - ci: CI configuration changes
 * - chore: Other changes
 *
 * Examples:
 * - feat(knowledge): Add entity tracking support
 * - fix(mcp): Handle null sync engine gracefully
 * - docs: Update CLAUDE.md with new commands
 * - test(knowledge-store): Add query tests
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',
        'fix',
        'docs',
        'style',
        'refactor',
        'perf',
        'test',
        'build',
        'ci',
        'chore',
        'revert'
      ]
    ],
    'scope-enum': [
      1, // Warning only
      'always',
      [
        'knowledge',
        'learning',
        'mcp',
        'hooks',
        'sync',
        'agents',
        'cdd',
        'tracks',
        'sessions',
        'worktree',
        'platform',
        'core',
        'cli',
        'config',
        'deps'
      ]
    ],
    'subject-case': [2, 'always', 'sentence-case'],
    'subject-max-length': [2, 'always', 72],
    'body-max-line-length': [2, 'always', 100],
    'header-max-length': [2, 'always', 100]
  }
};
