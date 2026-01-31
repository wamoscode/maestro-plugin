/**
 * Knowledge Extractor Skill
 *
 * Extracts knowledge entries from parsed git history.
 * Converts commits, PRs, and patterns into structured knowledge
 * that can be stored in the Knowledge System.
 *
 * Knowledge Types Extracted:
 * - Decisions: Architectural choices, breaking changes, technology adoptions
 * - Patterns: Recurring approaches, refactoring patterns, coding conventions
 * - Entities: Services, components, APIs discovered from file paths
 * - Learnings: Bug fixes, reverts, lessons learned
 */

const crypto = require('crypto');

class KnowledgeExtractor {
  constructor(config = {}) {
    this.config = {
      minConfidence: config.minConfidence || 0.5,
      enableDeduplication: config.enableDeduplication !== false,
      repositoryContext: config.repositoryContext || null,
      ...config
    };

    // Confidence weights for different commit types
    this.confidenceWeights = {
      'feat!': 0.85,
      'feat': 0.7,
      'fix': 0.6,
      'refactor': 0.65,
      'perf': 0.7,
      'docs': 0.5,
      'test': 0.55,
      'chore': 0.4,
      'ci': 0.5,
      'build': 0.5,
      'style': 0.3,
      'revert': 0.75,
      'other': 0.5
    };

    // Knowledge type mappings based on commit patterns
    this.typeMappings = {
      decision: {
        commitTypes: ['feat!', 'refactor', 'perf'],
        patterns: [
          /breaking\s+change/i,
          /migrate/i,
          /switch/i,
          /adopt/i,
          /replace/i,
          /chose/i,
          /prefer/i,
          /introduce/i,
          /upgrade\s+to/i
        ]
      },
      entity: {
        commitTypes: ['feat'],
        pathPatterns: [
          { pattern: /services?\/([^/]+)/, type: 'service' },
          { pattern: /components?\/([^/]+)/, type: 'component' },
          { pattern: /api\/([^/]+)/, type: 'api' },
          { pattern: /models?\/([^/]+)/, type: 'model' },
          { pattern: /hooks?\/([^/]+)/, type: 'hook' },
          { pattern: /controllers?\/([^/]+)/, type: 'controller' },
          { pattern: /middleware\/([^/]+)/, type: 'middleware' }
        ]
      },
      pattern: {
        threshold: 3, // Minimum occurrences to be a pattern
        commitTypes: ['refactor', 'feat', 'fix']
      },
      learning: {
        commitTypes: ['fix', 'revert'],
        patterns: [
          /fix(?:es|ed)?\s+(?:bug|issue|error)/i,
          /revert/i,
          /hotfix/i,
          /workaround/i,
          /rollback/i
        ]
      }
    };

    // Content hash cache for deduplication
    this.contentHashes = new Set();
  }

  /**
   * Extract all knowledge from parsed commits
   * @param {Array} commits - Parsed commits from GitHistoryParser
   * @param {Object} options - Extraction options
   * @returns {Object} Extracted knowledge
   */
  extractFromCommits(commits, options = {}) {
    const result = {
      decisions: [],
      entities: [],
      patterns: [],
      learnings: [],
      metadata: {
        sourceType: 'git-commits',
        extractedAt: new Date().toISOString(),
        commitCount: commits.length,
        options
      },
      stats: {
        total: 0,
        byType: {},
        duplicatesSkipped: 0
      }
    };

    // Reset content hashes for new extraction
    this.contentHashes.clear();

    // First pass: Extract direct knowledge from each commit
    for (const commit of commits) {
      // Extract decisions
      const decisions = this.extractDecisions(commit);
      for (const decision of decisions) {
        if (this.shouldInclude(decision)) {
          result.decisions.push(decision);
        }
      }

      // Extract entities
      const entities = this.extractEntities(commit);
      for (const entity of entities) {
        if (this.shouldInclude(entity)) {
          result.entities.push(entity);
        }
      }

      // Extract learnings
      const learnings = this.extractLearnings(commit);
      for (const learning of learnings) {
        if (this.shouldInclude(learning)) {
          result.learnings.push(learning);
        }
      }
    }

    // Second pass: Detect patterns from commit groups
    const patterns = this.extractPatterns(commits);
    for (const pattern of patterns) {
      if (this.shouldInclude(pattern)) {
        result.patterns.push(pattern);
      }
    }

    // Calculate stats
    result.stats.total = result.decisions.length + result.entities.length +
      result.patterns.length + result.learnings.length;
    result.stats.byType = {
      decisions: result.decisions.length,
      entities: result.entities.length,
      patterns: result.patterns.length,
      learnings: result.learnings.length
    };

    return result;
  }

