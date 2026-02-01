/**
 * Feature Documenter Skill
 *
 * Generates comprehensive Markdown documentation from feature groups.
 * Creates:
 * - Individual feature documents
 * - Feature index with links
 * - Chronological timeline
 * - Summary statistics
 *
 * Output directory: maestro/features/
 */

const fs = require('fs');
const path = require('path');

class FeatureDocumenter {
  constructor(config = {}) {
    this.config = {
      maestroDir: config.maestroDir || 'maestro',
      featuresDir: config.featuresDir || 'features',
      generateIndex: config.generateIndex !== false,
      generateTimeline: config.generateTimeline !== false,
      includeCommitDetails: config.includeCommitDetails !== false,
      maxCommitsInDoc: config.maxCommitsInDoc || 50,
      ...config
    };

    // Feature type to icon mapping
    this.typeIcons = {
      feature: '✨',
      bugfix: '🐛',
      refactor: '♻️',
      chore: '🔧',
      docs: '📚',
      release: '🚀',
      performance: '⚡',
      security: '🔒',
      other: '📦'
    };

    // Status icons
    this.statusIcons = {
      completed: '✅',
      'in-progress': '🔄',
      pending: '⏳',
      blocked: '🚫'
    };
  }

  /**
   * Get the features directory path
   * @returns {string} Path to features directory
   */
  getFeaturesPath() {
    return path.join(this.config.maestroDir, this.config.featuresDir);
  }

  /**
   * Ensure features directory exists
   */
  ensureDirectory() {
    const featuresPath = this.getFeaturesPath();
    if (!fs.existsSync(featuresPath)) {
      fs.mkdirSync(featuresPath, { recursive: true });
    }
  }

  /**
   * Generate all feature documentation
   * @param {Object} groupResult - Result from FeatureGrouper
   * @param {Object} options - Generation options
   * @returns {Object} Generation result
   */
  generateDocumentation(groupResult, options = {}) {
    this.ensureDirectory();

    const result = {
      success: true,
      featuresDir: this.getFeaturesPath(),
      documents: [],
      indexPath: null,
      timelinePath: null,
      statistics: {
        featuresDocumented: 0,
        totalCommits: 0,
        errors: []
      }
    };

    try {
      // Generate individual feature documents
      for (let i = 0; i < groupResult.groups.length; i++) {
        const group = groupResult.groups[i];

        // Skip ungrouped if requested
        if (group.type === 'ungrouped' && options.skipUngrouped) {
          continue;
        }

        try {
          const featureDoc = this.generateFeatureDoc(group, i + 1, options);
          result.documents.push(featureDoc);
          result.statistics.featuresDocumented++;
          result.statistics.totalCommits += group.commits.length;
        } catch (error) {
          result.statistics.errors.push({
            feature: group.name,
            error: error.message
          });
        }
      }

      // Generate index if enabled
      if (this.config.generateIndex) {
        result.indexPath = this.generateIndex(groupResult.groups, result.documents, options);
      }

      // Generate timeline if enabled
      if (this.config.generateTimeline) {
        result.timelinePath = this.generateTimeline(groupResult.groups, options);
      }

    } catch (error) {
      result.success = false;
      result.error = error.message;
    }

    return result;
  }

  /**
   * Generate a single feature document
   * @param {Object} group - Feature group
   * @param {number} index - Feature index
   * @param {Object} options - Options
   * @returns {Object} Document result
   */
  generateFeatureDoc(group, index, options = {}) {
    const featureId = this.generateFeatureId(group, index);
    const fileName = `${featureId}-${this.sanitizeFileName(group.name)}.md`;
    const filePath = path.join(this.getFeaturesPath(), fileName);

    const content = this.buildFeatureMarkdown(group, featureId, options);

    fs.writeFileSync(filePath, content, 'utf8');

    return {
      id: featureId,
      name: group.name,
      fileName,
      filePath,
      commitCount: group.commits.length,
      type: this.inferFeatureType(group)
    };
  }

