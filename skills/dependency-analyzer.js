/**
 * Dependency Analyzer Skill
 *
 * Tracks and analyzes dependency changes from package manifests:
 * - package.json (Node.js/npm)
 * - requirements.txt (Python)
 * - go.mod (Go)
 * - Cargo.toml (Rust)
 * - Gemfile (Ruby)
 * - pom.xml (Java/Maven)
 *
 * Detects:
 * - Added dependencies
 * - Removed dependencies
 * - Version updates (major/minor/patch)
 * - Technology decisions (framework adoptions, migrations)
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class DependencyAnalyzer {
  constructor(config = {}) {
    this.config = {
      repoPath: config.repoPath || process.cwd(),
      maestroDir: config.maestroDir || 'maestro',
      hydrationDir: config.hydrationDir || 'hydration',
      ...config
    };

    // Package manifest file patterns
    this.manifestPatterns = {
      npm: {
        file: 'package.json',
        parser: this.parsePackageJson.bind(this),
        diffParser: this.diffPackageJson.bind(this)
      },
      python: {
        file: 'requirements.txt',
        parser: this.parseRequirementsTxt.bind(this),
        diffParser: this.diffRequirementsTxt.bind(this)
      },
      go: {
        file: 'go.mod',
        parser: this.parseGoMod.bind(this),
        diffParser: this.diffGoMod.bind(this)
      },
      rust: {
        file: 'Cargo.toml',
        parser: this.parseCargoToml.bind(this),
        diffParser: this.diffCargoToml.bind(this)
      }
    };

    // Dependency category mappings
    this.categoryMappings = {
      // Frameworks
      framework: new Set([
        'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby',
        'express', 'fastify', 'koa', 'hapi', 'nest', '@nestjs/core',
        'django', 'flask', 'fastapi', 'rails'
      ]),
      // State management
      'state-management': new Set([
        'redux', '@reduxjs/toolkit', 'mobx', 'zustand', 'recoil', 'jotai',
        'valtio', 'xstate', 'effector'
      ]),
      // Data fetching
      'data-fetching': new Set([
        '@tanstack/react-query', 'swr', 'apollo-client', '@apollo/client',
        'axios', 'ky', 'got', 'node-fetch', 'isomorphic-fetch'
      ]),
      // Database/ORM
      database: new Set([
        'prisma', '@prisma/client', 'typeorm', 'sequelize', 'mongoose',
        'knex', 'objection', 'drizzle-orm', 'pg', 'mysql2', 'sqlite3',
        'mongodb', 'redis', 'ioredis'
      ]),
      // Build tools
      'build-tool': new Set([
        'webpack', 'vite', 'esbuild', 'rollup', 'parcel', 'turbopack',
        'tsup', 'unbuild'
      ]),
      // Type systems
      'type-system': new Set([
        'typescript', 'flow-bin', 'zod', 'yup', 'joi', 'io-ts', 'valibot'
      ]),
      // Testing
      testing: new Set([
        'jest', 'vitest', 'mocha', 'chai', 'ava', 'tape', 'uvu',
        'cypress', 'playwright', '@playwright/test', 'puppeteer',
        'testing-library', '@testing-library/react', '@testing-library/jest-dom'
      ]),
      // Styling
      styling: new Set([
        'tailwindcss', 'styled-components', '@emotion/react', '@emotion/styled',
        'sass', 'less', 'stylus', 'postcss', 'css-modules'
      ]),
      // Linting/Formatting
      'code-quality': new Set([
        'eslint', 'prettier', 'biome', 'oxlint', 'stylelint'
      ]),
      // Authentication
      auth: new Set([
        'passport', 'next-auth', '@auth/core', 'jsonwebtoken', 'bcrypt',
        'auth0', '@clerk/nextjs', 'firebase-admin'
      ]),
      // Utilities
      utility: new Set([
        'lodash', 'ramda', 'underscore', 'date-fns', 'moment', 'dayjs', 'luxon',
        'uuid', 'nanoid', 'chalk', 'ora', 'commander', 'yargs'
      ])
    };
  }

  /**
   * Analyze dependency changes from commits
   * @param {Array} commits - Parsed commits that touch manifest files
   * @param {Object} options - Analysis options
   * @returns {Object} Dependency analysis result
   */
  async analyzeFromCommits(commits, options = {}) {
    const result = {
      changes: [],
      timeline: [],
      decisions: [],
      statistics: {
        totalChanges: 0,
        addedCount: 0,
        removedCount: 0,
        updatedCount: 0,
        byCategory: {}
      }
    };

    // Filter commits that touch dependency files
    const depCommits = commits.filter(commit =>
      this.touchesDependencyFile(commit)
    );

    for (const commit of depCommits) {
      const change = await this.analyzeCommitChanges(commit, options);

      if (change && this.hasChanges(change)) {
        result.changes.push(change);
        result.statistics.totalChanges++;

        // Update counts
        result.statistics.addedCount += change.changes.added?.length || 0;
        result.statistics.removedCount += change.changes.removed?.length || 0;
        result.statistics.updatedCount += change.changes.updated?.length || 0;

        // Detect decisions
        const decisions = this.detectTechDecisions(change);
        result.decisions.push(...decisions);
      }
    }

    // Build timeline
    result.timeline = this.buildDependencyTimeline(result.changes);

    // Categorize statistics
    result.statistics.byCategory = this.categorizeChanges(result.changes);

    return result;
  }

  /**
   * Check if a commit touches dependency files
   * @param {Object} commit - Parsed commit
   * @returns {boolean}
   */
  touchesDependencyFile(commit) {
    const depFiles = Object.values(this.manifestPatterns).map(m => m.file);

    return (commit.filesChanged || []).some(file => {
      const fileName = path.basename(file);
      return depFiles.includes(fileName);
    });
  }

  /**
   * Analyze dependency changes in a specific commit
   * @param {Object} commit - Parsed commit
   * @param {Object} options - Options
   * @returns {Object} Change analysis
   */
  async analyzeCommitChanges(commit, options = {}) {
    const result = {
      commit: {
        hash: commit.hash,
        shortHash: commit.shortHash,
        date: commit.date,
        subject: commit.subject,
        author: commit.author?.name
      },
      manifestType: null,
      changes: {
        added: [],
        removed: [],
        updated: []
      },
      significance: 'patch',
      category: null
    };

    // Find which manifest files changed
    const changedManifests = (commit.filesChanged || [])
      .filter(file => {
        const fileName = path.basename(file);
        return Object.values(this.manifestPatterns).some(m => m.file === fileName);
      });

    if (changedManifests.length === 0) {
      return null;
    }

    // Analyze each manifest
    for (const manifestPath of changedManifests) {
      const fileName = path.basename(manifestPath);
      const manifestType = Object.entries(this.manifestPatterns)
        .find(([_, m]) => m.file === fileName)?.[0];

      if (!manifestType) continue;

      result.manifestType = manifestType;

      // Get diff for this file
      const diff = this.getFileDiff(commit.hash, manifestPath);

      if (diff) {
        const parser = this.manifestPatterns[manifestType].diffParser;
        const changes = parser(diff);

        result.changes.added.push(...changes.added);
        result.changes.removed.push(...changes.removed);
        result.changes.updated.push(...changes.updated);
      }
    }

    // Determine significance
    result.significance = this.calculateSignificance(result.changes);

    // Determine primary category
    result.category = this.determinePrimaryCategory(result.changes);

    return result;
  }

  /**
   * Get git diff for a specific file in a commit
   * @param {string} commitHash - Commit hash
   * @param {string} filePath - File path
   * @returns {string|null} Diff content
   */
  getFileDiff(commitHash, filePath) {
    try {
      const output = execSync(
        `git show ${commitHash} -- "${filePath}"`,
        {
          cwd: this.config.repoPath,
          encoding: 'utf8',
          maxBuffer: 10 * 1024 * 1024
        }
      );
      return output;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse package.json diff
   * @param {string} diff - Git diff output
   * @returns {Object} Parsed changes
   */
  diffPackageJson(diff) {
    const changes = { added: [], removed: [], updated: [] };
    const lines = diff.split('\n');

    // Track added and removed dependency lines
    const addedLines = [];
    const removedLines = [];

    let inDependencies = false;
    const depSections = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'];

    for (const line of lines) {
      // Check if we're entering/leaving a dependencies section
      for (const section of depSections) {
        if (line.includes(`"${section}":`)) {
          inDependencies = true;
          break;
        }
      }

      if (inDependencies) {
        // Closing brace ends the section
        if (line.match(/^\s*[+-]?\s*\}/)) {
          inDependencies = false;
          continue;
        }

        // Parse added lines
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
          if (match) {
            addedLines.push({ name: match[1], version: match[2] });
          }
        }

        // Parse removed lines
        if (line.startsWith('-') && !line.startsWith('---')) {
          const match = line.match(/"([^"]+)":\s*"([^"]+)"/);
          if (match) {
            removedLines.push({ name: match[1], version: match[2] });
          }
        }
      }
    }

    // Determine if changes are additions, removals, or updates
    const addedNames = new Set(addedLines.map(l => l.name));
    const removedNames = new Set(removedLines.map(l => l.name));

    for (const added of addedLines) {
      if (removedNames.has(added.name)) {
        // This is an update
        const removed = removedLines.find(r => r.name === added.name);
        changes.updated.push({
          name: added.name,
          from: removed.version,
          to: added.version
        });
      } else {
        changes.added.push(`${added.name}@${added.version}`);
      }
    }

    for (const removed of removedLines) {
      if (!addedNames.has(removed.name)) {
        changes.removed.push(`${removed.name}@${removed.version}`);
      }
    }

    return changes;
  }

  /**
   * Parse requirements.txt diff
   * @param {string} diff - Git diff output
   * @returns {Object} Parsed changes
   */
  diffRequirementsTxt(diff) {
    const changes = { added: [], removed: [], updated: [] };
    const lines = diff.split('\n');

    const addedLines = [];
    const removedLines = [];

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++') && line.trim().length > 1) {
        const match = line.substring(1).trim().match(/^([a-zA-Z0-9_-]+)(?:[=<>!]+(.+))?/);
        if (match) {
          addedLines.push({ name: match[1].toLowerCase(), version: match[2] || '*' });
        }
      }

      if (line.startsWith('-') && !line.startsWith('---') && line.trim().length > 1) {
        const match = line.substring(1).trim().match(/^([a-zA-Z0-9_-]+)(?:[=<>!]+(.+))?/);
        if (match) {
          removedLines.push({ name: match[1].toLowerCase(), version: match[2] || '*' });
        }
      }
    }

    // Categorize changes
    const addedNames = new Set(addedLines.map(l => l.name));
    const removedNames = new Set(removedLines.map(l => l.name));

    for (const added of addedLines) {
      if (removedNames.has(added.name)) {
        const removed = removedLines.find(r => r.name === added.name);
        changes.updated.push({
          name: added.name,
          from: removed.version,
          to: added.version
        });
      } else {
        changes.added.push(`${added.name}@${added.version}`);
      }
    }

    for (const removed of removedLines) {
      if (!addedNames.has(removed.name)) {
        changes.removed.push(`${removed.name}@${removed.version}`);
      }
    }

    return changes;
  }

  /**
   * Parse go.mod diff
   * @param {string} diff - Git diff output
   * @returns {Object} Parsed changes
   */
  diffGoMod(diff) {
    const changes = { added: [], removed: [], updated: [] };
    const lines = diff.split('\n');

    const addedLines = [];
    const removedLines = [];

    for (const line of lines) {
      if (line.startsWith('+') && !line.startsWith('+++')) {
        const match = line.substring(1).trim().match(/^(\S+)\s+v?([^\s]+)/);
        if (match && !match[1].startsWith('//')) {
          addedLines.push({ name: match[1], version: match[2] });
        }
      }

      if (line.startsWith('-') && !line.startsWith('---')) {
        const match = line.substring(1).trim().match(/^(\S+)\s+v?([^\s]+)/);
        if (match && !match[1].startsWith('//')) {
          removedLines.push({ name: match[1], version: match[2] });
        }
      }
    }

    // Categorize changes
    const addedNames = new Set(addedLines.map(l => l.name));
    const removedNames = new Set(removedLines.map(l => l.name));

    for (const added of addedLines) {
      if (removedNames.has(added.name)) {
        const removed = removedLines.find(r => r.name === added.name);
        changes.updated.push({
          name: added.name,
          from: removed.version,
          to: added.version
        });
      } else {
        changes.added.push(`${added.name}@${added.version}`);
      }
    }

    for (const removed of removedLines) {
      if (!addedNames.has(removed.name)) {
        changes.removed.push(`${removed.name}@${removed.version}`);
      }
    }

    return changes;
  }

  /**
   * Parse Cargo.toml diff
   * @param {string} diff - Git diff output
   * @returns {Object} Parsed changes
   */
  diffCargoToml(diff) {
    const changes = { added: [], removed: [], updated: [] };
    const lines = diff.split('\n');

    let inDependencies = false;
    const addedLines = [];
    const removedLines = [];

    for (const line of lines) {
      // Check for dependencies section
      if (line.match(/\[.*dependencies.*\]/i)) {
        inDependencies = true;
        continue;
      }

      // New section ends dependencies
      if (line.match(/^\[/) && !line.match(/dependencies/i)) {
        inDependencies = false;
        continue;
      }

      if (inDependencies) {
        if (line.startsWith('+') && !line.startsWith('+++')) {
          const match = line.substring(1).trim().match(/^([a-zA-Z0-9_-]+)\s*=\s*"?([^"]+)"?/);
          if (match) {
            addedLines.push({ name: match[1], version: match[2] });
          }
        }

        if (line.startsWith('-') && !line.startsWith('---')) {
          const match = line.substring(1).trim().match(/^([a-zA-Z0-9_-]+)\s*=\s*"?([^"]+)"?/);
          if (match) {
            removedLines.push({ name: match[1], version: match[2] });
          }
        }
      }
    }

    // Categorize changes
    const addedNames = new Set(addedLines.map(l => l.name));
    const removedNames = new Set(removedLines.map(l => l.name));

    for (const added of addedLines) {
      if (removedNames.has(added.name)) {
        const removed = removedLines.find(r => r.name === added.name);
        changes.updated.push({
          name: added.name,
          from: removed.version,
          to: added.version
        });
      } else {
        changes.added.push(`${added.name}@${added.version}`);
      }
    }

    for (const removed of removedLines) {
      if (!addedNames.has(removed.name)) {
        changes.removed.push(`${removed.name}@${removed.version}`);
      }
    }

    return changes;
  }

  /**
   * Parse package.json content (for current state)
   * @param {string} content - File content
   * @returns {Object} Parsed dependencies
   */
  parsePackageJson(content) {
    try {
      const pkg = JSON.parse(content);
      return {
        dependencies: pkg.dependencies || {},
        devDependencies: pkg.devDependencies || {},
        peerDependencies: pkg.peerDependencies || {},
        optionalDependencies: pkg.optionalDependencies || {}
      };
    } catch {
      return { dependencies: {}, devDependencies: {} };
    }
  }

  /**
   * Parse requirements.txt content
   * @param {string} content - File content
   * @returns {Object} Parsed dependencies
   */
  parseRequirementsTxt(content) {
    const deps = {};
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)(?:[=<>!]+(.+))?/);
        if (match) {
          deps[match[1].toLowerCase()] = match[2] || '*';
        }
      }
    }

    return { dependencies: deps };
  }

  /**
   * Parse go.mod content
   * @param {string} content - File content
   * @returns {Object} Parsed dependencies
   */
  parseGoMod(content) {
    const deps = {};
    const lines = content.split('\n');

    let inRequire = false;

    for (const line of lines) {
      if (line.includes('require (')) {
        inRequire = true;
        continue;
      }

      if (line.includes(')')) {
        inRequire = false;
        continue;
      }

      if (inRequire || line.startsWith('require ')) {
        const match = line.trim().match(/^(\S+)\s+v?([^\s]+)/);
        if (match) {
          deps[match[1]] = match[2];
        }
      }
    }

    return { dependencies: deps };
  }

  /**
   * Parse Cargo.toml content
   * @param {string} content - File content
   * @returns {Object} Parsed dependencies
   */
  parseCargoToml(content) {
    const deps = {};
    const lines = content.split('\n');
    let inDependencies = false;

    for (const line of lines) {
      if (line.match(/\[.*dependencies.*\]/i)) {
        inDependencies = true;
        continue;
      }

      if (line.match(/^\[/) && !line.match(/dependencies/i)) {
        inDependencies = false;
        continue;
      }

      if (inDependencies) {
        const match = line.trim().match(/^([a-zA-Z0-9_-]+)\s*=\s*"?([^"]+)"?/);
        if (match) {
          deps[match[1]] = match[2];
        }
      }
    }

    return { dependencies: deps };
  }

  /**
   * Check if change object has any changes
   * @param {Object} change - Change object
   * @returns {boolean}
   */
  hasChanges(change) {
    return (
      change.changes.added.length > 0 ||
      change.changes.removed.length > 0 ||
      change.changes.updated.length > 0
    );
  }

  /**
   * Calculate change significance
   * @param {Object} changes - Changes object
   * @returns {string} Significance level
   */
  calculateSignificance(changes) {
    // Check for major changes
    const majorDeps = [...(changes.added || []), ...(changes.removed || [])].filter(dep => {
      const name = dep.split('@')[0];
      return this.isMajorDependency(name);
    });

    if (majorDeps.length > 0) {
      return 'major';
    }

    // Check for major version updates
    const majorUpdates = (changes.updated || []).filter(update => {
      const fromMajor = parseInt(update.from?.split('.')[0] || '0', 10);
      const toMajor = parseInt(update.to?.split('.')[0] || '0', 10);
      return toMajor > fromMajor;
    });

    if (majorUpdates.length > 0) {
      return 'major';
    }

    // Minor updates or additions
    if ((changes.updated || []).length > 0 || (changes.added || []).length > 0) {
      return 'minor';
    }

    return 'patch';
  }

  /**
   * Check if a dependency is major (framework-level)
   * @param {string} name - Dependency name
   * @returns {boolean}
   */
  isMajorDependency(name) {
    const lowerName = name.toLowerCase();

    // Check all framework-level categories
    const majorCategories = ['framework', 'state-management', 'database', 'build-tool', 'type-system'];

    for (const category of majorCategories) {
      if (this.categoryMappings[category]?.has(lowerName)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine primary category for changes
   * @param {Object} changes - Changes object
   * @returns {string|null} Primary category
   */
  determinePrimaryCategory(changes) {
    const allDeps = [
      ...(changes.added || []).map(d => d.split('@')[0]),
      ...(changes.removed || []).map(d => d.split('@')[0]),
      ...(changes.updated || []).map(d => d.name)
    ];

    const categoryCounts = {};

    for (const dep of allDeps) {
      const category = this.categorizeDependency(dep);
      categoryCounts[category] = (categoryCounts[category] || 0) + 1;
    }

    const sorted = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0] : null;
  }

  /**
   * Categorize a single dependency
   * @param {string} name - Dependency name
   * @returns {string} Category
   */
  categorizeDependency(name) {
    const lowerName = name.toLowerCase();

    for (const [category, deps] of Object.entries(this.categoryMappings)) {
      if (deps.has(lowerName)) {
        return category;
      }
    }

    return 'other';
  }

  /**
   * Detect technology decisions from changes
   * @param {Object} change - Change object
   * @returns {Array} Detected decisions
   */
  detectTechDecisions(change) {
    const decisions = [];

    // Framework adoption
    for (const added of (change.changes.added || [])) {
      const name = added.split('@')[0];
      if (this.categoryMappings.framework?.has(name.toLowerCase())) {
        decisions.push({
          type: 'technology-adoption',
          title: `Adopted ${name}`,
          commit: change.commit,
          confidence: 0.85,
          details: {
            dependency: added,
            category: 'framework'
          }
        });
      }
    }

    // Technology replacement (same category, one removed, one added)
    if (change.changes.removed.length > 0 && change.changes.added.length > 0) {
      for (const removed of change.changes.removed) {
        const removedName = removed.split('@')[0].toLowerCase();
        const removedCategory = this.categorizeDependency(removedName);

        for (const added of change.changes.added) {
          const addedName = added.split('@')[0].toLowerCase();
          const addedCategory = this.categorizeDependency(addedName);

          if (removedCategory === addedCategory && removedCategory !== 'other') {
            decisions.push({
              type: 'technology-replacement',
              title: `Replaced ${removedName} with ${addedName}`,
              commit: change.commit,
              confidence: 0.9,
              details: {
                removed: removed,
                added: added,
                category: addedCategory
              }
            });
          }
        }
      }
    }

    return decisions;
  }

  /**
   * Build dependency change timeline
   * @param {Array} changes - All changes
   * @returns {Array} Timeline entries
   */
  buildDependencyTimeline(changes) {
    return changes
      .sort((a, b) => new Date(a.commit.date) - new Date(b.commit.date))
      .map(change => ({
        date: change.commit.date,
        commit: change.commit.shortHash,
        significance: change.significance,
        category: change.category,
        summary: this.generateChangeSummary(change)
      }));
  }

  /**
   * Generate a summary for a change
   * @param {Object} change - Change object
   * @returns {string} Summary
   */
  generateChangeSummary(change) {
    const parts = [];

    if (change.changes.added.length > 0) {
      parts.push(`+${change.changes.added.length} deps`);
    }

    if (change.changes.removed.length > 0) {
      parts.push(`-${change.changes.removed.length} deps`);
    }

    if (change.changes.updated.length > 0) {
      parts.push(`↑${change.changes.updated.length} updated`);
    }

    return parts.join(', ') || 'No changes';
  }

  /**
   * Categorize all changes by category
   * @param {Array} changes - All changes
   * @returns {Object} Changes by category
   */
  categorizeChanges(changes) {
    const byCategory = {};

    for (const change of changes) {
      const allDeps = [
        ...(change.changes.added || []).map(d => d.split('@')[0]),
        ...(change.changes.removed || []).map(d => d.split('@')[0]),
        ...(change.changes.updated || []).map(d => d.name)
      ];

      for (const dep of allDeps) {
        const category = this.categorizeDependency(dep);
        byCategory[category] = (byCategory[category] || 0) + 1;
      }
    }

    return byCategory;
  }

  /**
   * Save dependency history to file
   * @param {Object} analysis - Analysis result
   * @returns {string} File path
   */
  saveHistory(analysis) {
    const historyPath = path.join(
      this.config.maestroDir,
      this.config.hydrationDir,
      'dependency-history.json'
    );

    const dir = path.dirname(historyPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(historyPath, JSON.stringify(analysis, null, 2), 'utf8');

    return historyPath;
  }
}

module.exports = DependencyAnalyzer;
