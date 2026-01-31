/**
 * Git History Parser Skill
 *
 * Parses git commits, branches, and conventional commit messages.
 * Provides structured commit data for knowledge extraction.
 *
 * Features:
 * - Parse conventional commits (type, scope, breaking changes)
 * - Extract commit metadata (author, date, files changed)
 * - Identify branch merges and their history
 * - Support batch processing with progress callbacks
 * - Handle incremental parsing (since last commit)
 */

const { execSync } = require('child_process');
const path = require('path');

class GitHistoryParser {
  constructor(config = {}) {
    this.config = {
      repoPath: config.repoPath || process.cwd(),
      batchSize: config.batchSize || 100,
      skipMergeCommits: config.skipMergeCommits || false,
      ...config
    };

    // Conventional commit type patterns
    this.conventionalTypes = [
      'feat', 'fix', 'docs', 'style', 'refactor', 'perf',
      'test', 'build', 'ci', 'chore', 'revert'
    ];

    // Decision detection patterns
    this.decisionPatterns = [
      /chose?\s+(\w+)\s+over\s+(\w+)/i,
      /switch(?:ed|ing)?\s+to\s+(\w+)/i,
      /adopt(?:ed|ing)?\s+(\w+)/i,
      /replac(?:e|ed|ing)?\s+(\w+)\s+with\s+(\w+)/i,
      /migrat(?:e|ed|ing)?\s+to\s+(\w+)/i,
      /prefer\s+(\w+)/i,
      /use\s+(\w+)\s+instead\s+of\s+(\w+)/i,
      /breaking\s+change/i
    ];
  }

  /**
   * Parse commits from git history
   * @param {Object} options - Parsing options
   * @param {Function} onProgress - Progress callback
   * @returns {Object} Parsed commits result
   */
  async parseCommits(options = {}, onProgress = null) {
    const {
      since = null,
      until = null,
      branches = ['HEAD'],
      maxCommits = null,
      includeStats = true,
      includeDiff = false
    } = options;

    const result = {
      commits: [],
      totalParsed: 0,
      skipped: 0,
      branches: branches,
      dateRange: { earliest: null, latest: null },
      parseTime: null
    };

    const startTime = Date.now();

    try {
      // Build git log command
      let gitCmd = 'git log';
      gitCmd += ' --format="COMMIT_START%n%H%n%an%n%ae%n%aI%n%s%n%b%nCOMMIT_END"';

      if (includeStats) {
        gitCmd += ' --stat';
      }

      if (this.config.skipMergeCommits) {
        gitCmd += ' --no-merges';
      }

      if (since) {
        gitCmd += ` --since="${since}"`;
      }

      if (until) {
        gitCmd += ` --until="${until}"`;
      }

      if (maxCommits) {
        gitCmd += ` -n ${maxCommits}`;
      }

      // Add branches
      gitCmd += ' ' + branches.join(' ');

      const output = execSync(gitCmd, {
        cwd: this.config.repoPath,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024 // 50MB buffer
      });

      // Parse commits
      const commitBlocks = output.split('COMMIT_START').filter(b => b.trim());
      const totalCommits = commitBlocks.length;

      for (let i = 0; i < commitBlocks.length; i++) {
        const block = commitBlocks[i];
        const commit = this.parseCommitBlock(block);

        if (commit) {
          result.commits.push(commit);
          result.totalParsed++;
        } else {
          result.skipped++;
        }

        // Progress callback
        if (onProgress && i % this.config.batchSize === 0) {
          onProgress({
            current: i + 1,
            total: totalCommits,
            percent: Math.round(((i + 1) / totalCommits) * 100),
            lastCommit: commit?.hash?.substring(0, 7)
          });
        }
      }

      // Calculate date range
      if (result.commits.length > 0) {
        const dates = result.commits.map(c => new Date(c.date));
        result.dateRange.earliest = new Date(Math.min(...dates)).toISOString();
        result.dateRange.latest = new Date(Math.max(...dates)).toISOString();
      }

    } catch (error) {
      result.error = error.message;
    }

    result.parseTime = Date.now() - startTime;
    return result;
  }

