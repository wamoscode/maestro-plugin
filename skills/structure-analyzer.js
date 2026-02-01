/**
 * Structure Analyzer Skill
 *
 * Analyzes directory structure changes in git history to detect:
 * - New architectural patterns (services, adapters, domain directories)
 * - Module structure evolution
 * - Code organization changes
 * - Architecture pattern recognition
 *
 * Provides insights for ADR detection and feature documentation.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class StructureAnalyzer {
  constructor(config = {}) {
    this.config = {
      repoPath: config.repoPath || process.cwd(),
      maestroDir: config.maestroDir || 'maestro',
      ...config
    };

    // Architecture pattern definitions
    this.architecturePatterns = {
      // Clean/Hexagonal Architecture
      'hexagonal': {
        directories: ['adapters', 'ports', 'domain', 'application', 'infrastructure'],
        minMatches: 3,
        confidence: 0.85,
        description: 'Hexagonal/Ports and Adapters architecture'
      },
      // Domain-Driven Design
      'ddd': {
        directories: ['domain', 'aggregates', 'entities', 'value-objects', 'repositories', 'services'],
        minMatches: 3,
        confidence: 0.8,
        description: 'Domain-Driven Design structure'
      },
      // MVC Pattern
      'mvc': {
        directories: ['models', 'views', 'controllers'],
        minMatches: 2,
        confidence: 0.75,
        description: 'Model-View-Controller pattern'
      },
      // Feature-based/Module-based
      'feature-based': {
        directories: ['features', 'modules', 'packages'],
        minMatches: 1,
        confidence: 0.7,
        description: 'Feature-based modular structure'
      },
      // Layered Architecture
      'layered': {
        directories: ['presentation', 'business', 'data', 'api'],
        minMatches: 2,
        confidence: 0.75,
        description: 'Layered architecture pattern'
      },
      // Microservices structure
      'microservices': {
        directories: ['services', 'api-gateway', 'shared', 'libs'],
        minMatches: 2,
        confidence: 0.8,
        description: 'Microservices architecture'
      },
      // Monorepo structure
      'monorepo': {
        directories: ['packages', 'apps', 'libs', 'tools'],
        minMatches: 2,
        confidence: 0.8,
        description: 'Monorepo structure'
      }
    };

    // Significant directory patterns that suggest architectural decisions
    this.significantPatterns = [
      // Core architecture directories
      { pattern: /^src\/services?\//i, type: 'service', significance: 0.8 },
      { pattern: /^src\/adapters?\//i, type: 'adapter', significance: 0.85 },
      { pattern: /^src\/infrastructure\//i, type: 'infrastructure', significance: 0.85 },
      { pattern: /^src\/domain\//i, type: 'domain', significance: 0.85 },
      { pattern: /^src\/ports?\//i, type: 'port', significance: 0.85 },
      { pattern: /^src\/application\//i, type: 'application', significance: 0.8 },

      // Common patterns
      { pattern: /^src\/components?\//i, type: 'component', significance: 0.6 },
      { pattern: /^src\/hooks?\//i, type: 'hook', significance: 0.6 },
      { pattern: /^src\/utils?\//i, type: 'utility', significance: 0.5 },
      { pattern: /^src\/lib\//i, type: 'library', significance: 0.6 },
      { pattern: /^src\/api\//i, type: 'api', significance: 0.7 },
      { pattern: /^src\/store\//i, type: 'state', significance: 0.7 },

      // Module patterns
      { pattern: /^packages?\//i, type: 'package', significance: 0.8 },
      { pattern: /^modules?\//i, type: 'module', significance: 0.75 },
      { pattern: /^features?\//i, type: 'feature', significance: 0.75 },

      // Infrastructure
      { pattern: /^\.github\/workflows?\//i, type: 'ci-cd', significance: 0.7 },
      { pattern: /^docker\//i, type: 'containerization', significance: 0.7 },
      { pattern: /^k8s\//i, type: 'kubernetes', significance: 0.8 },
      { pattern: /^kubernetes\//i, type: 'kubernetes', significance: 0.8 },
      { pattern: /^terraform\//i, type: 'infrastructure-as-code', significance: 0.8 },

      // Testing
      { pattern: /^tests?\//i, type: 'test', significance: 0.5 },
      { pattern: /^__tests__\//i, type: 'test', significance: 0.5 },
      { pattern: /^e2e\//i, type: 'e2e-test', significance: 0.6 },
      { pattern: /^cypress\//i, type: 'e2e-test', significance: 0.6 },

      // Documentation
      { pattern: /^docs?\//i, type: 'documentation', significance: 0.4 },

      // Scripts
      { pattern: /^scripts?\//i, type: 'script', significance: 0.4 }
    ];
  }

  /**
   * Analyze structure changes from commits
   * @param {Array} commits - Parsed commits
   * @param {Object} options - Analysis options
   * @returns {Object} Structure analysis result
   */
  analyzeFromCommits(commits, options = {}) {
    const result = {
      directoryChanges: [],
      detectedPatterns: [],
      architectureEvolution: [],
      significantChanges: [],
      statistics: {
        newDirectories: 0,
        modifiedDirectories: 0,
        byType: {}
      }
    };

    // Track directory first appearances
    const directoryFirstSeen = new Map();
    const allDirectories = new Set();

    for (const commit of commits) {
      const newDirs = this.findNewDirectories(commit, allDirectories);

      for (const dir of newDirs) {
        directoryFirstSeen.set(dir.path, {
          commit,
          ...dir
        });
        allDirectories.add(dir.path);
      }
    }

    // Analyze each new directory
    for (const [dirPath, info] of directoryFirstSeen) {
      const change = this.analyzeDirectoryChange(dirPath, info);

      if (change.significance >= 0.5) {
        result.directoryChanges.push(change);
        result.significantChanges.push(change);
        result.statistics.newDirectories++;

        // Track by type
        const type = change.type || 'other';
        result.statistics.byType[type] = (result.statistics.byType[type] || 0) + 1;
      }
    }

    // Detect architecture patterns in current structure
    result.detectedPatterns = this.detectArchitecturePatterns();

    // Track architecture evolution over time
    result.architectureEvolution = this.analyzeArchitectureEvolution(
      result.directoryChanges
    );

    return result;
  }

  /**
   * Find new directories introduced in a commit
   * @param {Object} commit - Parsed commit
   * @param {Set} existingDirs - Already known directories
   * @returns {Array} New directories
   */
  findNewDirectories(commit, existingDirs) {
    const newDirs = [];
    const seenInCommit = new Set();

    for (const filePath of (commit.filesChanged || [])) {
      // Extract directory components
      const parts = filePath.split('/');

      for (let i = 1; i < parts.length; i++) {
        const dirPath = parts.slice(0, i).join('/');

        if (!existingDirs.has(dirPath) && !seenInCommit.has(dirPath)) {
          seenInCommit.add(dirPath);

          // Check if this is a significant directory
          const significance = this.assessDirectorySignificance(dirPath);

          if (significance > 0) {
            newDirs.push({
              path: dirPath,
              depth: i,
              significance,
              parentDir: i > 1 ? parts.slice(0, i - 1).join('/') : null
            });
          }
        }
      }
    }

    return newDirs;
  }

  /**
   * Assess the significance of a directory
   * @param {string} dirPath - Directory path
   * @returns {number} Significance score (0-1)
   */
  assessDirectorySignificance(dirPath) {
    let maxSignificance = 0;

    for (const { pattern, significance } of this.significantPatterns) {
      if (pattern.test(dirPath)) {
        maxSignificance = Math.max(maxSignificance, significance);
      }
    }

    // Boost for first-level directories under src
    if (dirPath.match(/^src\/[^/]+$/)) {
      maxSignificance = Math.max(maxSignificance, 0.6);
    }

    // Boost for architecture-related names
    const baseName = path.basename(dirPath).toLowerCase();
    const archNames = [
      'domain', 'entities', 'aggregates', 'repositories',
      'services', 'ports', 'adapters', 'infrastructure',
      'application', 'presentation', 'business', 'data'
    ];

    if (archNames.includes(baseName)) {
      maxSignificance = Math.max(maxSignificance, 0.7);
    }

    return maxSignificance;
  }

  /**
   * Analyze a directory change in detail
   * @param {string} dirPath - Directory path
   * @param {Object} info - Change info
   * @returns {Object} Analyzed change
   */
  analyzeDirectoryChange(dirPath, info) {
    const baseName = path.basename(dirPath).toLowerCase();

    // Determine type
    let type = 'other';
    for (const { pattern, type: patternType } of this.significantPatterns) {
      if (pattern.test(dirPath)) {
        type = patternType;
        break;
      }
    }

    // Check for architecture pattern match
    let architecturePattern = null;
    for (const [patternName, patternDef] of Object.entries(this.architecturePatterns)) {
      if (patternDef.directories.includes(baseName)) {
        architecturePattern = {
          name: patternName,
          description: patternDef.description
        };
        break;
      }
    }

    return {
      path: dirPath,
      type,
      significance: info.significance,
      commit: {
        hash: info.commit.hash,
        shortHash: info.commit.shortHash,
        date: info.commit.date,
        subject: info.commit.subject,
        author: info.commit.author?.name
      },
      architecturePattern,
      depth: info.depth,
      parentDir: info.parentDir,
      metadata: {
        baseName,
        introducedAt: info.commit.date
      }
    };
  }

  /**
   * Detect architecture patterns in current codebase
   * @returns {Array} Detected patterns
   */
  detectArchitecturePatterns() {
    const patterns = [];
    const currentDirs = this.getCurrentDirectoryStructure();

    for (const [patternName, patternDef] of Object.entries(this.architecturePatterns)) {
      const matches = patternDef.directories.filter(dir =>
        currentDirs.some(d => d.toLowerCase().includes(dir.toLowerCase()))
      );

      if (matches.length >= patternDef.minMatches) {
        patterns.push({
          name: patternName,
          description: patternDef.description,
          confidence: patternDef.confidence * (matches.length / patternDef.directories.length),
          matchedDirectories: matches,
          totalPossible: patternDef.directories.length
        });
      }
    }

    // Sort by confidence
    patterns.sort((a, b) => b.confidence - a.confidence);

    return patterns;
  }

  /**
   * Get current directory structure
   * @returns {Array} Directory paths
   */
  getCurrentDirectoryStructure() {
    try {
      const output = execSync(
        'find . -type d -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/dist/*" -not -path "*/build/*" 2>/dev/null | head -500',
        {
          cwd: this.config.repoPath,
          encoding: 'utf8'
        }
      );

      return output
        .split('\n')
        .filter(d => d.trim())
        .map(d => d.replace(/^\.\//, ''));
    } catch (error) {
      return [];
    }
  }

  /**
   * Analyze architecture evolution over time
   * @param {Array} directoryChanges - Ordered directory changes
   * @returns {Array} Evolution timeline
   */
  analyzeArchitectureEvolution(directoryChanges) {
    const evolution = [];

    // Sort by date
    const sorted = [...directoryChanges]
      .filter(c => c.commit?.date)
      .sort((a, b) => new Date(a.commit.date) - new Date(b.commit.date));

    // Track cumulative patterns
    const cumulativeDirs = new Set();

    for (const change of sorted) {
      cumulativeDirs.add(change.path);

      // Check which patterns are now present
      const presentPatterns = [];
      for (const [patternName, patternDef] of Object.entries(this.architecturePatterns)) {
        const matches = patternDef.directories.filter(dir =>
          Array.from(cumulativeDirs).some(d =>
            path.basename(d).toLowerCase() === dir.toLowerCase()
          )
        );

        if (matches.length > 0) {
          presentPatterns.push({
            pattern: patternName,
            matches: matches.length,
            required: patternDef.minMatches,
            complete: matches.length >= patternDef.minMatches
          });
        }
      }

      if (change.architecturePattern || presentPatterns.length > 0) {
        evolution.push({
          date: change.commit.date,
          commit: change.commit.shortHash,
          directory: change.path,
          type: change.type,
          architecturePatterns: presentPatterns.filter(p => p.complete),
          emergingPatterns: presentPatterns.filter(p => !p.complete && p.matches > 0)
        });
      }
    }

    return evolution;
  }

  /**
   * Analyze module structure for a specific directory
   * @param {string} rootDir - Root directory to analyze
   * @returns {Object} Module structure analysis
   */
  analyzeModuleStructure(rootDir) {
    const result = {
      root: rootDir,
      modules: [],
      depth: 0,
      pattern: null
    };

    try {
      const fullPath = path.join(this.config.repoPath, rootDir);

      if (!fs.existsSync(fullPath)) {
        return result;
      }

      const entries = fs.readdirSync(fullPath, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory());

      result.modules = dirs.map(d => ({
        name: d.name,
        path: path.join(rootDir, d.name),
        hasIndex: this.hasIndexFile(path.join(fullPath, d.name)),
        hasTests: this.hasTestFiles(path.join(fullPath, d.name))
      }));

      result.depth = this.calculateMaxDepth(fullPath);

      // Detect pattern
      if (dirs.some(d => ['services', 'adapters', 'ports'].includes(d.name.toLowerCase()))) {
        result.pattern = 'hexagonal';
      } else if (dirs.some(d => ['models', 'views', 'controllers'].includes(d.name.toLowerCase()))) {
        result.pattern = 'mvc';
      } else if (dirs.some(d => ['domain', 'entities', 'repositories'].includes(d.name.toLowerCase()))) {
        result.pattern = 'ddd';
      }

    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Check if directory has an index file
   * @param {string} dirPath - Directory path
   * @returns {boolean}
   */
  hasIndexFile(dirPath) {
    const indexFiles = ['index.ts', 'index.js', 'index.tsx', 'index.jsx', '__init__.py', 'mod.rs'];

    for (const indexFile of indexFiles) {
      if (fs.existsSync(path.join(dirPath, indexFile))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if directory has test files
   * @param {string} dirPath - Directory path
   * @returns {boolean}
   */
  hasTestFiles(dirPath) {
    try {
      const entries = fs.readdirSync(dirPath);
      return entries.some(e =>
        e.includes('.test.') ||
        e.includes('.spec.') ||
        e.includes('_test.') ||
        e === '__tests__'
      );
    } catch {
      return false;
    }
  }

  /**
   * Calculate maximum directory depth
   * @param {string} dirPath - Directory path
   * @param {number} currentDepth - Current depth
   * @returns {number}
   */
  calculateMaxDepth(dirPath, currentDepth = 0) {
    if (currentDepth > 10) return currentDepth; // Prevent infinite recursion

    try {
      const entries = fs.readdirSync(dirPath, { withFileTypes: true });
      const dirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('.'));

      if (dirs.length === 0) {
        return currentDepth;
      }

      let maxDepth = currentDepth;
      for (const dir of dirs) {
        const subDepth = this.calculateMaxDepth(
          path.join(dirPath, dir.name),
          currentDepth + 1
        );
        maxDepth = Math.max(maxDepth, subDepth);
      }

      return maxDepth;
    } catch {
      return currentDepth;
    }
  }

  /**
   * Generate structure summary for documentation
   * @param {Object} analysis - Analysis result
   * @returns {string} Markdown summary
   */
  generateStructureSummary(analysis) {
    const lines = [];

    lines.push('## Directory Structure Analysis');
    lines.push('');

    // Detected architecture patterns
    if (analysis.detectedPatterns.length > 0) {
      lines.push('### Detected Architecture Patterns');
      lines.push('');

      for (const pattern of analysis.detectedPatterns) {
        const confidence = Math.round(pattern.confidence * 100);
        lines.push(`- **${pattern.description}** (${confidence}% confidence)`);
        lines.push(`  - Matched: ${pattern.matchedDirectories.join(', ')}`);
      }
      lines.push('');
    }

    // Significant directory additions
    if (analysis.significantChanges.length > 0) {
      lines.push('### Significant Structure Changes');
      lines.push('');
      lines.push('| Directory | Type | Commit | Date |');
      lines.push('|-----------|------|--------|------|');

      for (const change of analysis.significantChanges.slice(0, 20)) {
        lines.push(`| \`${change.path}\` | ${change.type} | ${change.commit.shortHash} | ${change.commit.date?.split('T')[0]} |`);
      }
      lines.push('');
    }

    // Statistics
    lines.push('### Statistics');
    lines.push('');
    lines.push(`- New directories: ${analysis.statistics.newDirectories}`);

    if (Object.keys(analysis.statistics.byType).length > 0) {
      lines.push('- By type:');
      for (const [type, count] of Object.entries(analysis.statistics.byType)) {
        lines.push(`  - ${type}: ${count}`);
      }
    }

    return lines.join('\n');
  }
}

module.exports = StructureAnalyzer;
