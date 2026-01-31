---
name: kb-search
description: Search the Knowledge System for decisions, patterns, and other entries
usage: /maestro:kb-search <query> [options]
aliases: [knowledge-search, kbsearch, ksearch]
---

# /maestro:kb-search Command

Search the Knowledge System to find relevant decisions, patterns, entities, blockers, and other captured knowledge.

## What It Does

1. **Full-text search** across all knowledge entries
2. **Type filtering** - Search only specific types (decisions, patterns, etc.)
3. **Domain filtering** - Search within specific domains
4. **Tag-based search** - Find entries by tags
5. **Relevance ranking** - Results sorted by relevance score
6. **Context display** - Shows surrounding context for each result

## Usage

```bash
# Basic search
/maestro:kb-search authentication

# Search with type filter
/maestro:kb-search "rate limiting" --type decision

# Search by domain
/maestro:kb-search "caching" --domain backend

# Search by tags
/maestro:kb-search --tags security,performance

# Search with confidence threshold
/maestro:kb-search "database" --min-confidence 0.7

# Full entry details
/maestro:kb-search "user service" --verbose

# JSON output
/maestro:kb-search "api design" --json
```

## Options

| Option | Description |
|--------|-------------|
| `--type <type>` | Filter by type: decision, pattern, entity, todo, blocker, research |
| `--domain <domain>` | Filter by domain: frontend, backend, database, security, etc. |
| `--tags <tags>` | Filter by tags (comma-separated) |
| `--min-confidence <n>` | Minimum confidence score (0.0-1.0) |
| `--since <date>` | Only entries after this date |
| `--limit <n>` | Maximum results (default: 20) |
| `--verbose` | Show full entry details |
| `--json` | Output as JSON |
| `--branch <name>` | Search specific branch knowledge |

## Output Format

```
══════════════════════════════════════════════════════════
  KNOWLEDGE SEARCH RESULTS
══════════════════════════════════════════════════════════

Query: "authentication"
Found: 12 results (showing top 10)
Branch: main

──────────────────────────────────────────────────────────

1. [DECISION] Use JWT for API Authentication (95% match)
   ID: dec_lq8m2_a3f7b2c1
   Confidence: 0.85 | Domain: security
   Tags: jwt, auth, api

   Decision: Implement JWT-based authentication with refresh
   tokens for the REST API...

   Created: 2024-01-15 | Last used: 2024-01-30

──────────────────────────────────────────────────────────

2. [PATTERN] Token Refresh Pattern (87% match)
   ID: pat_lq8m3_b4e8c3d2
   Confidence: 0.78 | Domain: security
   Tags: jwt, refresh, pattern

   Problem: JWT tokens expire and need seamless renewal
   Solution: Implement silent refresh using httpOnly cookies...

   Created: 2024-01-16 | Used: 5 times

──────────────────────────────────────────────────────────

3. [ENTITY] AuthService (82% match)
   ID: ent_lq8m4_c5f9d4e3
   Type: service | Location: src/services/auth/

   Handles user authentication, token generation, and
   session management...

──────────────────────────────────────────────────────────

[... more results ...]

══════════════════════════════════════════════════════════
  TIP: Use --verbose for full entry details
══════════════════════════════════════════════════════════
```

## Search Tips

### Effective Queries

```bash
# Specific technical terms
/maestro:kb-search "database connection pooling"

# Problem-oriented
/maestro:kb-search "slow query" --type blocker

# Decision history
/maestro:kb-search "chose" --type decision

# Find related patterns
/maestro:kb-search "validation" --type pattern
```

### Combining Filters

```bash
# High-confidence backend decisions
/maestro:kb-search "api" --type decision --domain backend --min-confidence 0.8

# Recent security-related entries
/maestro:kb-search "security" --since 2024-01-01 --tags security
```

## Implementation Protocol

When this command is invoked, follow this protocol:

### Step 1: Parse Query and Options

```
1. Extract search term from arguments
2. Parse filter options (type, domain, tags, etc.)
3. Set defaults for limit and confidence
```

### Step 2: Execute Search

```javascript
const KnowledgeStore = require('./skills/knowledge-store');
const store = new KnowledgeStore({ maestroDir: 'maestro' });

// Full-text search with options
const results = store.search(query, {
  type: options.type,
  limit: options.limit || 20,
  fullEntries: true
}, branch);

// If filtering by domain/tags, use query
const filtered = store.query({
  domain: options.domain,
  tags: options.tags ? options.tags.split(',') : undefined,
  minConfidence: options.minConfidence,
  since: options.since,
  fullEntries: true
}, branch);
```

### Step 3: Rank Results

```
1. Calculate relevance score for each result
2. Apply type-specific formatting
3. Sort by relevance (title match > tag match > content match)
4. Apply limit
```

### Step 4: Format Output

```
1. Display query and result count
2. Format each result with type indicator
3. Show key fields (title, confidence, domain, tags)
4. Include snippet of content
5. Show metadata (created, last used)
```

## Related Commands

- `/maestro:kb-status` - View knowledge statistics
- `/maestro:kb-capture` - Manually capture knowledge
- `/maestro:kb-generate` - Generate documentation
- `/maestro:cdd` - Activate CDD mode

---

## EXECUTION DIRECTIVE

When `/maestro:kb-search` is invoked:

1. **ALWAYS** require a search query (unless --tags provided)
2. **ALWAYS** display relevance scores
3. **ALWAYS** show type indicators for results
4. **ALWAYS** include actionable IDs for further reference

### Quick Search Function

```javascript
// Quick search implementation
function searchKnowledge(query, options = {}) {
  const KnowledgeStore = require('./skills/knowledge-store');
  const store = new KnowledgeStore({ maestroDir: 'maestro' });

  const branch = options.branch || getCurrentGitBranch();

  // Search
  const results = store.search(query, {
    type: options.type,
    limit: options.limit || 20,
    fullEntries: true
  }, branch);

  // Format and display
  return formatSearchResults(results, options);
}
```