  /**
   * Parse a single commit block
   * @param {string} block - Raw commit block
   * @returns {Object|null} Parsed commit
   */
  parseCommitBlock(block) {
    try {
      const lines = block.split('\n');
      let lineIndex = 0;

      // Skip empty lines
      while (lineIndex < lines.length && !lines[lineIndex].trim()) {
        lineIndex++;
      }

      if (lineIndex >= lines.length) return null;

      const hash = lines[lineIndex++]?.trim();
      const authorName = lines[lineIndex++]?.trim();
      const authorEmail = lines[lineIndex++]?.trim();
      const date = lines[lineIndex++]?.trim();
      const subject = lines[lineIndex++]?.trim();

      if (!hash || hash.length !== 40) return null;

      // Parse body (everything until COMMIT_END or stat section)
      const bodyLines = [];
      let statsStarted = false;
      const stats = { files: [], insertions: 0, deletions: 0 };

      while (lineIndex < lines.length) {
        const line = lines[lineIndex++];

        if (line.includes('COMMIT_END')) break;

        // Detect stat lines
        if (line.match(/^\s*\d+\s+file(s)?\s+changed/)) {
          statsStarted = true;
          const match = line.match(/(\d+)\s+insertion.*?(\d+)\s+deletion/);
          if (match) {
            stats.insertions = parseInt(match[1], 10) || 0;
            stats.deletions = parseInt(match[2], 10) || 0;
          }
          continue;
        }

        if (line.match(/^\s+\S+\s+\|\s+\d+/)) {
          // File stat line
          const fileMatch = line.match(/^\s+(\S+)\s+\|\s+(\d+)/);
          if (fileMatch) {
            stats.files.push({
              path: fileMatch[1],
              changes: parseInt(fileMatch[2], 10)
            });
          }
          continue;
        }

        if (!statsStarted) {
          bodyLines.push(line);
        }
      }

      const body = bodyLines.join('\n').trim();

      // Parse conventional commit
      const conventional = this.parseConventionalCommit(subject, body);

      // Detect if this is a merge commit
      const isMerge = subject.startsWith('Merge ');

      // Detect decisions in commit message
      const decisions = this.detectDecisions(subject + ' ' + body);

      return {
        hash,
        shortHash: hash.substring(0, 7),
        author: { name: authorName, email: authorEmail },
        date,
        subject,
        body,
        stats,
        conventional,
        isMerge,
        isBreaking: conventional.breaking || subject.includes('!') || body.includes('BREAKING CHANGE'),
        decisions,
        filesChanged: stats.files.map(f => f.path)
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse conventional commit format
   * @param {string} subject - Commit subject
   * @param {string} body - Commit body
   * @returns {Object} Parsed conventional commit
   */
  parseConventionalCommit(subject, body) {
    const result = {
      isConventional: false,
      type: null,
      scope: null,
      breaking: false,
      description: subject
    };

    // Pattern: type(scope)!: description
    const pattern = /^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/;
    const match = subject.match(pattern);

    if (match) {
      const type = match[1].toLowerCase();

      if (this.conventionalTypes.includes(type)) {
        result.isConventional = true;
        result.type = type;
        result.scope = match[2] || null;
        result.breaking = match[3] === '!' || body.includes('BREAKING CHANGE');
        result.description = match[4];
      }
    }

    return result;
  }

  /**
   * Detect decision patterns in text
   * @param {string} text - Text to analyze
   * @returns {Array} Detected decisions
   */
  detectDecisions(text) {
    const decisions = [];

    for (const pattern of this.decisionPatterns) {
      const match = text.match(pattern);
      if (match) {
        decisions.push({
          pattern: pattern.source,
          match: match[0],
          groups: match.slice(1)
        });
      }
    }

    return decisions;
  }

  /**
   * Get merged branches from git history
   * @param {Object} options - Options
   * @returns {Array} Merged branches
   */
  getMergedBranches(options = {}) {
    const { since = null, pattern = null } = options;
    const branches = [];

    try {
      let cmd = 'git log --merges --format="%H|%s|%aI"';

      if (since) {
        cmd += ` --since="${since}"`;
      }

      const output = execSync(cmd, {
        cwd: this.config.repoPath,
        encoding: 'utf8'
      });

      const lines = output.split('\n').filter(l => l.trim());

      for (const line of lines) {
        const [hash, subject, date] = line.split('|');

        // Extract branch name from merge commit
        const branchMatch = subject.match(/Merge (?:branch|pull request) '?([^']+)'?(?: from|into|\s|$)/i);

        if (branchMatch) {
          const branchName = branchMatch[1].trim();

          // Apply pattern filter
          if (pattern && !branchName.match(new RegExp(pattern))) {
            continue;
          }

          branches.push({
            mergeCommit: hash,
            branchName,
            mergeDate: date,
            subject
          });
        }
      }
    } catch (error) {
      // Merge branch extraction failed
    }

    return branches;
  }

  /**
   * Get commits for a specific branch
   * @param {string} branchName - Branch name
   * @param {Object} options - Options
   * @returns {Object} Branch commits
   */
  getBranchCommits(branchName, options = {}) {
    const result = {
      branchName,
      commits: [],
      baseCommit: null,
      tipCommit: null,
      commitCount: 0
    };

    try {
      // Find merge base with main branch
      const mainBranch = options.mainBranch || 'main';
      let mergeBase;

      try {
        mergeBase = execSync(`git merge-base ${mainBranch} ${branchName}`, {
          cwd: this.config.repoPath,
          encoding: 'utf8'
        }).trim();
      } catch {
        // Try with 'master'
        try {
          mergeBase = execSync(`git merge-base master ${branchName}`, {
            cwd: this.config.repoPath,
            encoding: 'utf8'
          }).trim();
        } catch {
          return result;
        }
      }

      result.baseCommit = mergeBase;

      // Get commits between merge base and branch tip
      const cmd = `git log ${mergeBase}..${branchName} --format="%H|%s|%aI"`;
      const output = execSync(cmd, {
        cwd: this.config.repoPath,
        encoding: 'utf8'
      });

      const lines = output.split('\n').filter(l => l.trim());

      for (const line of lines) {
        const [hash, subject, date] = line.split('|');
        result.commits.push({ hash, subject, date });
      }

      result.commitCount = result.commits.length;

      if (result.commits.length > 0) {
        result.tipCommit = result.commits[0].hash;
      }

    } catch (error) {
      result.error = error.message;
    }

    return result;
  }

  /**
   * Get file history - which files changed most often
   * @param {Object} options - Options
   * @returns {Array} File change frequency
   */
  getFileChangeFrequency(options = {}) {
    const { since = null, limit = 50 } = options;
    const fileChanges = {};

    try {
      let cmd = 'git log --name-only --format=""';

      if (since) {
        cmd += ` --since="${since}"`;
      }

      const output = execSync(cmd, {
        cwd: this.config.repoPath,
        encoding: 'utf8',
        maxBuffer: 50 * 1024 * 1024
      });

      const files = output.split('\n').filter(f => f.trim());

      for (const file of files) {
        fileChanges[file] = (fileChanges[file] || 0) + 1;
      }

      // Sort by frequency
      const sorted = Object.entries(fileChanges)
        .sort(([, a], [, b]) => b - a)
        .slice(0, limit)
        .map(([file, count]) => ({ file, count }));

      return sorted;
    } catch (error) {
      return [];
    }
  }

  /**
   * Infer entity type from file path
   * @param {string} filePath - File path
   * @returns {string|null} Inferred entity type
   */
  inferEntityType(filePath) {
    const pathPatterns = {
      'service': [/services?\//, /srv\//],
      'component': [/components?\//, /ui\//, /views?\//],
      'api': [/api\//, /endpoints?\//, /routes?\//],
      'model': [/models?\//, /entities?\//, /schemas?\//],
      'hook': [/hooks?\//, /use[A-Z]/],
      'util': [/utils?\//, /helpers?\//, /lib\//],
      'test': [/tests?\//, /specs?\//, /__tests__\//, /\.test\./, /\.spec\./],
      'config': [/config\//, /settings?\//, /\.config\./],
      'middleware': [/middleware\//],
      'controller': [/controllers?\//],
      'repository': [/repositories?\//, /repos?\//]
    };

    for (const [type, patterns] of Object.entries(pathPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(filePath)) {
          return type;
        }
      }
    }

    return null;
  }

  /**
   * Group commits by author
   * @param {Array} commits - Array of commits
   * @returns {Object} Commits grouped by author
   */
  groupByAuthor(commits) {
    const byAuthor = {};

    for (const commit of commits) {
      const authorKey = commit.author?.email || commit.author?.name || 'unknown';

      if (!byAuthor[authorKey]) {
        byAuthor[authorKey] = {
          author: commit.author,
          commits: [],
          commitCount: 0
        };
      }

      byAuthor[authorKey].commits.push(commit);
      byAuthor[authorKey].commitCount++;
    }

    return byAuthor;
  }

  /**
   * Group commits by type (conventional commit type)
   * @param {Array} commits - Array of commits
   * @returns {Object} Commits grouped by type
   */
  groupByType(commits) {
    const byType = {};

    for (const commit of commits) {
      const type = commit.conventional?.type || 'other';

      if (!byType[type]) {
        byType[type] = [];
      }

      byType[type].push(commit);
    }

    return byType;
  }

  /**
   * Group commits by scope
   * @param {Array} commits - Array of commits
   * @returns {Object} Commits grouped by scope
   */
  groupByScope(commits) {
    const byScope = {};

    for (const commit of commits) {
      const scope = commit.conventional?.scope || 'general';

      if (!byScope[scope]) {
        byScope[scope] = [];
      }

      byScope[scope].push(commit);
    }

    return byScope;
  }

  /**
   * Detect patterns in commit history
   * @param {Array} commits - Array of commits
   * @returns {Array} Detected patterns
   */
  detectPatterns(commits) {
    const patterns = [];

    // Group by type+scope
    const typeScopes = {};
    for (const commit of commits) {
      if (commit.conventional?.isConventional) {
        const key = `${commit.conventional.type}:${commit.conventional.scope || 'general'}`;

        if (!typeScopes[key]) {
          typeScopes[key] = [];
        }
        typeScopes[key].push(commit);
      }
    }

    // Find patterns (3+ similar commits)
    for (const [key, groupCommits] of Object.entries(typeScopes)) {
      if (groupCommits.length >= 3) {
        const [type, scope] = key.split(':');
        patterns.push({
          type: 'repeated-work',
          commitType: type,
          scope: scope,
          count: groupCommits.length,
          commits: groupCommits.map(c => c.shortHash),
          confidence: Math.min(0.9, 0.5 + (groupCommits.length * 0.1))
        });
      }
    }

    // Detect refactoring patterns
    const refactorCommits = commits.filter(c =>
      c.conventional?.type === 'refactor' ||
      c.subject.toLowerCase().includes('refactor')
    );

    if (refactorCommits.length >= 2) {
      patterns.push({
        type: 'refactoring-pattern',
        count: refactorCommits.length,
        commits: refactorCommits.map(c => c.shortHash),
        confidence: 0.7
      });
    }

    // Detect fix patterns (same scope)
    const fixesByScope = {};
    for (const commit of commits) {
      if (commit.conventional?.type === 'fix' && commit.conventional?.scope) {
        const scope = commit.conventional.scope;
        if (!fixesByScope[scope]) {
          fixesByScope[scope] = [];
        }
        fixesByScope[scope].push(commit);
      }
    }

    for (const [scope, fixes] of Object.entries(fixesByScope)) {
      if (fixes.length >= 2) {
        patterns.push({
          type: 'recurring-fixes',
          scope: scope,
          count: fixes.length,
          commits: fixes.map(c => c.shortHash),
          confidence: 0.6,
          suggestion: `Consider reviewing ${scope} for root cause issues`
        });
      }
    }

    return patterns;
  }

  /**
   * Get commit statistics summary
   * @param {Array} commits - Array of commits
   * @returns {Object} Statistics summary
   */
  getStatistics(commits) {
    if (!commits || commits.length === 0) {
      return {
        total: 0,
        conventional: 0,
        breaking: 0,
        merges: 0,
        byType: {},
        topScopes: [],
        topAuthors: []
      };
    }

    const byType = this.groupByType(commits);
    const byScope = this.groupByScope(commits);
    const byAuthor = this.groupByAuthor(commits);

    return {
      total: commits.length,
      conventional: commits.filter(c => c.conventional?.isConventional).length,
      breaking: commits.filter(c => c.isBreaking).length,
      merges: commits.filter(c => c.isMerge).length,
      withDecisions: commits.filter(c => c.decisions?.length > 0).length,
      byType: Object.fromEntries(
        Object.entries(byType).map(([type, list]) => [type, list.length])
      ),
      topScopes: Object.entries(byScope)
        .map(([scope, list]) => ({ scope, count: list.length }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      topAuthors: Object.entries(byAuthor)
        .map(([email, data]) => ({
          author: data.author?.name || email,
          count: data.commitCount
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
    };
  }
}

module.exports = GitHistoryParser;
