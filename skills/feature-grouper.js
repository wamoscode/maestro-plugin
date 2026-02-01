/**
 * Feature Grouper Skill
 *
 * Groups commits into coherent features using multiple strategies:
 * - By Ticket ID (JIRA, GitHub issues, etc.)
 * - By Feature Branch (from merge commits)
 * - By Scope (conventional commit scopes)
 * - By Semantic Similarity (content-based clustering)
 *
 * Provides intelligent grouping to create meaningful feature documentation.
 */

const crypto = require('crypto');

class FeatureGrouper {
  constructor(config = {}) {
    this.config = {
      minGroupSize: config.minGroupSize || 1,
      maxGroupSize: config.maxGroupSize || 100,
      semanticSimilarityThreshold: config.semanticSimilarityThreshold || 0.3,
      enableSemanticGrouping: config.enableSemanticGrouping !== false,
      ...config
    };

    // Ticket ID extraction patterns
    this.ticketPatterns = [
      // JIRA style: PROJ-123, ABC-1234
      { regex: /\b([A-Z]{2,10}-\d+)\b/g, type: 'jira', priority: 1 },
      // GitHub style: #123
      { regex: /(?:^|\s)#(\d+)\b/g, type: 'github', priority: 2, transform: (m) => `#${m}` },
      // GitHub explicit: GH-123
      { regex: /\bGH-(\d+)\b/gi, type: 'github', priority: 2, transform: (m) => `GH-${m}` },
      // Bracketed: [PROJ-123]
      { regex: /\[([A-Z]+-\d+)\]/g, type: 'bracketed', priority: 1 },
      // Generic issue: ISSUE-123
      { regex: /\b(ISSUE-\d+)\b/gi, type: 'generic', priority: 3 },
      // Fixes/Closes GitHub: fixes #123, closes #456
      { regex: /(?:fixes?|closes?|resolves?)\s*#(\d+)/gi, type: 'github-link', priority: 1, transform: (m) => `#${m}` }
    ];

    // Branch type patterns for categorization
    this.branchPatterns = {
      feature: [/^feature\//, /^feat\//, /^add-/],
      bugfix: [/^fix\//, /^bugfix\//, /^hotfix\//],
      refactor: [/^refactor\//, /^cleanup\//, /^improve\//],
      chore: [/^chore\//, /^maintenance\//],
      release: [/^release\//, /^v\d+\./],
      docs: [/^docs\//, /^documentation\//]
    };

    // Stop words for semantic analysis
    this.stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'this', 'that', 'these', 'those', 'it', 'its', 'we', 'our', 'you',
      'your', 'they', 'their', 'add', 'update', 'fix', 'remove', 'change',
      'merge', 'branch', 'commit', 'wip', 'code', 'file', 'files'
    ]);
  }

  /**
   * Group commits using the specified strategy
   * @param {Array} commits - Parsed commits from GitHistoryParser
   * @param {Object} options - Grouping options
   * @returns {Object} Grouped commits result
   */
  groupCommits(commits, options = {}) {
    const {
      strategy = 'auto',
      includeUngrouped = true
    } = options;

    let groups;

    switch (strategy) {
      case 'ticket':
        groups = this.groupByTicket(commits);
        break;
      case 'branch':
        groups = this.groupByBranch(commits);
        break;
      case 'scope':
        groups = this.groupByScope(commits);
        break;
      case 'semantic':
        groups = this.groupBySemantic(commits);
        break;
      case 'auto':
      default:
        groups = this.autoGroup(commits);
        break;
    }

    // Add ungrouped commits if requested
    if (includeUngrouped) {
      const groupedHashes = new Set();
      for (const group of groups) {
        for (const commit of group.commits) {
          groupedHashes.add(commit.hash);
        }
      }

      const ungrouped = commits.filter(c => !groupedHashes.has(c.hash));
      if (ungrouped.length > 0) {
        groups.push({
          id: 'ungrouped',
          name: 'Ungrouped Commits',
          type: 'ungrouped',
          strategy: 'none',
          commits: ungrouped,
          confidence: 0.1,
          metadata: {
            reason: 'No grouping pattern matched'
          }
        });
      }
    }

    return {
      strategy: strategy,
      totalGroups: groups.length,
      totalCommits: commits.length,
      groups: groups,
      statistics: this.calculateGroupStatistics(groups)
    };
  }

  /**
   * Group commits by ticket ID
   * @param {Array} commits - Parsed commits
   * @returns {Array} Groups
   */
  groupByTicket(commits) {
    const ticketGroups = new Map();

    for (const commit of commits) {
      const tickets = this.extractTicketIds(commit);

      if (tickets.length > 0) {
        // Use the highest priority ticket
        const primaryTicket = tickets[0];

        if (!ticketGroups.has(primaryTicket.id)) {
          ticketGroups.set(primaryTicket.id, {
            id: `ticket-${primaryTicket.id}`,
            name: primaryTicket.id,
            type: 'ticket',
            ticketType: primaryTicket.type,
            strategy: 'ticket',
            commits: [],
            allTickets: new Set(),
            confidence: 0.9
          });
        }

        const group = ticketGroups.get(primaryTicket.id);
        group.commits.push(commit);

        // Track all tickets mentioned
        for (const ticket of tickets) {
          group.allTickets.add(ticket.id);
        }
      }
    }

    // Convert to array and finalize
    return Array.from(ticketGroups.values()).map(group => ({
      ...group,
      allTickets: Array.from(group.allTickets),
      dateRange: this.calculateDateRange(group.commits),
      metadata: {
        ticketCount: group.allTickets.size
      }
    }));
  }

  /**
   * Extract ticket IDs from a commit
   * @param {Object} commit - Parsed commit
   * @returns {Array} Extracted tickets with priority
   */
  extractTicketIds(commit) {
    const text = `${commit.subject} ${commit.body || ''}`;
    const tickets = [];

    for (const pattern of this.ticketPatterns) {
      const regex = new RegExp(pattern.regex.source, pattern.regex.flags);
      let match;

      while ((match = regex.exec(text)) !== null) {
        const ticketId = pattern.transform
          ? pattern.transform(match[1])
          : match[1];

        tickets.push({
          id: ticketId.toUpperCase(),
          type: pattern.type,
          priority: pattern.priority
        });
      }
    }

    // Sort by priority and deduplicate
    tickets.sort((a, b) => a.priority - b.priority);
    const seen = new Set();
    return tickets.filter(t => {
      if (seen.has(t.id)) return false;
      seen.add(t.id);
      return true;
    });
  }

  /**
   * Group commits by feature branch (from merge commits)
   * @param {Array} commits - Parsed commits
   * @returns {Array} Groups
   */
  groupByBranch(commits) {
    const branchGroups = new Map();
    const mergeCommits = commits.filter(c => c.isMerge);

    // First, identify branches from merge commits
    for (const merge of mergeCommits) {
      const branchInfo = this.extractBranchFromMerge(merge);

      if (branchInfo) {
        if (!branchGroups.has(branchInfo.name)) {
          branchGroups.set(branchInfo.name, {
            id: `branch-${this.sanitizeId(branchInfo.name)}`,
            name: branchInfo.name,
            displayName: this.formatBranchName(branchInfo.name),
            type: 'branch',
            branchType: branchInfo.type,
            strategy: 'branch',
            commits: [],
            mergeCommit: merge.hash,
            mergeDate: merge.date,
            confidence: 0.85
          });
        }

        const group = branchGroups.get(branchInfo.name);
        // The merge commit itself is part of the group
        group.commits.push(merge);
      }
    }

    // Associate non-merge commits with their likely branch
    // This is heuristic: commits just before a merge likely belong to that branch
    const nonMergeCommits = commits.filter(c => !c.isMerge);
    const sortedMerges = mergeCommits.sort((a, b) =>
      new Date(a.date) - new Date(b.date)
    );

    for (const commit of nonMergeCommits) {
      const commitDate = new Date(commit.date);

      // Find the next merge commit after this one
      const nextMerge = sortedMerges.find(m =>
        new Date(m.date) >= commitDate
      );

      if (nextMerge) {
        const branchInfo = this.extractBranchFromMerge(nextMerge);
        if (branchInfo && branchGroups.has(branchInfo.name)) {
          const group = branchGroups.get(branchInfo.name);
          group.commits.push(commit);
        }
      }
    }

    // Finalize groups
    return Array.from(branchGroups.values())
      .filter(g => g.commits.length >= this.config.minGroupSize)
      .map(group => ({
        ...group,
        dateRange: this.calculateDateRange(group.commits),
        metadata: {
          commitCount: group.commits.length,
          hasMerge: true
        }
      }));
  }

  /**
   * Extract branch information from a merge commit
   * @param {Object} commit - Merge commit
   * @returns {Object|null} Branch info
   */
  extractBranchFromMerge(commit) {
    const subject = commit.subject;

    // Pattern: Merge branch 'feature/xyz' into main
    const branchMatch = subject.match(/Merge\s+branch\s+'([^']+)'/i);
    if (branchMatch) {
      const branchName = branchMatch[1];
      return {
        name: branchName,
        type: this.detectBranchType(branchName)
      };
    }

    // Pattern: Merge pull request #123 from user/feature/xyz
    const prMatch = subject.match(/Merge\s+pull\s+request\s+#\d+\s+from\s+\S+\/(.+)/i);
    if (prMatch) {
      const branchName = prMatch[1];
      return {
        name: branchName,
        type: this.detectBranchType(branchName)
      };
    }

    // Pattern: Merge feature/xyz into main
    const simpleMatch = subject.match(/Merge\s+(\S+)\s+into\s+\S+/i);
    if (simpleMatch) {
      const branchName = simpleMatch[1];
      return {
        name: branchName,
        type: this.detectBranchType(branchName)
      };
    }

    return null;
  }

  /**
   * Detect branch type from branch name
   * @param {string} branchName - Branch name
   * @returns {string} Branch type
   */
  detectBranchType(branchName) {
    for (const [type, patterns] of Object.entries(this.branchPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(branchName)) {
          return type;
        }
      }
    }
    return 'other';
  }

  /**
   * Group commits by conventional commit scope
   * @param {Array} commits - Parsed commits
   * @returns {Array} Groups
   */
  groupByScope(commits) {
    const scopeGroups = new Map();

    for (const commit of commits) {
      if (commit.conventional?.isConventional && commit.conventional.scope) {
        const scope = commit.conventional.scope.toLowerCase();

        if (!scopeGroups.has(scope)) {
          scopeGroups.set(scope, {
            id: `scope-${this.sanitizeId(scope)}`,
            name: scope,
            displayName: this.formatScopeName(scope),
            type: 'scope',
            strategy: 'scope',
            commits: [],
            commitTypes: new Set(),
            confidence: 0.75
          });
        }

        const group = scopeGroups.get(scope);
        group.commits.push(commit);
        group.commitTypes.add(commit.conventional.type);
      }
    }

    // Finalize groups
    return Array.from(scopeGroups.values())
      .filter(g => g.commits.length >= this.config.minGroupSize)
      .map(group => ({
        ...group,
        commitTypes: Array.from(group.commitTypes),
        dateRange: this.calculateDateRange(group.commits),
        metadata: {
          primaryType: this.getPrimaryCommitType(group.commits)
        }
      }));
  }

  /**
   * Group commits by semantic similarity
   * @param {Array} commits - Parsed commits
   * @returns {Array} Groups
   */
  groupBySemantic(commits) {
    if (!this.config.enableSemanticGrouping) {
      return [];
    }

    // Extract keywords from each commit
    const commitKeywords = commits.map(commit => ({
      commit,
      keywords: this.extractKeywords(commit),
      vector: null
    }));

    // Build keyword frequency map
    const keywordFreq = new Map();
    for (const { keywords } of commitKeywords) {
      for (const keyword of keywords) {
        keywordFreq.set(keyword, (keywordFreq.get(keyword) || 0) + 1);
      }
    }

    // Filter to meaningful keywords (appear more than once but not too often)
    const totalCommits = commits.length;
    const meaningfulKeywords = Array.from(keywordFreq.entries())
      .filter(([_, count]) => count > 1 && count < totalCommits * 0.5)
      .map(([keyword]) => keyword);

    // Create TF-IDF vectors
    for (const item of commitKeywords) {
      item.vector = this.createTfIdfVector(item.keywords, meaningfulKeywords, keywordFreq, totalCommits);
    }

    // Cluster commits using simple hierarchical clustering
    const clusters = this.clusterByCosineSimilarity(
      commitKeywords,
      this.config.semanticSimilarityThreshold
    );

    // Convert clusters to groups
    return clusters
      .filter(cluster => cluster.length >= this.config.minGroupSize)
      .map((cluster, index) => {
        const clusterCommits = cluster.map(item => item.commit);
        const commonKeywords = this.findCommonKeywords(cluster);

        return {
          id: `semantic-${index + 1}`,
          name: this.generateSemanticGroupName(commonKeywords, clusterCommits),
          displayName: this.generateSemanticGroupName(commonKeywords, clusterCommits),
          type: 'semantic',
          strategy: 'semantic',
          commits: clusterCommits,
          keywords: commonKeywords,
          confidence: 0.6,
          dateRange: this.calculateDateRange(clusterCommits),
          metadata: {
            keywordCount: commonKeywords.length,
            avgSimilarity: this.calculateAverageSimilarity(cluster)
          }
        };
      });
  }

  /**
   * Auto-group commits using a combination of strategies
   * @param {Array} commits - Parsed commits
   * @returns {Array} Groups
   */
  autoGroup(commits) {
    const allGroups = [];
    const assignedCommits = new Set();

    // Priority 1: Group by ticket (highest confidence)
    const ticketGroups = this.groupByTicket(commits);
    for (const group of ticketGroups) {
      if (group.commits.length >= this.config.minGroupSize) {
        allGroups.push({ ...group, priority: 1 });
        for (const commit of group.commits) {
          assignedCommits.add(commit.hash);
        }
      }
    }

    // Priority 2: Group by branch (for remaining commits)
    const remainingForBranch = commits.filter(c => !assignedCommits.has(c.hash));
    const branchGroups = this.groupByBranch(remainingForBranch);
    for (const group of branchGroups) {
      if (group.commits.length >= this.config.minGroupSize) {
        allGroups.push({ ...group, priority: 2 });
        for (const commit of group.commits) {
          assignedCommits.add(commit.hash);
        }
      }
    }

    // Priority 3: Group by scope (for remaining commits)
    const remainingForScope = commits.filter(c => !assignedCommits.has(c.hash));
    const scopeGroups = this.groupByScope(remainingForScope);
    for (const group of scopeGroups) {
      if (group.commits.length >= this.config.minGroupSize) {
        allGroups.push({ ...group, priority: 3 });
        for (const commit of group.commits) {
          assignedCommits.add(commit.hash);
        }
      }
    }

    // Priority 4: Semantic grouping (for remaining commits)
    const remainingForSemantic = commits.filter(c => !assignedCommits.has(c.hash));
    if (remainingForSemantic.length > 1) {
      const semanticGroups = this.groupBySemantic(remainingForSemantic);
      for (const group of semanticGroups) {
        if (group.commits.length >= this.config.minGroupSize) {
          allGroups.push({ ...group, priority: 4 });
          for (const commit of group.commits) {
            assignedCommits.add(commit.hash);
          }
        }
      }
    }

    // Sort by priority, then by commit count
    allGroups.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return b.commits.length - a.commits.length;
    });

    return allGroups;
  }

  /**
   * Extract keywords from a commit
   * @param {Object} commit - Parsed commit
   * @returns {Array} Keywords
   */
  extractKeywords(commit) {
    const text = `${commit.subject} ${commit.body || ''}`.toLowerCase();

    // Tokenize
    const words = text
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Remove stop words and duplicates
    const keywords = [...new Set(words.filter(word => !this.stopWords.has(word)))];

    // Add file-based keywords
    if (commit.filesChanged) {
      for (const file of commit.filesChanged) {
        const pathParts = file.split('/').filter(p => p.length > 2);
        for (const part of pathParts) {
          const cleanPart = part.replace(/\.[^.]+$/, '').toLowerCase();
          if (cleanPart.length > 2 && !this.stopWords.has(cleanPart)) {
            keywords.push(cleanPart);
          }
        }
      }
    }

    return keywords;
  }

  /**
   * Create TF-IDF vector for a commit
   * @param {Array} keywords - Commit keywords
   * @param {Array} vocabulary - All meaningful keywords
   * @param {Map} docFreq - Document frequency map
   * @param {number} totalDocs - Total number of documents
   * @returns {Map} TF-IDF vector
   */
  createTfIdfVector(keywords, vocabulary, docFreq, totalDocs) {
    const vector = new Map();
    const keywordCount = keywords.length;

    for (const word of vocabulary) {
      const tf = keywords.filter(k => k === word).length / (keywordCount || 1);
      const idf = Math.log(totalDocs / (docFreq.get(word) || 1));
      vector.set(word, tf * idf);
    }

    return vector;
  }

  /**
   * Cluster commits by cosine similarity
   * @param {Array} items - Items with vectors
   * @param {number} threshold - Similarity threshold
   * @returns {Array} Clusters
   */
  clusterByCosineSimilarity(items, threshold) {
    const clusters = [];
    const assigned = new Set();

    for (let i = 0; i < items.length; i++) {
      if (assigned.has(i)) continue;

      const cluster = [items[i]];
      assigned.add(i);

      for (let j = i + 1; j < items.length; j++) {
        if (assigned.has(j)) continue;

        const similarity = this.cosineSimilarity(items[i].vector, items[j].vector);
        if (similarity >= threshold) {
          cluster.push(items[j]);
          assigned.add(j);
        }
      }

      clusters.push(cluster);
    }

    return clusters;
  }

  /**
   * Calculate cosine similarity between two vectors
   * @param {Map} v1 - First vector
   * @param {Map} v2 - Second vector
   * @returns {number} Similarity score (0-1)
   */
  cosineSimilarity(v1, v2) {
    if (!v1 || !v2) return 0;

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (const [key, val1] of v1) {
      const val2 = v2.get(key) || 0;
      dotProduct += val1 * val2;
      norm1 += val1 * val1;
    }

    for (const [_, val2] of v2) {
      norm2 += val2 * val2;
    }

    const denominator = Math.sqrt(norm1) * Math.sqrt(norm2);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Find common keywords in a cluster
   * @param {Array} cluster - Cluster of items
   * @returns {Array} Common keywords
   */
  findCommonKeywords(cluster) {
    const keywordCounts = new Map();

    for (const item of cluster) {
      const seen = new Set();
      for (const keyword of item.keywords) {
        if (!seen.has(keyword)) {
          seen.add(keyword);
          keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
        }
      }
    }

    const threshold = cluster.length * 0.5;
    return Array.from(keywordCounts.entries())
      .filter(([_, count]) => count >= threshold)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);
  }

  /**
   * Generate a name for a semantic group
   * @param {Array} keywords - Common keywords
   * @param {Array} commits - Commits in the group
   * @returns {string} Group name
   */
  generateSemanticGroupName(keywords, commits) {
    if (keywords.length > 0) {
      const topKeywords = keywords.slice(0, 3);
      return topKeywords.map(k => k.charAt(0).toUpperCase() + k.slice(1)).join(' ');
    }

    // Fallback to commit type analysis
    const types = commits
      .filter(c => c.conventional?.type)
      .map(c => c.conventional.type);

    const primaryType = this.getMostCommon(types);
    return primaryType ? `${primaryType.charAt(0).toUpperCase() + primaryType.slice(1)} Changes` : 'Related Changes';
  }

  /**
   * Calculate average similarity within a cluster
   * @param {Array} cluster - Cluster of items
   * @returns {number} Average similarity
   */
  calculateAverageSimilarity(cluster) {
    if (cluster.length < 2) return 1;

    let totalSimilarity = 0;
    let count = 0;

    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        totalSimilarity += this.cosineSimilarity(cluster[i].vector, cluster[j].vector);
        count++;
      }
    }

    return count > 0 ? totalSimilarity / count : 0;
  }

  /**
   * Calculate date range for a group of commits
   * @param {Array} commits - Commits
   * @returns {Object} Date range
   */
  calculateDateRange(commits) {
    if (commits.length === 0) {
      return { earliest: null, latest: null, durationDays: 0 };
    }

    const dates = commits
      .map(c => new Date(c.date))
      .filter(d => !isNaN(d.getTime()));

    if (dates.length === 0) {
      return { earliest: null, latest: null, durationDays: 0 };
    }

    const earliest = new Date(Math.min(...dates));
    const latest = new Date(Math.max(...dates));
    const durationDays = Math.ceil((latest - earliest) / (1000 * 60 * 60 * 24));

    return {
      earliest: earliest.toISOString(),
      latest: latest.toISOString(),
      durationDays
    };
  }

  /**
   * Calculate group statistics
   * @param {Array} groups - Groups
   * @returns {Object} Statistics
   */
  calculateGroupStatistics(groups) {
    const stats = {
      totalGroups: groups.length,
      byStrategy: {},
      byType: {},
      avgGroupSize: 0,
      largestGroup: null,
      smallestGroup: null
    };

    let totalCommits = 0;

    for (const group of groups) {
      const strategy = group.strategy || 'unknown';
      const type = group.type || 'unknown';

      stats.byStrategy[strategy] = (stats.byStrategy[strategy] || 0) + 1;
      stats.byType[type] = (stats.byType[type] || 0) + 1;

      totalCommits += group.commits.length;

      if (!stats.largestGroup || group.commits.length > stats.largestGroup.size) {
        stats.largestGroup = { name: group.name, size: group.commits.length };
      }

      if (!stats.smallestGroup || group.commits.length < stats.smallestGroup.size) {
        stats.smallestGroup = { name: group.name, size: group.commits.length };
      }
    }

    stats.avgGroupSize = groups.length > 0 ? totalCommits / groups.length : 0;

    return stats;
  }

  /**
   * Get primary commit type from a list of commits
   * @param {Array} commits - Commits
   * @returns {string} Primary type
   */
  getPrimaryCommitType(commits) {
    const types = commits
      .filter(c => c.conventional?.type)
      .map(c => c.conventional.type);

    return this.getMostCommon(types) || 'other';
  }

  /**
   * Get most common element in an array
   * @param {Array} arr - Array
   * @returns {*} Most common element
   */
  getMostCommon(arr) {
    if (arr.length === 0) return null;

    const counts = {};
    for (const item of arr) {
      counts[item] = (counts[item] || 0) + 1;
    }

    return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  }

  /**
   * Format branch name for display
   * @param {string} branchName - Branch name
   * @returns {string} Formatted name
   */
  formatBranchName(branchName) {
    return branchName
      .replace(/^(feature|fix|hotfix|refactor|chore|docs)\//, '')
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Format scope name for display
   * @param {string} scope - Scope
   * @returns {string} Formatted scope
   */
  formatScopeName(scope) {
    return scope
      .replace(/[-_]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  /**
   * Sanitize ID for safe usage
   * @param {string} str - String to sanitize
   * @returns {string} Sanitized string
   */
  sanitizeId(str) {
    return str
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  }

  /**
   * Generate a feature ID from group data
   * @param {Object} group - Feature group
   * @param {number} index - Index for uniqueness
   * @returns {string} Feature ID
   */
  generateFeatureId(group, index) {
    const prefix = {
      ticket: 'TKT',
      branch: 'BR',
      scope: 'SCP',
      semantic: 'SEM',
      ungrouped: 'UNG'
    }[group.type] || 'FTR';

    const suffix = group.name
      ? this.sanitizeId(group.name).substring(0, 15).toUpperCase()
      : String(index).padStart(3, '0');

    return `${prefix}-${suffix}`;
  }
}

module.exports = FeatureGrouper;
