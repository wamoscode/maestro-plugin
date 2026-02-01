---
name: hydrate
description: Hydrate knowledge system from git history - bootstrap decisions, patterns, and learnings from existing repository
usage: /maestro:hydrate [options]
aliases: [hydration, bootstrap-kb]
---

# /maestro:hydrate Command

Analyze existing git history (commits, PRs, branches) to bootstrap the Knowledge System with decisions, patterns, entities, and learnings extracted from your repository's development history.

**Use Cases:**
- Bootstrap the Knowledge System on existing projects
- Onboard new team members with project knowledge
- Create retrospective tracks from merged feature branches
- Recover knowledge from repositories with no prior CDD usage

## Invocation

```bash
# Interactive mode (recommended for first-time use)
/maestro:hydrate

# Quick modes
/maestro:hydrate --quick          # Last 6 months, git-only
/maestro:hydrate --full           # Full history, skip prompts

# Preview what would be extracted
/maestro:hydrate --preview
```

## Interactive Mode (Default)

When invoked without options, the command presents an interactive questionnaire:

### Step 1: Workspace Analysis

```
Analyzing workspace...

Workspace type: Multi-repository (3 repos detected)

+---------------+----------+---------+-----------------+
| Repository    | Type     | Commits | Date Range      |
+---------------+----------+---------+-----------------+
| frontend/     | main     | 1,234   | 2022-03 to now  |
| backend/      | submodule| 890     | 2022-06 to now  |
| shared-libs/  | submodule| 456     | 2023-01 to now  |
+---------------+----------+---------+-----------------+
Total: 2,580 commits
GitHub remotes: 3 detected
```

### Step 2: Repository Selection

```
Which repositories should be hydrated?

[1] All Repositories (Recommended)
    - Unified knowledge across frontend, backend, shared-libs
    - Detects cross-repo patterns and decisions
    - Impact: ~6 min for 2,580 commits

[2] Select Specific Repos
    - Choose which repos to include
    - Partial knowledge base

[3] Current Repo Only
    - Only frontend/ (1,234 commits)
    - Fastest, isolated knowledge
    - Impact: ~2.5 min
```

### Step 3: Data Source Options

```
Which data sources should be analyzed?

[1] Full Analysis (Recommended)
    - Git commits + GitHub PRs
    - Richest knowledge extraction
    - Requires: GITHUB_TOKEN
    - Impact: ~3-5 min for 2,847 commits

[2] Git Only (Offline)
    - Git commits only, no API calls
    - Works without network
    - Impact: ~1-2 min for 2,847 commits

[3] PRs Only
    - GitHub PRs and their discussions
    - Best for PR-centric workflows
    - Impact: ~2 min, API rate limits apply
```

### Step 4: Scope Options

```
How much history should be processed?

[1] Full History
    - All commits
    - Complete knowledge base

[2] Last 6 Months (Recommended for large repos)
    - ~650 commits estimated
    - Recent context focus

[3] Last Year
    - ~1,200 commits estimated
    - Balanced coverage

[4] Custom Date Range
    - Specify --since and --until

[5] Commit Limit
    - Process last N commits only
```

### Step 5: Knowledge Types

```
Which knowledge types to extract?

[x] Decisions - Architectural choices, breaking changes
[x] Patterns - Recurring approaches, refactoring patterns
[x] Entities - Services, components, APIs discovered
[x] Learnings - Bug fixes, reverts, lessons learned
[ ] Tracks - Create retrospective tracks from branches
```

### Step 6: Preview & Confirm

```
Ready to hydrate with these settings:
- Source: Git + GitHub PRs
- Scope: Full history (2,847 commits)
- Types: decisions, patterns, entities, learnings
- Estimated: ~5 min, ~120 entries

[P] Preview first (dry run)
[S] Start hydration
[C] Change settings
```

## Command Line Options

For scripting or experienced users:

### Mode Options

| Option | Description |
|--------|-------------|
| `--quick` | Last 6 months, git-only, minimal prompts |
| `--full` | Full history, all sources, skip prompts |
| `--preview` | Dry run - show what would be extracted |
| `--incremental` | Only process commits since last hydration |

### Data Source Options

| Option | Description |
|--------|-------------|
| `--git-only` | Skip GitHub API, use git commits only |
| `--prs-only` | Only analyze GitHub PRs (requires token) |
| `--include-github` | Include GitHub PR data (default) |

### Scope Options

| Option | Description |
|--------|-------------|
| `--since <date>` | Start date (ISO format or git ref) |
| `--until <date>` | End date (ISO format or git ref) |
| `--max-commits <n>` | Limit commits processed |
| `--branches <list>` | Specific branches to analyze |
| `--skip-merges` | Skip merge commits |

### Multi-Repo Options

| Option | Description |
|--------|-------------|
| `--all-repos` | Hydrate all repositories in workspace |
| `--repos <list>` | Specific repos to include |
| `--no-submodules` | Exclude git submodules |
| `--submodules-only` | Only process submodules |

### Output Options

| Option | Description |
|--------|-------------|
| `--create-tracks` | Generate tracks from merged branches |
| `--min-confidence <n>` | Minimum confidence threshold (0-1) |
| `--verbose` | Show detailed progress |

## Examples

