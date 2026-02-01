/**
 * ADR (Architecture Decision Record) Detector Skill
 *
 * Detects architectural decisions from git commits and generates
 * structured ADR documents. Uses pattern matching and confidence
 * scoring to identify decision-worthy changes.
 *
 * Detection signals:
 * - Breaking changes (feat!, BREAKING CHANGE)
 * - Technology adoption patterns ("chose X over Y", "adopted X")
 * - Major dependency changes
 * - Architecture keywords (migrate, switch, adopt, replace)
 * - New directory structure changes
 * - Configuration file additions
 *
 * Output: maestro/decisions/ADR-*.md
 */

const fs = require('fs');
const path = require('path');

class ADRDetector {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      decisionsDir: config.decisionsDir || 'decisions',
      minConfidence: config.minConfidence || 0.6,
      maxADRsPerRun: config.maxADRsPerRun || 50,
      ...config
    };

    // Decision detection patterns with confidence scores
    this.decisionPatterns = [
      // Explicit decision language
      { regex: /chose?\s+(\w+)\s+over\s+(\w+)/i, confidence: 0.85, type: 'choice' },
      { regex: /switch(?:ed|ing)?\s+(?:to|from)\s+(\w+)/i, confidence: 0.8, type: 'migration' },
      { regex: /adopt(?:ed|ing)?\s+(\w+)/i, confidence: 0.8, type: 'adoption' },
      { regex: /replac(?:e|ed|ing)?\s+(\w+)\s+with\s+(\w+)/i, confidence: 0.85, type: 'replacement' },
      { regex: /migrat(?:e|ed|ing)?\s+(?:to|from)\s+(\w+)/i, confidence: 0.8, type: 'migration' },
      { regex: /prefer\s+(\w+)/i, confidence: 0.7, type: 'preference' },
      { regex: /use\s+(\w+)\s+instead\s+of\s+(\w+)/i, confidence: 0.8, type: 'replacement' },
      { regex: /introduc(?:e|ed|ing)?\s+(\w+)/i, confidence: 0.7, type: 'introduction' },
      { regex: /deprecat(?:e|ed|ing)?\s+(\w+)/i, confidence: 0.75, type: 'deprecation' },
      { regex: /remov(?:e|ed|ing)?\s+(?:support\s+for\s+)?(\w+)/i, confidence: 0.7, type: 'removal' },
      { regex: /upgrade\s+to\s+(\w+)/i, confidence: 0.7, type: 'upgrade' },

      // Architecture keywords
      { regex: /\b(monorepo|microservice|monolith|serverless|event.?driven)\b/i, confidence: 0.75, type: 'architecture' },
      { regex: /\b(api.?first|schema.?first|code.?first)\b/i, confidence: 0.75, type: 'approach' },
      { regex: /\b(rest|graphql|grpc|websocket)\b.*\bapi\b/i, confidence: 0.7, type: 'api-style' },
      { regex: /\b(sql|nosql|postgresql|mongodb|redis|elasticsearch)\b/i, confidence: 0.65, type: 'database' },

      // Design patterns
      { regex: /implement(?:ed|ing)?\s+(factory|singleton|observer|strategy|adapter)\s+pattern/i, confidence: 0.75, type: 'pattern' },
      { regex: /\b(cqrs|event.?sourcing|ddd|hexagonal)\b/i, confidence: 0.8, type: 'architecture-pattern' }
    ];

    // Breaking change indicators
    this.breakingIndicators = [
      /\bBREAKING\s*CHANGE\b/i,
      /\bBREAKING:\b/i,
      /^.*!:/,
      /\bremove\s+(?:deprecated|legacy)\b/i,
      /\bmigration\s+required\b/i
    ];

    // Architecture file patterns
    this.archFilePatterns = [
      /^\.?eslint/i,
      /^\.?prettier/i,
      /^tsconfig\.json$/i,
      /^webpack\.config/i,
      /^vite\.config/i,
      /^docker/i,
      /^k8s\//i,
      /^kubernetes\//i,
      /^\.github\/workflows/i,
      /^Makefile$/i,
      /^\.env\.example$/i
    ];

    // New directory patterns that suggest architecture decisions
    this.archDirectoryPatterns = [
      /^src\/services\//,
      /^src\/adapters\//,
      /^src\/infrastructure\//,
      /^src\/domain\//,
      /^src\/ports\//,
      /^lib\//,
      /^packages\//,
      /^modules\//,
      /^api\//
    ];
  }

  /**
   * Get the decisions directory path
   * @returns {string} Path
   */
  getDecisionsPath() {
    return path.join(this.config.maestroDir, this.config.decisionsDir);
  }

  /**
   * Ensure decisions directory exists
   */
  ensureDirectory() {
    const decisionsPath = this.getDecisionsPath();
    if (!fs.existsSync(decisionsPath)) {
      fs.mkdirSync(decisionsPath, { recursive: true });
    }
  }

  /**
   * Detect ADRs from commits
   * @param {Array} commits - Parsed commits
   * @param {Object} options - Detection options
   * @returns {Object} Detection result
   */
  detectADRs(commits, options = {}) {
    const {
      dependencyChanges = null,
      structureChanges = null
    } = options;

    const candidates = [];

    // Analyze each commit for ADR signals
    for (const commit of commits) {
      const signals = this.analyzeCommitForDecisions(commit);

      if (signals.totalConfidence >= this.config.minConfidence) {
        candidates.push({
          commit,
          signals,
          confidence: signals.totalConfidence,
          type: signals.primaryType
        });
      }
    }

    // Add dependency change ADRs if provided
    if (dependencyChanges) {
      const depADRs = this.detectDependencyADRs(dependencyChanges);
      candidates.push(...depADRs);
    }

    // Add structure change ADRs if provided
    if (structureChanges) {
      const structADRs = this.detectStructureADRs(structureChanges);
      candidates.push(...structADRs);
    }

    // Sort by confidence and limit
    candidates.sort((a, b) => b.confidence - a.confidence);
    const topCandidates = candidates.slice(0, this.config.maxADRsPerRun);

    // Deduplicate similar decisions
    const uniqueADRs = this.deduplicateADRs(topCandidates);

    return {
      detected: uniqueADRs.length,
      candidates: uniqueADRs,
      filtered: candidates.length - uniqueADRs.length,
      statistics: {
        totalAnalyzed: commits.length,
        byType: this.countByType(uniqueADRs)
      }
    };
  }

  /**
   * Analyze a commit for decision signals
   * @param {Object} commit - Parsed commit
   * @returns {Object} Analysis result with signals and confidence
   */
  analyzeCommitForDecisions(commit) {
    const signals = {
      patterns: [],
      isBreaking: false,
      hasArchFiles: false,
      hasNewDirectories: false,
      primaryType: null,
      totalConfidence: 0
    };

    const fullText = `${commit.subject} ${commit.body || ''}`;

    // Check for breaking changes
    if (commit.isBreaking) {
      signals.isBreaking = true;
      signals.totalConfidence += 0.9;
      signals.primaryType = 'breaking-change';
    } else {
      for (const pattern of this.breakingIndicators) {
        if (pattern.test(fullText)) {
          signals.isBreaking = true;
          signals.totalConfidence += 0.85;
          signals.primaryType = 'breaking-change';
          break;
        }
      }
    }

    // Check for decision patterns
    for (const patternDef of this.decisionPatterns) {
      const match = fullText.match(patternDef.regex);
      if (match) {
        signals.patterns.push({
          type: patternDef.type,
          match: match[0],
          groups: match.slice(1),
          confidence: patternDef.confidence
        });

        signals.totalConfidence = Math.max(signals.totalConfidence, patternDef.confidence);

        if (!signals.primaryType) {
          signals.primaryType = patternDef.type;
        }
      }
    }

    // Check for architecture file changes
    if (commit.filesChanged) {
      for (const file of commit.filesChanged) {
        // Check architecture files
        for (const pattern of this.archFilePatterns) {
          if (pattern.test(file)) {
            signals.hasArchFiles = true;
            signals.totalConfidence = Math.max(signals.totalConfidence, 0.65);
            break;
          }
        }

        // Check new directories
        for (const pattern of this.archDirectoryPatterns) {
          if (pattern.test(file)) {
            signals.hasNewDirectories = true;
            signals.totalConfidence = Math.max(signals.totalConfidence, 0.7);
            break;
          }
        }
      }
    }

    // Boost for commits with explicit decisions detected earlier
    if (commit.decisions && commit.decisions.length > 0) {
      signals.totalConfidence = Math.max(signals.totalConfidence, 0.75);
    }

    // Cap at 1.0
    signals.totalConfidence = Math.min(1.0, signals.totalConfidence);

    return signals;
  }

  /**
   * Detect ADRs from dependency changes
   * @param {Array} changes - Dependency changes from DependencyAnalyzer
   * @returns {Array} ADR candidates
   */
  detectDependencyADRs(changes) {
    const candidates = [];

    for (const change of changes) {
      // Major additions
      if (change.significance === 'major' && change.changes.added.length > 0) {
        const majorAdditions = change.changes.added.filter(dep =>
          this.isMajorDependency(dep.split('@')[0])
        );

        for (const dep of majorAdditions) {
          const depName = dep.split('@')[0];
          candidates.push({
            commit: change.commit,
            signals: {
              patterns: [{
                type: 'adoption',
                match: `Added ${depName}`,
                confidence: 0.8
              }],
              totalConfidence: 0.8,
              primaryType: 'dependency-adoption'
            },
            confidence: 0.8,
            type: 'dependency-adoption',
            dependency: depName,
            metadata: {
              category: change.category,
              version: dep.split('@')[1]
            }
          });
        }
      }

      // Replacements (removed + added in same category)
      if (change.changes.removed.length > 0 && change.changes.added.length > 0) {
        const removedNames = change.changes.removed.map(d => d.split('@')[0]);
        const addedNames = change.changes.added.map(d => d.split('@')[0]);

        // Simple heuristic: if removed and added similar-category deps
        candidates.push({
          commit: change.commit,
          signals: {
            patterns: [{
              type: 'replacement',
              match: `Replaced ${removedNames.join(', ')} with ${addedNames.join(', ')}`,
              confidence: 0.85
            }],
            totalConfidence: 0.85,
            primaryType: 'technology-replacement'
          },
          confidence: 0.85,
          type: 'technology-replacement',
          metadata: {
            removed: removedNames,
            added: addedNames
          }
        });
      }

      // Major version updates
      if (change.changes.updated) {
        const majorUpdates = change.changes.updated.filter(u => {
          const fromMajor = parseInt(u.from?.split('.')[0] || '0', 10);
          const toMajor = parseInt(u.to?.split('.')[0] || '0', 10);
          return toMajor > fromMajor;
        });

        for (const update of majorUpdates) {
          if (this.isMajorDependency(update.name)) {
            candidates.push({
              commit: change.commit,
              signals: {
                patterns: [{
                  type: 'upgrade',
                  match: `Upgraded ${update.name} from ${update.from} to ${update.to}`,
                  confidence: 0.7
                }],
                totalConfidence: 0.7,
                primaryType: 'major-upgrade'
              },
              confidence: 0.7,
              type: 'major-upgrade',
              dependency: update.name,
              metadata: {
                from: update.from,
                to: update.to
              }
            });
          }
        }
      }
    }

    return candidates;
  }

  /**
   * Detect ADRs from structure changes
   * @param {Array} changes - Structure changes from StructureAnalyzer
   * @returns {Array} ADR candidates
   */
  detectStructureADRs(changes) {
    const candidates = [];

    for (const change of changes) {
      if (change.type === 'new-directory' && change.significance >= 0.7) {
        candidates.push({
          commit: change.commit,
          signals: {
            patterns: [{
              type: 'architecture',
              match: `Introduced ${change.directory} structure`,
              confidence: change.significance
            }],
            hasNewDirectories: true,
            totalConfidence: change.significance,
            primaryType: 'architecture-change'
          },
          confidence: change.significance,
          type: 'architecture-change',
          metadata: {
            directory: change.directory,
            pattern: change.pattern
          }
        });
      }
    }

    return candidates;
  }

  /**
   * Check if a dependency is considered "major" (worth an ADR)
   * @param {string} name - Dependency name
   * @returns {boolean}
   */
  isMajorDependency(name) {
    const majorDeps = new Set([
      // Frameworks
      'react', 'vue', 'angular', 'svelte', 'next', 'nuxt', 'gatsby',
      'express', 'fastify', 'koa', 'nest', 'django', 'flask', 'rails',
      // State management
      'redux', 'mobx', 'zustand', 'recoil', 'jotai', 'valtio',
      '@tanstack/react-query', 'swr', 'apollo-client',
      // Databases
      'prisma', 'typeorm', 'sequelize', 'mongoose', 'knex',
      // Build tools
      'webpack', 'vite', 'esbuild', 'rollup', 'parcel',
      // Type systems
      'typescript', 'flow-bin',
      // Testing
      'jest', 'vitest', 'mocha', 'cypress', 'playwright',
      // Styling
      'tailwindcss', 'styled-components', 'emotion', 'sass',
      // API
      'graphql', 'trpc', 'axios', 'ky',
      // Auth
      'passport', 'auth0', 'next-auth',
      // Other major libs
      'lodash', 'ramda', 'date-fns', 'moment', 'luxon'
    ]);

    return majorDeps.has(name.toLowerCase());
  }

  /**
   * Deduplicate similar ADR candidates
   * @param {Array} candidates - ADR candidates
   * @returns {Array} Deduplicated candidates
   */
  deduplicateADRs(candidates) {
    const seen = new Map();

    for (const candidate of candidates) {
      const key = this.generateDedupeKey(candidate);

      if (!seen.has(key)) {
        seen.set(key, candidate);
      } else {
        // Keep the higher confidence one
        const existing = seen.get(key);
        if (candidate.confidence > existing.confidence) {
          seen.set(key, candidate);
        }
      }
    }

    return Array.from(seen.values());
  }

  /**
   * Generate deduplication key for a candidate
   * @param {Object} candidate - ADR candidate
   * @returns {string} Deduplication key
   */
  generateDedupeKey(candidate) {
    const parts = [candidate.type];

    if (candidate.dependency) {
      parts.push(candidate.dependency);
    }

    if (candidate.metadata?.removed) {
      parts.push(`removed:${candidate.metadata.removed.join(',')}`);
    }

    if (candidate.metadata?.added) {
      parts.push(`added:${candidate.metadata.added.join(',')}`);
    }

    if (candidate.metadata?.directory) {
      parts.push(`dir:${candidate.metadata.directory}`);
    }

    // Use first pattern match for uniqueness
    if (candidate.signals?.patterns?.length > 0) {
      parts.push(candidate.signals.patterns[0].match.toLowerCase().substring(0, 50));
    }

    return parts.join(':');
  }

  /**
   * Count ADRs by type
   * @param {Array} candidates - ADR candidates
   * @returns {Object} Counts by type
   */
  countByType(candidates) {
    const counts = {};
    for (const candidate of candidates) {
      const type = candidate.type || 'unknown';
      counts[type] = (counts[type] || 0) + 1;
    }
    return counts;
  }

  /**
   * Generate ADR documents
   * @param {Object} detectionResult - Result from detectADRs
   * @param {Object} options - Generation options
   * @returns {Object} Generation result
   */
  generateADRs(detectionResult, options = {}) {
    this.ensureDirectory();

    const result = {
      success: true,
      adrsGenerated: 0,
      documents: [],
      indexPath: null,
      errors: []
    };

    try {
      // Get existing ADRs to determine next number
      let nextNumber = this.getNextADRNumber();

      for (const candidate of detectionResult.candidates) {
        try {
          const adrDoc = this.generateSingleADR(candidate, nextNumber, options);
          result.documents.push(adrDoc);
          result.adrsGenerated++;
          nextNumber++;
        } catch (error) {
          result.errors.push({
            candidate: candidate.type,
            error: error.message
          });
        }
      }

      // Generate index
      result.indexPath = this.generateADRIndex(result.documents, options);

    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Get the next ADR number
   * @returns {number} Next ADR number
   */
  getNextADRNumber() {
    const decisionsPath = this.getDecisionsPath();

    if (!fs.existsSync(decisionsPath)) {
      return 1;
    }

    const files = fs.readdirSync(decisionsPath);
    const adrNumbers = files
      .filter(f => f.match(/^ADR-\d+/))
      .map(f => parseInt(f.match(/ADR-(\d+)/)[1], 10))
      .filter(n => !isNaN(n));

    return adrNumbers.length > 0 ? Math.max(...adrNumbers) + 1 : 1;
  }

  /**
   * Generate a single ADR document
   * @param {Object} candidate - ADR candidate
   * @param {number} number - ADR number
   * @param {Object} options - Options
   * @returns {Object} Document info
   */
  generateSingleADR(candidate, number, options) {
    const adrId = `ADR-${String(number).padStart(3, '0')}`;
    const title = this.generateADRTitle(candidate);
    const fileName = `${adrId}-${this.sanitizeFileName(title)}.md`;
    const filePath = path.join(this.getDecisionsPath(), fileName);

    const content = this.buildADRMarkdown(candidate, adrId, title, options);

    fs.writeFileSync(filePath, content, 'utf8');

    return {
      id: adrId,
      title,
      fileName,
      filePath,
      type: candidate.type,
      confidence: candidate.confidence,
      commit: candidate.commit?.shortHash || null
    };
  }

  /**
   * Generate ADR title from candidate
   * @param {Object} candidate - ADR candidate
   * @returns {string} ADR title
   */
  generateADRTitle(candidate) {
    // Use pattern match if available
    if (candidate.signals?.patterns?.length > 0) {
      const pattern = candidate.signals.patterns[0];

      switch (pattern.type) {
        case 'choice':
          return `Choose ${pattern.groups[0]} over ${pattern.groups[1]}`;
        case 'replacement':
          return `Replace ${pattern.groups[0]} with ${pattern.groups[1] || 'new solution'}`;
        case 'adoption':
          return `Adopt ${pattern.groups[0]}`;
        case 'migration':
          return `Migrate to ${pattern.groups[0]}`;
        case 'deprecation':
          return `Deprecate ${pattern.groups[0]}`;
        default:
          return this.capitalizeFirst(pattern.match.substring(0, 60));
      }
    }

    // Use dependency info
    if (candidate.dependency) {
      if (candidate.type === 'major-upgrade') {
        return `Upgrade ${candidate.dependency} to ${candidate.metadata?.to}`;
      }
      return `Adopt ${candidate.dependency}`;
    }

    // Use commit subject
    if (candidate.commit?.subject) {
      return candidate.commit.conventional?.description || candidate.commit.subject.substring(0, 60);
    }

    return 'Architecture Decision';
  }

  /**
   * Build ADR markdown content
   * @param {Object} candidate - ADR candidate
   * @param {string} adrId - ADR ID
   * @param {string} title - ADR title
   * @param {Object} options - Options
   * @returns {string} Markdown content
   */
  buildADRMarkdown(candidate, adrId, title, options) {
    const lines = [];
    const commit = candidate.commit;

    // Header
    lines.push(`# ${adrId}: ${title}`);
    lines.push('');

    // Metadata table
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| **Date** | ${commit ? this.formatDate(commit.date) : new Date().toISOString().split('T')[0]} |`);
    lines.push(`| **Status** | Accepted |`);
    lines.push(`| **Deciders** | ${commit?.author?.name || 'Team'} |`);

    if (commit) {
      lines.push(`| **Source** | ${commit.shortHash} |`);
    }

    lines.push(`| **Confidence** | ${Math.round(candidate.confidence * 100)}% |`);
    lines.push(`| **Type** | ${this.capitalizeFirst(candidate.type || 'decision')} |`);
    lines.push('');

    // Context section
    lines.push('## Context');
    lines.push('');
    lines.push(this.generateContext(candidate));
    lines.push('');

    // Decision section
    lines.push('## Decision');
    lines.push('');
    lines.push(this.generateDecision(candidate));
    lines.push('');

    // Consequences section
    lines.push('## Consequences');
    lines.push('');
    lines.push('### Positive');
    lines.push('');
    const positives = this.inferPositiveConsequences(candidate);
    for (const positive of positives) {
      lines.push(`- ${positive}`);
    }
    lines.push('');

    lines.push('### Negative');
    lines.push('');
    const negatives = this.inferNegativeConsequences(candidate);
    for (const negative of negatives) {
      lines.push(`- ${negative}`);
    }
    lines.push('');

    // Alternatives considered (if available)
    const alternatives = this.extractAlternatives(candidate);
    if (alternatives.length > 0) {
      lines.push('## Alternatives Considered');
      lines.push('');
      for (const alt of alternatives) {
        lines.push(`- ${alt}`);
      }
      lines.push('');
    }

    // Related section
    lines.push('## Related');
    lines.push('');

    if (commit) {
      lines.push(`- **Commit**: [${commit.shortHash}](${commit.hash})`);
    }

    if (candidate.dependency) {
      lines.push(`- **Package**: ${candidate.dependency}`);
    }

    if (candidate.metadata?.directory) {
      lines.push(`- **Directory**: \`${candidate.metadata.directory}\``);
    }

    lines.push('');

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Auto-generated from git history on ${new Date().toISOString()}*`);

    return lines.join('\n');
  }

  /**
   * Generate context section content
   * @param {Object} candidate - ADR candidate
   * @returns {string} Context text
   */
  generateContext(candidate) {
    const parts = [];

    if (candidate.commit?.body) {
      // Use commit body for context
      const relevantBody = candidate.commit.body.split('\n\n')[0];
      if (relevantBody.length > 20) {
        parts.push(relevantBody);
      }
    }

    if (parts.length === 0) {
      // Generate based on type
      switch (candidate.type) {
        case 'breaking-change':
          parts.push('A breaking change was required to improve the codebase architecture or remove technical debt.');
          break;
        case 'dependency-adoption':
          parts.push(`The team needed to add ${candidate.dependency} to support new functionality or improve developer experience.`);
          break;
        case 'technology-replacement':
          parts.push('The existing solution was no longer meeting project requirements, prompting a technology change.');
          break;
        case 'architecture-change':
          parts.push('The codebase structure needed reorganization to improve maintainability and scalability.');
          break;
        default:
          parts.push('A technical decision was needed to address project requirements.');
      }
    }

    return parts.join('\n\n');
  }

  /**
   * Generate decision section content
   * @param {Object} candidate - ADR candidate
   * @returns {string} Decision text
   */
  generateDecision(candidate) {
    const patterns = candidate.signals?.patterns || [];

    if (patterns.length > 0) {
      const pattern = patterns[0];
      return this.capitalizeFirst(pattern.match) + '.';
    }

    if (candidate.commit?.subject) {
      return this.capitalizeFirst(
        candidate.commit.conventional?.description || candidate.commit.subject
      ) + '.';
    }

    return 'The team decided to proceed with the proposed changes.';
  }

  /**
   * Infer positive consequences
   * @param {Object} candidate - ADR candidate
   * @returns {Array} Positive consequences
   */
  inferPositiveConsequences(candidate) {
    const positives = [];

    switch (candidate.type) {
      case 'adoption':
      case 'dependency-adoption':
        positives.push('Improved developer productivity');
        positives.push('Access to well-maintained community solution');
        break;
      case 'replacement':
      case 'technology-replacement':
        positives.push('Better alignment with current best practices');
        positives.push('Improved maintainability');
        break;
      case 'migration':
        positives.push('Modernized technology stack');
        positives.push('Better performance or scalability');
        break;
      case 'breaking-change':
        positives.push('Cleaner API surface');
        positives.push('Removed technical debt');
        break;
      case 'architecture-change':
        positives.push('Improved code organization');
        positives.push('Better separation of concerns');
        break;
      default:
        positives.push('Addresses immediate project needs');
    }

    return positives;
  }

  /**
   * Infer negative consequences
   * @param {Object} candidate - ADR candidate
   * @returns {Array} Negative consequences
   */
  inferNegativeConsequences(candidate) {
    const negatives = [];

    switch (candidate.type) {
      case 'adoption':
      case 'dependency-adoption':
        negatives.push('Added dependency to maintain');
        negatives.push('Team needs to learn new tool/library');
        break;
      case 'replacement':
      case 'technology-replacement':
        negatives.push('Migration effort required');
        negatives.push('Potential for regressions during transition');
        break;
      case 'breaking-change':
        negatives.push('Existing clients need to update');
        negatives.push('May require documentation updates');
        break;
      case 'migration':
        negatives.push('Temporary increase in complexity during migration');
        break;
      default:
        negatives.push('Implementation and testing effort required');
    }

    return negatives;
  }

  /**
   * Extract alternatives from candidate
   * @param {Object} candidate - ADR candidate
   * @returns {Array} Alternatives
   */
  extractAlternatives(candidate) {
    const alternatives = [];

    // Check for "over" pattern
    const patterns = candidate.signals?.patterns || [];
    for (const pattern of patterns) {
      if (pattern.type === 'choice' && pattern.groups.length > 1) {
        alternatives.push(`${pattern.groups[1]} - Rejected in favor of ${pattern.groups[0]}`);
      }
      if (pattern.type === 'replacement' && pattern.groups.length > 0) {
        alternatives.push(`Keep ${pattern.groups[0]} - Rejected due to limitations`);
      }
    }

    // Check for removed dependencies
    if (candidate.metadata?.removed) {
      for (const removed of candidate.metadata.removed) {
        alternatives.push(`Continue with ${removed} - Rejected`);
      }
    }

    return alternatives;
  }

  /**
   * Generate ADR index
   * @param {Array} documents - Generated ADR documents
   * @param {Object} options - Options
   * @returns {string} Index file path
   */
  generateADRIndex(documents, options) {
    const indexPath = path.join(this.getDecisionsPath(), 'index.md');
    const lines = [];

    lines.push('# Architecture Decision Records');
    lines.push('');
    lines.push(`> Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Overview
    lines.push('## Overview');
    lines.push('');
    lines.push('This directory contains Architecture Decision Records (ADRs) that document');
    lines.push('significant technical decisions made during the development of this project.');
    lines.push('');

    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Total ADRs | ${documents.length} |`);

    // Count by type
    const typeCounts = {};
    for (const doc of documents) {
      typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCounts)) {
      lines.push(`| ${this.capitalizeFirst(type)} | ${count} |`);
    }
    lines.push('');

    // ADR list
    lines.push('## Decision Log');
    lines.push('');
    lines.push('| ID | Title | Type | Confidence |');
    lines.push('|----|-------|------|------------|');

    for (const doc of documents) {
      const confidence = Math.round(doc.confidence * 100) + '%';
      lines.push(`| [${doc.id}](./${doc.fileName}) | ${doc.title} | ${this.capitalizeFirst(doc.type)} | ${confidence} |`);
    }

    lines.push('');

    // Status legend
    lines.push('## Status Definitions');
    lines.push('');
    lines.push('- **Accepted**: Decision has been made and implemented');
    lines.push('- **Proposed**: Decision is being considered');
    lines.push('- **Deprecated**: Decision has been superseded by a newer ADR');
    lines.push('- **Superseded**: Decision has been replaced (links to replacement)');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Auto-generated from git history*');

    fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
    return indexPath;
  }

  /**
   * Format date for display
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    return new Date(dateStr).toISOString().split('T')[0];
  }

  /**
   * Sanitize string for file name
   * @param {string} str - String to sanitize
   * @returns {string} Safe file name
   */
  sanitizeFileName(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 40);
  }

  /**
   * Capitalize first letter
   * @param {string} str - String
   * @returns {string} Capitalized string
   */
  capitalizeFirst(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

module.exports = ADRDetector;