  /**
   * Extract decisions from a commit
   * @param {Object} commit - Parsed commit
   * @returns {Array} Extracted decisions
   */
  extractDecisions(commit) {
    const decisions = [];
    const config = this.typeMappings.decision;

    // Check if commit type indicates a decision
    let isDecisionType = false;
    if (commit.isBreaking) {
      isDecisionType = true;
    } else if (commit.conventional?.isConventional) {
      const typeKey = commit.conventional.breaking ?
        commit.conventional.type + '!' : commit.conventional.type;
      isDecisionType = config.commitTypes.includes(typeKey) ||
        config.commitTypes.includes(commit.conventional.type);
    }

    // Check for decision patterns in message
    const fullMessage = `${commit.subject} ${commit.body || ''}`;
    const patternMatches = config.patterns.filter(p => p.test(fullMessage));

    if (isDecisionType || patternMatches.length > 0 || (commit.decisions && commit.decisions.length > 0)) {
      let confidence = this.calculateConfidence(commit, 'decision');

      // Boost confidence for explicit decision patterns
      if (patternMatches.length > 0) {
        confidence = Math.min(0.95, confidence + (patternMatches.length * 0.1));
      }

      // Only include if above threshold
      if (confidence >= this.config.minConfidence) {
        const decision = {
          type: 'decision',
          title: this.extractDecisionTitle(commit),
          content: {
            choice: commit.conventional?.description || commit.subject,
            rationale: commit.body || null,
            context: this.buildCommitContext(commit)
          },
          domain: commit.conventional?.scope || 'general',
          tags: this.extractTags(commit),
          confidence,
          source: {
            type: 'git-commit',
            commit: commit.shortHash,
            date: commit.date,
            author: commit.author?.name
          },
          context: {
            repository: this.config.repositoryContext?.name,
            branch: this.config.repositoryContext?.branch
          }
        };

        // Add breaking change info
        if (commit.isBreaking) {
          decision.content.isBreaking = true;
          decision.tags.push('breaking-change');
        }

        decisions.push(decision);
      }
    }

    return decisions;
  }

  /**
   * Extract a clean decision title from commit
   * @param {Object} commit - Parsed commit
   * @returns {string} Decision title
   */
  extractDecisionTitle(commit) {
    let title = commit.subject;

    // Remove conventional commit prefix
    if (commit.conventional?.isConventional) {
      title = commit.conventional.description;
    }

    // Handle missing title
    if (!title) {
      return 'Untitled Decision';
    }

    // Clean up common prefixes
    title = title
      .replace(/^(WIP|wip|WIP:)/i, '')
      .replace(/^(feat|fix|refactor|perf|docs|test|chore|ci|build|style|revert)(\([^)]+\))?!?:\s*/i, '')
      .trim();

    // Capitalize first letter
    title = title.charAt(0).toUpperCase() + title.slice(1);

    // Truncate if too long
    if (title.length > 100) {
      title = title.substring(0, 97) + '...';
    }