  /**
   * Build markdown content for a feature
   * @param {Object} group - Feature group
   * @param {string} featureId - Feature ID
   * @param {Object} options - Options
   * @returns {string} Markdown content
   */
  buildFeatureMarkdown(group, featureId, options) {
    const lines = [];
    const featureType = this.inferFeatureType(group);
    const icon = this.typeIcons[featureType] || this.typeIcons.other;

    // Header
    lines.push(`# ${icon} Feature: ${group.displayName || group.name}`);
    lines.push('');

    // Metadata table
    lines.push('| Property | Value |');
    lines.push('|----------|-------|');
    lines.push(`| **ID** | ${featureId} |`);
    lines.push(`| **Type** | ${this.capitalizeFirst(featureType)} |`);
    lines.push(`| **Status** | Completed |`);
    lines.push(`| **Strategy** | ${this.capitalizeFirst(group.strategy || 'auto')} |`);

    if (group.dateRange) {
      lines.push(`| **Date Range** | ${this.formatDate(group.dateRange.earliest)} → ${this.formatDate(group.dateRange.latest)} |`);
      lines.push(`| **Duration** | ${group.dateRange.durationDays} days |`);
    }

    lines.push(`| **Commits** | ${group.commits.length} |`);
    lines.push(`| **Files Changed** | ${this.countTotalFiles(group.commits)} |`);

    if (group.confidence) {
      lines.push(`| **Confidence** | ${Math.round(group.confidence * 100)}% |`);
    }

    lines.push('');

    // Summary section
    lines.push('## Summary');
    lines.push('');
    lines.push(this.generateFeatureSummary(group));
    lines.push('');

    // Ticket references if applicable
    if (group.allTickets && group.allTickets.length > 0) {
      lines.push('## Related Tickets');
      lines.push('');
      for (const ticket of group.allTickets) {
        lines.push(`- ${ticket}`);
      }
      lines.push('');
    }

    // Changes table
    lines.push('## Changes');
    lines.push('');
    lines.push(this.buildChangesTable(group.commits, options));
    lines.push('');

    // Key files section
    const keyFiles = this.identifyKeyFiles(group.commits);
    if (keyFiles.length > 0) {
      lines.push('## Key Files');
      lines.push('');
      for (const file of keyFiles) {
        lines.push(`- \`${file.path}\` - ${file.changes} changes`);
      }
      lines.push('');
    }

    // Authors section
    const authors = this.getAuthors(group.commits);
    if (authors.length > 0) {
      lines.push('## Contributors');
      lines.push('');
      for (const author of authors) {
        lines.push(`- **${author.name}** - ${author.commits} commits`);
      }
      lines.push('');
    }

    // Breaking changes
    const breakingChanges = group.commits.filter(c => c.isBreaking);
    if (breakingChanges.length > 0) {
      lines.push('## ⚠️ Breaking Changes');
      lines.push('');
      for (const commit of breakingChanges) {
        lines.push(`- ${commit.shortHash}: ${commit.conventional?.description || commit.subject}`);
        if (commit.body) {
          const breakingNote = this.extractBreakingNote(commit.body);
          if (breakingNote) {
            lines.push(`  - ${breakingNote}`);
          }
        }
      }
      lines.push('');
    }

    // Keywords if semantic grouping
    if (group.keywords && group.keywords.length > 0) {
      lines.push('## Keywords');
      lines.push('');
      lines.push(`*${group.keywords.join(', ')}*`);
      lines.push('');
    }

    // Footer
    lines.push('---');
    lines.push('');
    lines.push(`*Generated from git history on ${new Date().toISOString()}*`);
    lines.push(`*Strategy: ${group.strategy} | Source: ${group.type}*`);

    return lines.join('\n');
  }

  /**
   * Generate feature summary from commits
   * @param {Object} group - Feature group
   * @returns {string} Summary text
   */
  generateFeatureSummary(group) {
    const commits = group.commits;
    const types = new Map();
    const scopes = new Set();

    for (const commit of commits) {
      if (commit.conventional?.type) {
        types.set(commit.conventional.type, (types.get(commit.conventional.type) || 0) + 1);
      }
      if (commit.conventional?.scope) {
        scopes.add(commit.conventional.scope);
      }
    }

    const parts = [];

    // Describe the work type distribution
    const sortedTypes = Array.from(types.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedTypes.length > 0) {
      const typeDescriptions = sortedTypes.slice(0, 3).map(([type, count]) => {
        const label = {
          feat: 'feature additions',
          fix: 'bug fixes',
          refactor: 'refactoring',
          perf: 'performance improvements',
          docs: 'documentation updates',
          test: 'test additions',
          chore: 'maintenance tasks'
        }[type] || type;
        return `${count} ${label}`;
      });

      parts.push(`This feature includes ${typeDescriptions.join(', ')}.`);
    }

    // Describe scope
    if (scopes.size > 0) {
      const scopeList = Array.from(scopes).slice(0, 5).join(', ');
      parts.push(`Primary areas affected: ${scopeList}.`);
    }

    // Describe timeline
    if (group.dateRange && group.dateRange.durationDays > 0) {
      parts.push(`Work spanned ${group.dateRange.durationDays} days.`);
    }

    // Fallback if no conventional commits
    if (parts.length === 0) {
      const firstCommit = commits[0];
      const lastCommit = commits[commits.length - 1];
      parts.push(`Contains ${commits.length} commits from ${lastCommit?.shortHash} to ${firstCommit?.shortHash}.`);
    }

    return parts.join(' ');
  }

