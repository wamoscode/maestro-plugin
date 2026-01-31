/**
 * MCP Tools Integration Tests
 *
 * Tests for the MCP server tool handlers covering
 * health check, backup/restore, and diagram generation.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import fs from 'fs';
import path from 'path';
import { createTempDir, cleanupTempDir } from '../setup.js';

// Import the module under test - no mocking needed for these integration tests
const MaestroMCPServer = require('../../mcp/server.js');

describe('MCP Server Tools', () => {
  let server;
  let tempDir;
  let originalCwd;

  beforeEach(() => {
    tempDir = createTempDir();
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Create necessary directories
    fs.mkdirSync(path.join(tempDir, 'maestro'), { recursive: true });
    fs.mkdirSync(path.join(tempDir, 'maestro', 'knowledge'), { recursive: true });

    server = new MaestroMCPServer();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    cleanupTempDir(tempDir);
  });

  describe('toolHealthCheck', () => {
    it('should return health status', () => {
      const result = server.toolHealthCheck({});

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const health = JSON.parse(result.content[0].text);
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.version).toBeDefined();
      expect(health.components).toBeDefined();
    });

    it('should include component statuses', () => {
      const result = server.toolHealthCheck({});
      const health = JSON.parse(result.content[0].text);

      expect(health.components.learning).toBeDefined();
      expect(health.components.learning.status).toBe('healthy');
      expect(health.components.sync).toBeDefined();
      expect(health.components.cdd).toBeDefined();
      expect(health.components.agents).toBeDefined();
    });

    it('should include agent statistics', () => {
      const result = server.toolHealthCheck({});
      const health = JSON.parse(result.content[0].text);

      // Integration test - uses real agent registry (42 agents, 10 categories)
      expect(health.components.agents.totalAgents).toBeGreaterThan(0);
      expect(health.components.agents.categories).toBeGreaterThan(0);
    });

    it('should include execution counts', () => {
      const result = server.toolHealthCheck({});
      const health = JSON.parse(result.content[0].text);

      expect(health.executions).toBeDefined();
      expect(health.executions.active).toBe(0);
      expect(health.executions.workflows).toBe(0);
    });

    it('should include response time', () => {
      const result = server.toolHealthCheck({});
      const health = JSON.parse(result.content[0].text);

      expect(health.responseTime).toMatch(/^\d+ms$/);
    });

    it('should include memory info when verbose', () => {
      const result = server.toolHealthCheck({ verbose: true });
      const health = JSON.parse(result.content[0].text);

      expect(health.memory).toBeDefined();
      expect(health.memory.heapUsed).toMatch(/MB$/);
      expect(health.memory.heapTotal).toMatch(/MB$/);
      expect(health.memory.rss).toMatch(/MB$/);
    });
  });

  describe('toolGenerateDiagram', () => {
    it('should handle no tracks gracefully', () => {
      const result = server.toolGenerateDiagram({ type: 'flowchart' });

      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.message).toContain('No tracks found');
    });

    it('should generate flowchart with tracks', () => {
      // Create a track
      const tracksDir = path.join(tempDir, 'maestro', 'tracks', 'test-track');
      fs.mkdirSync(tracksDir, { recursive: true });
      fs.writeFileSync(
        path.join(tracksDir, 'metadata.json'),
        JSON.stringify({ id: 'test-track', title: 'Test Track', status: 'in-progress' })
      );

      const result = server.toolGenerateDiagram({ type: 'flowchart' });
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(true);
      expect(data.type).toBe('flowchart');
      expect(data.diagram).toContain('flowchart TD');
    });

    it('should generate gantt diagram with tracks', () => {
      const tracksDir = path.join(tempDir, 'maestro', 'tracks', 'test-track');
      fs.mkdirSync(tracksDir, { recursive: true });
      fs.writeFileSync(
        path.join(tracksDir, 'metadata.json'),
        JSON.stringify({ id: 'test-track', title: 'Test Track', status: 'in-progress', type: 'feature' })
      );

      const result = server.toolGenerateDiagram({ type: 'gantt' });
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(true);
      expect(data.type).toBe('gantt');
      expect(data.diagram).toContain('gantt');
    });

    it('should generate mindmap diagram with tracks', () => {
      const tracksDir = path.join(tempDir, 'maestro', 'tracks', 'test-track');
      fs.mkdirSync(tracksDir, { recursive: true });
      fs.writeFileSync(
        path.join(tracksDir, 'metadata.json'),
        JSON.stringify({ id: 'test-track', title: 'Test Track', status: 'in-progress', type: 'feature' })
      );

      const result = server.toolGenerateDiagram({ type: 'mindmap' });
      const data = JSON.parse(result.content[0].text);

      expect(data.success).toBe(true);
      expect(data.type).toBe('mindmap');
      expect(data.diagram).toContain('mindmap');
    });
  });

  describe('toolKbBackup', () => {
    it('should create backup file', async () => {
      // Create some knowledge to backup
      const knowledgeDir = path.join(tempDir, 'maestro', 'knowledge');
      fs.mkdirSync(path.join(knowledgeDir, 'decisions'), { recursive: true });
      fs.writeFileSync(
        path.join(knowledgeDir, 'decisions', 'dec_test.json'),
        JSON.stringify({
          id: 'dec_test',
          type: 'decision',
          title: 'Test Decision',
          content: { rationale: 'For testing' }
        })
      );

      const result = await server.toolKbBackup({});

      expect(result.content).toBeDefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.path).toBeDefined();

      // Verify backup file exists
      expect(fs.existsSync(data.path)).toBe(true);
    });

    it('should backup to custom path', async () => {
      const customPath = path.join(tempDir, 'custom-backup.json');
      const result = await server.toolKbBackup({ outputPath: customPath });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.path).toBe(customPath);
      expect(fs.existsSync(customPath)).toBe(true);
    });
  });

  describe('toolKbRestore', () => {
    it('should restore from backup file', async () => {
      // Create a backup file with the correct format
      const backupPath = path.join(tempDir, 'test-backup.json');
      const backupData = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        branch: 'global',
        entries: [
          {
            id: 'dec_restored',
            type: 'decision',
            title: 'Restored Decision',
            content: { rationale: 'Restored from backup' },
            metadata: { createdAt: new Date().toISOString() }
          }
        ],
        totalEntries: 1
      };
      fs.writeFileSync(backupPath, JSON.stringify(backupData));

      const result = await server.toolKbRestore({ inputPath: backupPath });

      expect(result.content).toBeDefined();
      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.restored).toBe(1);
      expect(data.message).toContain('Restored');
    });

    it('should fail for non-existent file', async () => {
      const result = await server.toolKbRestore({
        inputPath: '/nonexistent/backup.json'
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(false);
      expect(data.error).toBeDefined();
    });

    it('should support dry run mode', async () => {
      const backupPath = path.join(tempDir, 'test-backup.json');
      const backupData = {
        version: '1.0.0',
        createdAt: new Date().toISOString(),
        branch: 'global',
        entries: [
          {
            id: 'dec_dryrun',
            type: 'decision',
            title: 'Dry Run Decision'
          }
        ],
        totalEntries: 1
      };
      fs.writeFileSync(backupPath, JSON.stringify(backupData));

      const result = await server.toolKbRestore({
        inputPath: backupPath,
        dryRun: true
      });

      const data = JSON.parse(result.content[0].text);
      expect(data.success).toBe(true);
      expect(data.dryRun).toBe(true);
    });
  });
});
