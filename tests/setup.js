/**
 * Test Setup File
 *
 * Common test utilities and setup for the maestro-plugin test suite.
 */

import { beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Create a temporary test directory
 * @returns {string} Path to temporary directory
 */
export function createTempDir() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'maestro-test-'));
  return tempDir;
}

/**
 * Clean up a temporary directory
 * @param {string} dirPath - Path to directory to clean up
 */
export function cleanupTempDir(dirPath) {
  if (dirPath && fs.existsSync(dirPath)) {
    fs.rmSync(dirPath, { recursive: true, force: true });
  }
}

/**
 * Create a mock knowledge entry
 * @param {Object} overrides - Fields to override
 * @returns {Object} Mock knowledge entry
 */
export function createMockKnowledgeEntry(overrides = {}) {
  return {
    type: 'decision',
    title: 'Test Decision',
    domain: 'testing',
    tags: ['test', 'mock'],
    content: {
      summary: 'This is a test decision',
      choice: 'Option A',
      rationale: 'Because it was the best option'
    },
    context: {
      trackId: 'test-track-1',
      taskId: 'test-task-1',
      branch: 'main'
    },
    confidence: 0.8,
    ...overrides
  };
}

/**
 * Create a mock session
 * @param {Object} overrides - Fields to override
 * @returns {Object} Mock session object
 */
export function createMockSession(overrides = {}) {
  return {
    sessionId: `test-session-${Date.now()}`,
    branch: 'main',
    startedAt: new Date().toISOString(),
    entries: [],
    ...overrides
  };
}

/**
 * Wait for a specified time
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise} Resolves after delay
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