  /**
   * Build changes table for commits
   * @param {Array} commits - Commits
   * @param {Object} options - Options
   * @returns {string} Markdown table
   */
  buildChangesTable(commits, options = {}) {
    const lines = [];
    lines.push('| Commit | Type | Description | Files |');
    lines.push('|--------|------|-------------|-------|');

    const displayCommits = commits.slice(0, this.config.maxCommitsInDoc);

    for (const commit of displayCommits) {
      const type = commit.conventional?.type || 'other';
      const description = this.truncate(
        commit.conventional?.description || commit.subject,
        60
      );
      const fileCount = commit.filesChanged?.length || 0;

      lines.push(`| ${commit.shortHash} | ${type} | ${description} | ${fileCount} |`);
    }

    if (commits.length > this.config.maxCommitsInDoc) {
      lines.push(`| ... | | *${commits.length - this.config.maxCommitsInDoc} more commits* | |`);
    }

    return lines.join('\n');
  }

  /**
   * Identify key files from commits
   * @param {Array} commits - Commits
   * @returns {Array} Key files with change counts
   */
  identifyKeyFiles(commits) {
    const fileCounts = new Map();

    for (const commit of commits) {
      for (const file of (commit.filesChanged || [])) {
        fileCounts.set(file, (fileCounts.get(file) || 0) + 1);
      }
    }

    return Array.from(fileCounts.entries())
      .map(([path, changes]) => ({ path, changes }))
      .sort((a, b) => b.changes - a.changes)
      .slice(0, 10);
  }

  /**
   * Get unique authors from commits
   * @param {Array} commits - Commits
   * @returns {Array} Authors with commit counts
   */
  getAuthors(commits) {
    const authors = new Map();

    for (const commit of commits) {
      const name = commit.author?.name || 'Unknown';
      const existing = authors.get(name) || { name, commits: 0 };
      existing.commits++;
      authors.set(name, existing);
    }

    return Array.from(authors.values())
      .sort((a, b) => b.commits - a.commits);
  }

  /**
   * Extract breaking change note from commit body
   * @param {string} body - Commit body
   * @returns {string|null} Breaking change note
   */
  extractBreakingNote(body) {
    const match = body.match(/BREAKING\s*CHANGE[:\s]*(.+?)(?:\n\n|$)/is);
    return match ? match[1].trim() : null;
  }

  /**
   * Generate feature index
   * @param {Array} groups - Feature groups
   * @param {Array} documents - Generated documents
   * @param {Object} options - Options
   * @returns {string} Index file path
   */
  generateIndex(groups, documents, options) {
    const indexPath = path.join(this.getFeaturesPath(), 'index.md');
    const lines = [];

    lines.push('# Feature Index');
    lines.push('');
    lines.push(`> Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Statistics
    lines.push('## Overview');
    lines.push('');
    lines.push('| Metric | Count |');
    lines.push('|--------|-------|');
    lines.push(`| Total Features | ${documents.length} |`);
    lines.push(`| Total Commits | ${groups.reduce((sum, g) => sum + g.commits.length, 0)} |`);

    // Count by type
    const typeCounts = {};
    for (const doc of documents) {
      typeCounts[doc.type] = (typeCounts[doc.type] || 0) + 1;
    }

    for (const [type, count] of Object.entries(typeCounts)) {
      const icon = this.typeIcons[type] || '';
      lines.push(`| ${icon} ${this.capitalizeFirst(type)} | ${count} |`);
    }
    lines.push('');

    // Group documents by type
    const byType = {};
    for (const doc of documents) {
      const type = doc.type || 'other';
      if (!byType[type]) byType[type] = [];
      byType[type].push(doc);
    }

    // List by type
    for (const [type, typeDocs] of Object.entries(byType)) {
      const icon = this.typeIcons[type] || this.typeIcons.other;
      lines.push(`## ${icon} ${this.capitalizeFirst(type)} Features`);
      lines.push('');

      for (const doc of typeDocs) {
        lines.push(`- [${doc.name}](./${doc.fileName}) - ${doc.commitCount} commits`);
      }
      lines.push('');
    }

    // Quick links
    lines.push('## Quick Links');
    lines.push('');
    lines.push('- [Timeline](./timeline.md)');
    lines.push('- [ADRs](../decisions/index.md)');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Auto-generated from git history*');

    fs.writeFileSync(indexPath, lines.join('\n'), 'utf8');
    return indexPath;
  }