    return title;
  }

  /**
   * Extract entities from a commit
   * @param {Object} commit - Parsed commit
   * @returns {Array} Extracted entities
   */
  extractEntities(commit) {
    const entities = [];
    const config = this.typeMappings.entity;

    // Only extract entities from feature commits or new files
    const isFeatureCommit = commit.conventional?.type === 'feat';
    if (!isFeatureCommit) return entities;

    // Check files changed for entity patterns
    for (const filePath of (commit.filesChanged || [])) {
      for (const { pattern, type } of config.pathPatterns) {
        const match = filePath.match(pattern);
        if (match) {
          const entityName = match[1]?.replace(/\.(js|ts|jsx|tsx|py|go|rs|java)$/, '');

          if (entityName && entityName.length > 1) {
            const entity = {
              type: 'entity',
              title: this.formatEntityName(entityName),
              entityType: type,
              content: {
                name: entityName,
                location: filePath,
                description: `${type.charAt(0).toUpperCase() + type.slice(1)} introduced in ${commit.shortHash}`
              },
              domain: commit.conventional?.scope || type,
              tags: [type, 'auto-discovered'],
              confidence: 0.65,
              source: {
                type: 'git-commit',
                commit: commit.shortHash,
                date: commit.date,
                author: commit.author?.name
              },
              context: {
                repository: this.config.repositoryContext?.name
              }
            };

            entities.push(entity);
          }
        }
      }
    }

    return entities;
  }

  /**
   * Format entity name for display
   * @param {string} name - Raw entity name
   * @returns {string} Formatted name
   */
  formatEntityName(name) {
    // Convert camelCase/PascalCase/kebab-case/snake_case to title case
    return name
      .replace(/[-_]/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Extract learnings from a commit
   * @param {Object} commit - Parsed commit
   * @returns {Array} Extracted learnings
   */
  extractLearnings(commit) {
    const learnings = [];
    const config = this.typeMappings.learning;

    // Check if commit type indicates a learning
    const isLearningType = commit.conventional?.type &&
      config.commitTypes.includes(commit.conventional.type);

    // Check for learning patterns in message
    const fullMessage = `${commit.subject} ${commit.body || ''}`;
    const patternMatches = config.patterns.filter(p => p.test(fullMessage));

    if (isLearningType || patternMatches.length > 0) {
      const confidence = this.calculateConfidence(commit, 'learning');

      if (confidence >= this.config.minConfidence) {
        const isRevert = /revert/i.test(fullMessage);
        const isBugFix = commit.conventional?.type === 'fix';

        const learning = {
          type: 'learning',
          title: isRevert ?
            `Reverted: ${this.extractDecisionTitle(commit)}` :
            `Fixed: ${this.extractDecisionTitle(commit)}`,
          content: {
            problem: this.extractProblem(commit),
            solution: commit.conventional?.description || commit.subject,
            preventionStrategy: commit.body || null
          },
          domain: commit.conventional?.scope || 'general',
          tags: this.extractTags(commit),
          confidence,
          learningType: isRevert ? 'what-not-to-do' : 'bug-fix',
          source: {
            type: 'git-commit',
            commit: commit.shortHash,
            date: commit.date,
            author: commit.author?.name
          },
          context: {
            repository: this.config.repositoryContext?.name
          }
        };

        // Add specific tags
        if (isRevert) {
          learning.tags.push('revert', 'lesson-learned');
        }
        if (isBugFix) {
          learning.tags.push('bug-fix');
        }

        learnings.push(learning);
      }
    }

    return learnings;
  }

  /**
   * Extract problem description from a fix commit
   * @param {Object} commit - Parsed commit
   * @returns {string} Problem description
   */
  extractProblem(commit) {
    // Try to extract from body first
    if (commit.body) {
      const problemPatterns = [
        /(?:bug|issue|problem|error):\s*(.+)/i,
        /(?:was|were)\s+(.+)/i,
        /(?:caused|causing)\s+(.+)/i
      ];

      for (const pattern of problemPatterns) {
        const match = commit.body.match(pattern);
        if (match) {
          return match[1].trim();
        }
      }
    }

    // Default to subject-based description
    return `Issue addressed in commit ${commit.shortHash}`;
  }

  /**
   * Extract patterns from commit groups
   * @param {Array} commits - All commits
   * @returns {Array} Extracted patterns
   */
  extractPatterns(commits) {
    const patterns = [];
    const config = this.typeMappings.pattern;

    // Group by type+scope
    const groups = {};

    for (const commit of commits) {
      if (!commit.conventional?.isConventional) continue;

      const type = commit.conventional.type;
      const scope = commit.conventional.scope || 'general';
      const key = `${type}:${scope}`;

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(commit);
    }

    // Find patterns (threshold+ occurrences)
    for (const [key, groupCommits] of Object.entries(groups)) {
      if (groupCommits.length >= config.threshold) {
        const [type, scope] = key.split(':');

        // Only create patterns for relevant commit types
        if (!config.commitTypes.includes(type)) continue;

        const pattern = {
          type: 'pattern',
          title: this.generatePatternTitle(type, scope, groupCommits),
          content: {
            problem: this.inferPatternProblem(type, scope),
            solution: this.inferPatternSolution(type, scope, groupCommits),
            examples: groupCommits.slice(0, 3).map(c => ({
              commit: c.shortHash,
              description: c.conventional?.description || c.subject
            }))
          },
          domain: scope,
          tags: [type, 'recurring-pattern', 'auto-detected'],
          confidence: Math.min(0.9, 0.5 + (groupCommits.length * 0.05)),
          patternType: type === 'refactor' ? 'approach' : 'implementation',
          occurrences: groupCommits.length,
          source: {
            type: 'git-commits',
            commits: groupCommits.map(c => c.shortHash),
            dateRange: {
              earliest: groupCommits[groupCommits.length - 1]?.date,
              latest: groupCommits[0]?.date
            }
          },
          context: {
            repository: this.config.repositoryContext?.name
          }
        };

        patterns.push(pattern);
      }
    }

    // Detect refactoring patterns
    const refactorCommits = commits.filter(c =>
      c.conventional?.type === 'refactor' ||
      /refactor/i.test(c.subject)
    );

    if (refactorCommits.length >= 2) {
      // Group refactors by scope to find specific patterns
      const refactorsByScope = {};
      for (const commit of refactorCommits) {
        const scope = commit.conventional?.scope || 'general';
        if (!refactorsByScope[scope]) {
          refactorsByScope[scope] = [];
        }
        refactorsByScope[scope].push(commit);
      }

      for (const [scope, scopeRefactors] of Object.entries(refactorsByScope)) {
        if (scopeRefactors.length >= 2) {
          patterns.push({
            type: 'pattern',
            title: `${this.formatEntityName(scope)} Refactoring Approach`,
            content: {
              problem: `Code quality improvements needed in ${scope}`,
              solution: `Iterative refactoring pattern applied (${scopeRefactors.length} iterations)`,
              examples: scopeRefactors.slice(0, 3).map(c => ({
                commit: c.shortHash,
                description: c.conventional?.description || c.subject
              }))
            },
            domain: scope,
            tags: ['refactor', 'code-quality', 'iterative'],
            confidence: 0.7,
            patternType: 'approach',
            occurrences: scopeRefactors.length,
            source: {
              type: 'git-commits',
              commits: scopeRefactors.map(c => c.shortHash)
            }
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Generate a pattern title
   * @param {string} type - Commit type
   * @param {string} scope - Commit scope
   * @param {Array} commits - Related commits
   * @returns {string} Pattern title
   */
  generatePatternTitle(type, scope, commits) {
    const scopeTitle = this.formatEntityName(scope);

    switch (type) {
      case 'feat':
        return `${scopeTitle} Feature Implementation Pattern`;
      case 'fix':
        return `${scopeTitle} Bug Fix Approach`;
      case 'refactor':
        return `${scopeTitle} Refactoring Strategy`;
      case 'perf':
        return `${scopeTitle} Performance Optimization`;
      default:
        return `${scopeTitle} ${type.charAt(0).toUpperCase() + type.slice(1)} Pattern`;
    }
  }

  /**
   * Infer what problem a pattern addresses
   * @param {string} type - Commit type
   * @param {string} scope - Commit scope
   * @returns {string} Problem description
   */
  inferPatternProblem(type, scope) {
    const scopeTitle = this.formatEntityName(scope);

    switch (type) {
      case 'feat':
        return `Implementing new functionality in ${scopeTitle}`;
      case 'fix':
        return `Recurring issues in ${scopeTitle} require systematic fixes`;
      case 'refactor':
        return `${scopeTitle} code structure needs improvement`;
      case 'perf':
        return `${scopeTitle} performance needs optimization`;
      default:
        return `${scopeTitle} requires ${type} work`;
    }
  }

  /**
   * Infer how a pattern solves the problem
   * @param {string} type - Commit type
   * @param {string} scope - Commit scope
   * @param {Array} commits - Related commits
   * @returns {string} Solution description
   */
  inferPatternSolution(type, scope, commits) {
    // Extract common words from commit messages
    const words = commits
      .map(c => c.conventional?.description || c.subject)
      .join(' ')
      .toLowerCase()
      .split(/\s+/)
      .filter(w => w.length > 4);

    const wordFreq = {};
    for (const word of words) {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    }

    const topWords = Object.entries(wordFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([word]) => word);

    return `Consistent approach involving: ${topWords.join(', ')}`;
  }

  /**
   * Calculate confidence score for extracted knowledge
   * @param {Object} commit - Parsed commit
   * @param {string} knowledgeType - Type of knowledge being extracted
   * @returns {number} Confidence score (0-1)
   */
  calculateConfidence(commit, knowledgeType) {
    let baseConfidence = 0.5;

    // Add confidence based on commit type
    if (commit.conventional?.isConventional) {
      const typeKey = commit.conventional.breaking ?
        commit.conventional.type + '!' : commit.conventional.type;
      baseConfidence = this.confidenceWeights[typeKey] ||
        this.confidenceWeights[commit.conventional.type] ||
        this.confidenceWeights.other;
    }

    // Boost for breaking changes
    if (commit.isBreaking) {
      baseConfidence = Math.min(0.95, baseConfidence + 0.15);
    }

    // Boost for explicit decisions detected
    if (knowledgeType === 'decision' && commit.decisions?.length > 0) {
      baseConfidence = Math.min(0.95, baseConfidence + 0.1);
    }

    // Boost for detailed commit body
    if (commit.body && commit.body.length > 50) {
      baseConfidence = Math.min(0.95, baseConfidence + 0.05);
    }

    return Math.round(baseConfidence * 100) / 100;
  }

  /**
   * Extract tags from commit
   * @param {Object} commit - Parsed commit
   * @returns {Array} Tags
   */
  extractTags(commit) {
    const tags = [];

    // Add type as tag
    if (commit.conventional?.type) {
      tags.push(commit.conventional.type);
    }

    // Add scope as tag
    if (commit.conventional?.scope) {
      tags.push(commit.conventional.scope);
    }

    // Add source tag
    tags.push('hydrated');

    return [...new Set(tags)];
  }

  /**
   * Build context object from commit
   * @param {Object} commit - Parsed commit
   * @returns {Object} Context
   */
  buildCommitContext(commit) {
    return {
      commit: commit.shortHash,
      date: commit.date,
      author: commit.author?.name,
      filesAffected: commit.filesChanged?.length || 0,
      insertions: commit.stats?.insertions || 0,
      deletions: commit.stats?.deletions || 0
    };
  }

  /**
   * Check if knowledge entry should be included (passes deduplication)
   * @param {Object} entry - Knowledge entry
   * @returns {boolean}
   */
  shouldInclude(entry) {
    // Check confidence threshold
    if (entry.confidence < this.config.minConfidence) {
      return false;
    }

    // Check deduplication
    if (this.config.enableDeduplication) {
      const hash = this.computeContentHash(entry);

      if (this.contentHashes.has(hash)) {
        return false;
      }

      this.contentHashes.add(hash);
    }

    return true;
  }

  /**
   * Compute content hash for deduplication
   * @param {Object} entry - Knowledge entry
   * @returns {string} Content hash
   */
  computeContentHash(entry) {
    const content = `${entry.type}:${entry.title}:${entry.domain}`;
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * Extract knowledge from PR data (for GitHub integration)
   * @param {Object} pr - PR data from GitHub adapter
   * @returns {Object} Extracted knowledge
   */
  extractFromPR(pr) {
    const result = {
      decisions: [],
      learnings: []
    };

    // Extract decisions from PR
    if (pr.title || pr.body) {
      const fullText = `${pr.title} ${pr.body || ''}`;

      // Check for decision patterns
      const hasDecision = this.typeMappings.decision.patterns.some(p => p.test(fullText));

      if (hasDecision || pr.labels?.some(l => l.name?.includes('breaking'))) {
        result.decisions.push({
          type: 'decision',
          title: pr.title,
          content: {
            choice: pr.title,
            rationale: pr.body,
            context: {
              prNumber: pr.number,
              merged: pr.merged,
              mergedAt: pr.merged_at
            }
          },
          domain: 'general',
          tags: ['pr-decision', 'hydrated', ...(pr.labels?.map(l => l.name) || [])],
          confidence: 0.8,
          source: {
            type: 'github-pr',
            prNumber: pr.number,
            url: pr.html_url,
            author: pr.user?.login
          }
        });
      }
    }

    // Extract learnings from PR reviews
    if (pr.reviews) {
      for (const review of pr.reviews) {
        if (review.body && review.body.length > 50 && review.state === 'APPROVED') {
          // Approved reviews with substantial feedback might contain learnings
          result.learnings.push({
            type: 'learning',
            title: `Review insight from PR #${pr.number}`,
            content: {
              insight: review.body,
              context: {
                prNumber: pr.number,
                reviewer: review.user?.login
              }
            },
            domain: 'code-review',
            tags: ['pr-review', 'hydrated'],
            confidence: 0.6,
            source: {
              type: 'github-review',
              prNumber: pr.number,
              reviewId: review.id
            }
          });
        }
      }
    }

    return result;
  }

  /**
   * Create a retrospective track from branch history
   * @param {Object} branchData - Branch data from GitHistoryParser
   * @returns {Object} Track definition
   */
  createTrackFromBranch(branchData) {
    const branchName = branchData.branchName;
    const commits = branchData.commits || [];

    // Infer track type from branch name
    let trackType = 'feature';
    if (/^fix\//.test(branchName) || /^hotfix\//.test(branchName)) {
      trackType = 'bug';
    } else if (/^refactor\//.test(branchName)) {
      trackType = 'refactor';
    }

    // Generate track ID
    const trackId = `HYDRATED-${branchName.replace(/[^a-zA-Z0-9]/g, '-').substring(0, 20)}`;

    // Generate spec from commits
    const specContent = this.generateSpecFromCommits(commits);

    // Calculate date range
    const validDates = commits
      .filter(c => c.date)
      .map(c => new Date(c.date))
      .filter(d => !isNaN(d.getTime()));
    const startDate = validDates.length > 0 ? new Date(Math.min(...validDates)) : null;
    const endDate = validDates.length > 0 ? new Date(Math.max(...validDates)) : null;

    return {
      id: trackId,
      title: this.formatBranchTitle(branchName),
      type: trackType,
      status: 'completed',
      source: 'hydrated',
      metadata: {
        branchName,
        commitCount: commits.length,
        dateRange: {
          start: startDate ? startDate.toISOString() : null,
          end: endDate ? endDate.toISOString() : null
        },
        mergeCommit: branchData.mergeCommit
      },
      spec: specContent,
      commits: commits.map(c => c.hash || c)
    };
  }

  /**
   * Format branch name as track title
   * @param {string} branchName - Branch name
   * @returns {string} Track title
   */
  formatBranchTitle(branchName) {
    return branchName
      .replace(/^(feature|fix|hotfix|refactor|chore)\//, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Generate spec content from commits
   * @param {Array} commits - Commits
   * @returns {string} Spec markdown
   */
  generateSpecFromCommits(commits) {
    const lines = [
      '# Overview',
      '',
      '*This spec was auto-generated from git history.*',
      '',
      '## Changes',
      ''
    ];

    for (const commit of commits.slice(0, 10)) {
      const subject = commit.subject || commit;
      lines.push(`- ${subject}`);
    }

    if (commits.length > 10) {
      lines.push(`- ...and ${commits.length - 10} more commits`);
    }

    return lines.join('\n');
  }
}

module.exports = KnowledgeExtractor;