```bash
# First-time hydration with interactive prompts
/maestro:hydrate

# Quick hydration of recent history
/maestro:hydrate --quick

# Full hydration with GitHub PRs
/maestro:hydrate --full --include-github

# Preview what would be extracted
/maestro:hydrate --preview

# Hydrate last 6 months
/maestro:hydrate --since 2024-07-01

# Hydrate specific branches
/maestro:hydrate --branches main,develop

# Skip merge commits for cleaner extraction
/maestro:hydrate --skip-merges

# Only frontend repo, last 500 commits
/maestro:hydrate --repos frontend --max-commits 500

# Incremental update (after initial hydration)
/maestro:hydrate --incremental

# Create retrospective tracks from merged feature branches
/maestro:hydrate --create-tracks
```

## Knowledge Extraction Rules

### Commit Type to Knowledge Mapping

| Commit Type | Primary Knowledge | Confidence |
|-------------|-------------------|------------|
| `feat!` / BREAKING | decision (high) | 0.85 |
| `feat` | entity, pattern | 0.7 |
| `fix` | learning, blocker | 0.6 |
| `refactor` | pattern, decision | 0.65 |
| `perf` | decision, learning | 0.7 |
| `revert` | learning | 0.75 |

### Decision Detection Patterns

Commits matching these patterns are extracted as decisions:

- "chose X over Y", "switched to X", "adopted X"
- "replaced X with Y", "migrated to X", "prefer X"
- Breaking changes (`feat!`, `BREAKING CHANGE`)
- PR titles with architectural keywords

### Entity Detection

New entities are discovered from file paths:

| Path Pattern | Entity Type |
|--------------|-------------|
| `services/*` | service |
| `components/*` | component |
| `api/*` | api |
| `models/*` | model |
| `hooks/*` | hook |
| `controllers/*` | controller |

### Pattern Detection

Patterns are detected from recurring commits:

- 3+ similar commits (same type+scope) = pattern
- Refactoring sequences = approach pattern
- Recurring fixes in same scope = recurring issue pattern

### Learning Generation

Learnings are extracted from:

- Bug fixes (`fix:`) = problem/solution learning
- Reverts = "what not to do" learning
- Hotfixes = critical issue learning

## Output

After hydration completes:

```markdown
## Hydration Complete

### Summary
- Commits processed: 2,847
- Time elapsed: 4m 32s
- Repositories: 3

### Knowledge Created
+------------+-------+
| Type       | Count |
+------------+-------+
| Decisions  | 45    |
| Patterns   | 23    |
| Entities   | 78    |
| Learnings  | 112   |
| Tracks     | 8     |
+------------+-------+
Total: 266 entries

### Top Decisions (by confidence)
1. Use TypeScript for frontend (0.92)
2. Adopt PostgreSQL over MongoDB (0.88)
3. Implement JWT authentication (0.85)

### Storage
Entries saved to: maestro/knowledge/
Hydration state: maestro/hydration/state.json
```

## Storage Structure

After hydration, knowledge is stored in:

```
maestro/
+-- hydration/
|   +-- state.json              # Hydration progress tracking
+-- knowledge/
|   +-- decisions/              # Extracted decisions
|   +-- patterns/               # Detected patterns
|   +-- entities/               # Discovered entities
|   +-- learnings/              # Bug fix learnings
|   +-- index.json              # Search index
+-- tracks/
    +-- HYDRATED-001/           # Retrospective tracks
        +-- metadata.json
        +-- spec.md
```

## Incremental Hydration

After initial hydration, running `--incremental` will:

1. Load state from `maestro/hydration/state.json`
2. Only process commits since `lastHydratedCommit`
3. Deduplicate against existing knowledge
4. Update state after completion

This is useful for keeping knowledge up-to-date without re-processing history.

## GitHub Integration

When `GITHUB_TOKEN` is available, hydration can:

- Fetch merged PR data (title, body, reviews)
- Extract decisions from PR discussions
- Link knowledge entries to PR numbers
- Capture review insights as learnings

**Setup:**
```bash
export GITHUB_TOKEN=your_token_here
```

**Graceful Fallback:**
If token is not available, hydration automatically switches to git-only mode with a notification.

## Multi-Repository Workspaces

For workspaces with multiple repos or submodules:

```
Analyzing workspace...
- Type: Multi-repo workspace
- Repositories found:
  - frontend/ (main repo, 1,234 commits)
  - backend/ (submodule, 890 commits)
  - shared-libs/ (submodule, 456 commits)
```

Cross-repository knowledge linking:

- Decisions affecting multiple repos are tagged with `crossRepoImpact: true`
- Related repos are tracked in entry context
- Unified index enables cross-repo search

## Troubleshooting

### No commits found
- Check that you're in a git repository
- Verify date range with `--since` and `--until`
- Check branch name with `--branches`

### GitHub API rate limiting
- Use `--git-only` to skip API calls
- Reduce scope with `--max-commits`
- Wait for rate limit reset

### Low knowledge extraction
- Try broader date range
- Ensure conventional commits are used
- Check `--min-confidence` threshold

### Duplicate entries
- Hydration automatically deduplicates
- For full re-hydration, delete `maestro/knowledge/`

## Related Commands

- `/maestro:cdd` - Activate CDD mode with hydrated knowledge
- `/maestro:kb-status` - View knowledge store statistics
- `/maestro:kb-search` - Search hydrated knowledge
- `/maestro:status` - View overall Maestro status

## MCP Tools

This command uses these MCP tools:

- `hydrate_knowledge` - Execute hydration with options
- `hydrate_status` - Get hydration status and progress

## Version History

- **v1.11** - Initial hydration feature
  - Multi-repository support
  - GitHub PR integration
  - Incremental hydration
  - Track generation from branches
