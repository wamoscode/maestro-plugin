---
name: kb-status
description: Display Knowledge System statistics and status
usage: /maestro:kb-status [options]
aliases: [knowledge-status, kbs]
---

# /maestro:kb-status Command

Display detailed statistics and status of the Knowledge System, including entry counts, recent activity, and health metrics.

## What It Shows

1. **Overall Statistics** - Total entries by type (decisions, patterns, entities, TODOs, etc.)
2. **Recent Activity** - Recently captured decisions and patterns
3. **Domain Distribution** - Knowledge breakdown by domain
4. **Pending Items** - TODOs and decisions needing review
5. **Session Status** - Current learning session info
6. **Health Metrics** - Index status, confidence scores

## Usage

```bash
# Full status overview
/maestro:kb-status

# Show pending TODOs
/maestro:kb-status --todos

# Show decisions needing review
/maestro:kb-status --review

# Show by domain
/maestro:kb-status --domain backend

# Compact output
/maestro:kb-status --compact

# JSON output
/maestro:kb-status --json
```

## Options

| Option | Description |
|--------|-------------|
| `--todos` | Focus on pending TODO items |
| `--review` | Show decisions past their review date |
| `--domain <name>` | Filter by specific domain |
| `--compact` | Minimal output format |
| `--verbose` | Include all details |
| `--json` | Output as JSON |
| `--branch <name>` | Check specific branch knowledge |

## Output Format

```
══════════════════════════════════════════════════════════
  KNOWLEDGE SYSTEM STATUS
══════════════════════════════════════════════════════════

Branch: main
Session: session-20240131-abc123 (active)
Last Updated: 2024-01-31 14:32:00

──────────────────────────────────────────────────────────
  STATISTICS
──────────────────────────────────────────────────────────

| Type       | Count | Recent (7d) |
|------------|-------|-------------|
| Decisions  | 23    | 5           |
| Patterns   | 12    | 2           |
| Entities   | 18    | 3           |
| TODOs      | 8     | 4           |
| Blockers   | 15    | 1           |
| Research   | 7     | 0           |
| Total      | 83    | 15          |

──────────────────────────────────────────────────────────
  PENDING ITEMS
──────────────────────────────────────────────────────────

TODOs (3 high priority):
  - Implement rate limiting [HIGH]
  - Add user preferences API [MEDIUM]
  - Update documentation [LOW]

Decisions Needing Review (1):
  - dec_abc123: Use JWT for auth (review due: 2024-01-30)

──────────────────────────────────────────────────────────
  BY DOMAIN
──────────────────────────────────────────────────────────

backend:     ████████████░░░░ 35%
frontend:    ████████░░░░░░░░ 25%
database:    ██████░░░░░░░░░░ 18%
security:    ████░░░░░░░░░░░░ 12%
other:       ███░░░░░░░░░░░░░ 10%

══════════════════════════════════════════════════════════
```

## Implementation Protocol

When this command is invoked, follow this protocol:

### Step 1: Initialize Knowledge Store

```
1. Load KnowledgeStore for current branch
2. Build/refresh index if needed
3. Check for active learning session
```

### Step 2: Gather Statistics

```javascript
// Get statistics
const stats = knowledgeStore.getStats(branch);

// Query for recent entries
const recentDecisions = knowledgeStore.query({
  type: 'decision',
  since: '7d',
  sortBy: 'metadata.createdAt',
  sortOrder: 'desc',
  limit: 5
});

// Get pending TODOs
const pendingTodos = knowledgeStore.query({
  type: 'todo',
  fullEntries: true
}).entries.filter(t => t.status !== 'done');

// Get decisions needing review
const reviewNeeded = knowledgeStore.query({
  type: 'decision',
  fullEntries: true
}).entries.filter(d => d.reviewDate && new Date(d.reviewDate) <= new Date());
```

### Step 3: Format Output

```
1. Build status header with branch and session info
2. Create statistics table
3. List pending items (TODOs, review-needed decisions)
4. Show domain distribution chart
5. Include session health metrics
```

### Step 4: Generate Summary if Requested

```
If --generate-summary flag:
  - Call knowledgeStore.generateSummary(branch)
  - Report summary file location
```

## Related Commands

- `/maestro:kb-search` - Search knowledge base
- `/maestro:kb-capture` - Manually capture knowledge
- `/maestro:kb-generate` - Generate documentation from knowledge
- `/maestro:cdd` - Activate CDD with Knowledge System

---

## EXECUTION DIRECTIVE

When `/maestro:kb-status` is invoked:

1. **ALWAYS** initialize or retrieve the KnowledgeStore
2. **ALWAYS** display formatted statistics
3. **ALWAYS** show pending items prominently
4. **ALWAYS** indicate if summary regeneration is available

### Quick Reference

```javascript
// Initialize
const KnowledgeStore = require('./skills/knowledge-store');
const store = new KnowledgeStore({ maestroDir: 'maestro' });

// Get current branch
const branch = getCurrentGitBranch();

// Build index and get stats
store.buildIndex(branch);
const stats = store.getStats(branch);

// Query for specific items
const todos = store.query({ type: 'todo', fullEntries: true }, branch);
const decisions = store.query({ type: 'decision', fullEntries: true }, branch);
```