  /**
   * Generate chronological timeline
   * @param {Array} groups - Feature groups
   * @param {Object} options - Options
   * @returns {string} Timeline file path
   */
  generateTimeline(groups, options) {
    const timelinePath = path.join(this.getFeaturesPath(), 'timeline.md');
    const lines = [];

    // Sort groups by date
    const sortedGroups = [...groups]
      .filter(g => g.dateRange?.earliest)
      .sort((a, b) => new Date(a.dateRange.earliest) - new Date(b.dateRange.earliest));

    lines.push('# Feature Timeline');
    lines.push('');
    lines.push(`> Generated: ${new Date().toISOString()}`);
    lines.push('');

    // Group by month
    const byMonth = new Map();
    for (const group of sortedGroups) {
      const date = new Date(group.dateRange.earliest);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!byMonth.has(monthKey)) {
        byMonth.set(monthKey, []);
      }
      byMonth.get(monthKey).push(group);
    }

    // Generate timeline
    for (const [monthKey, monthGroups] of byMonth) {
      const [year, month] = monthKey.split('-');
      const monthName = new Date(year, month - 1, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      lines.push(`## ${monthName}`);
      lines.push('');

      for (const group of monthGroups) {
        const featureType = this.inferFeatureType(group);
        const icon = this.typeIcons[featureType] || this.typeIcons.other;
        const date = this.formatDate(group.dateRange.earliest);
        const fileName = `${this.generateFeatureId(group, 1)}-${this.sanitizeFileName(group.name)}.md`;

        lines.push(`### ${icon} ${date} - ${group.displayName || group.name}`);
        lines.push('');
        lines.push(`- **Type**: ${this.capitalizeFirst(featureType)}`);
        lines.push(`- **Commits**: ${group.commits.length}`);
        lines.push(`- **Duration**: ${group.dateRange.durationDays} days`);
        lines.push(`- [View Details](./${fileName})`);
        lines.push('');
      }
    }

    // Mermaid diagram for visual timeline
    lines.push('## Visual Timeline');
    lines.push('');
    lines.push('```mermaid');
    lines.push('gantt');
    lines.push('    title Feature Development Timeline');
    lines.push('    dateFormat YYYY-MM-DD');

    for (const group of sortedGroups.slice(0, 20)) {
      const featureType = this.inferFeatureType(group);
      const name = (group.displayName || group.name).substring(0, 30);
      const id = this.sanitizeFileName(group.name).substring(0, 15);
      const start = group.dateRange.earliest.split('T')[0];
      const duration = Math.max(1, group.dateRange.durationDays);

      lines.push(`    ${name} :${id}, ${start}, ${duration}d`);
    }

    lines.push('```');
    lines.push('');

    lines.push('---');
    lines.push('');
    lines.push('*Auto-generated from git history*');

    fs.writeFileSync(timelinePath, lines.join('\n'), 'utf8');
    return timelinePath;
  }

  /**
   * Infer feature type from group
   * @param {Object} group - Feature group
   * @returns {string} Feature type
   */
  inferFeatureType(group) {
    // Check branch type first
    if (group.branchType && group.branchType !== 'other') {
      return group.branchType;
    }

    // Check primary commit type
    const typeCounts = new Map();
    for (const commit of group.commits) {
      if (commit.conventional?.type) {
        const type = commit.conventional.type;
        typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
      }
    }

    if (typeCounts.size > 0) {
      const sorted = Array.from(typeCounts.entries()).sort((a, b) => b[1] - a[1]);
      const primaryType = sorted[0][0];

      const typeMapping = {
        feat: 'feature',
        fix: 'bugfix',
        refactor: 'refactor',
        perf: 'performance',
        docs: 'docs',
        chore: 'chore',
        test: 'feature',
        style: 'chore',
        ci: 'chore',
        build: 'chore'
      };

      return typeMapping[primaryType] || 'other';
    }

    return 'other';
  }

  /**
   * Generate feature ID
   * @param {Object} group - Feature group
   * @param {number} index - Index
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
      ? this.sanitizeFileName(group.name).substring(0, 10).toUpperCase()
      : String(index).padStart(3, '0');

    return `${prefix}-${suffix}`;
  }

  /**
   * Count total files changed across commits
   * @param {Array} commits - Commits
   * @returns {number} Total unique files
   */
  countTotalFiles(commits) {
    const files = new Set();
    for (const commit of commits) {
      for (const file of (commit.filesChanged || [])) {
        files.add(file);
      }
    }
    return files.size;
  }

  /**
   * Format date for display
   * @param {string} dateStr - ISO date string
   * @returns {string} Formatted date
   */
  formatDate(dateStr) {
    if (!dateStr) return 'Unknown';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  /**
   * Truncate string with ellipsis
   * @param {string} str - String to truncate
   * @param {number} maxLength - Maximum length
   * @returns {string} Truncated string
   */
  truncate(str, maxLength) {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength - 3) + '...';
  }

  /**
   * Sanitize file name
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
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

module.exports = FeatureDocumenter;
