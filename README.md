# Maestro Plugin for Claude Code

A comprehensive orchestration plugin that bundles 40+ specialized sub-agents for intelligent task routing and multi-agent collaboration in Claude Code. Features **Context-Driven Development** methodology, **Knowledge Hydration**, **Multi-Branch Parallel Sessions**, and **Platform Sync** for external project management integration.

## Overview

Maestro acts as a master orchestrator—like a skilled conductor leading an orchestra—analyzing user tasks, determining the optimal sub-agent(s) to invoke, coordinating their execution (parallel or sequential), and synthesizing their results into cohesive deliverables.

**New in v1.13**: Enhanced Knowledge Hydration - smart commit grouping, auto-generated feature documentation, ADR detection, dependency tracking, and architecture pattern analysis.

**v1.12**: Knowledge Hydration - bootstrap your Knowledge System from existing git history.

**v1.11**: Added observability tools (health_check, kb_backup, kb_restore), diagram generation, and Notion adapter.

**v1.10**: Git Worktree Isolation - true physical branch isolation using Git worktrees. Each branch gets its own directory, enabling completely independent parallel work across multiple terminals.

**v1.9**: Context-Aware Learning System - captures decisions, research, and discoveries during workflow execution, builds knowledge over time, and uses accumulated knowledge to inform future tasks.

**v1.8**: Multi-Branch Parallel Sessions - multiple instances can work simultaneously on different git branches with proper isolation, session locking, and cross-session notifications.

**v1.6**: Platform Sync for bidirectional synchronization with ClickUp, Linear, Jira, Asana, Todoist, YouTrack, and more via API or MCP.

## Features

- **40+ Specialized Sub-Agents**: Organized into 10 categories covering all aspects of software development
- **Intelligent Task Routing**: Automatic analysis and routing to appropriate specialists
- **Parallel Execution**: Run independent agents simultaneously for faster results
- **Workflow Orchestration**: Define complex multi-step workflows with dependencies
- **Context-Driven Development**: Structured tracks with specs, plans, and checkpoints
- **Multi-Branch Parallel Sessions**: Multiple Claude instances working on different branches simultaneously
- **Git Worktree Isolation**: True physical isolation with separate directories per branch
- **Branch Isolation**: Each branch maintains its own tracks and context state
- **Session Locking**: Prevents concurrent modifications with clear conflict warnings
- **Cross-Session Notifications**: Get alerted when other sessions need attention
- **Platform Sync**: Bidirectional sync with ClickUp, Linear, Jira, Asana, Todoist, YouTrack
- **Multi-Project Workspaces**: Manage multiple repositories as a unified workspace
- **Git Submodule Support**: First-class handling of submodules with parent reference tracking
- **Cross-Project Tracks**: Features spanning multiple repositories with coordinated commits
- **Track Management**: Create, implement, and revert feature/bug tracks
- **Quality Gates**: Automated checkpoints and CI/CD integration
- **Impact Analysis**: Blast radius calculation and risk assessment
- **Track Archetypes**: Pre-built templates for common patterns (API, auth, migrations)
- **Context-Aware Learning**: Captures decisions and discoveries, uses past knowledge for future tasks
- **Knowledge Store**: Persistent storage for decisions, patterns, research, and learnings
- **Knowledge Injection**: Automatically enriches task context with relevant past knowledge
- **Knowledge Hydration**: Bootstrap knowledge from git history for existing projects
- **Workflow Templates**: TDD, Agile, and Minimal methodologies
- **Code Style Guides**: TypeScript, Python, Go, and Rust templates
- **Git Integration**: Commit tracking and git-aware revert functionality
- **MCP Integration**: Full Model Context Protocol support for advanced integrations

## Quick Start

### Context-Driven Development (Recommended)

For structured project management:

```bash
# 1. Initialize your project (first time only)
/maestro:setup

# 2. Activate CDD mode (start of every session)
/maestro:cdd

# 3. Create a feature track
/maestro:newTrack "Add user authentication with JWT"

# 4. Check status
/maestro:status

# 5. Implement the track
/maestro:implement

# 6. Revert if needed
/maestro:revert TRACK-001
```

### Quick Orchestration

For quick, untracked tasks:

```bash
/maestro Build a REST API for user management with authentication
```

## Commands

### Context-Driven Development Commands

| Command | Description |
|---------|-------------|
| `/maestro:cdd` | **Activate CDD mode** - loads context and enables sub-agent orchestration |
| `/maestro:setup` | Initialize project/workspace context |
| `/maestro:newTrack` | Create a new feature, bug, or chore track |
| `/maestro:status` | View project progress and track status |
| `/maestro:implement` | Execute track implementation with sub-agents |
| `/maestro:revert` | Git-aware rollback of tracks or tasks |
| `/maestro:sync` | Sync tracks with external platforms |
| `/maestro:dashboard` | Rich terminal dashboard with progress visualization |
| `/maestro:impact` | Analyze change impact and blast radius |
| `/maestro:stash` | Pause/resume tracks without reverting |
| `/maestro:quick` | Fast shortcuts for common CDD actions |
| `/maestro:hydrate` | Bootstrap knowledge from git history |

### Multi-Branch Session Commands (v1.8+)

| Command | Description |
|---------|-------------|
| `/maestro:branch` | Manage CDD context across git branches |
| `/maestro:branch list` | List all branches with CDD context |
| `/maestro:branch switch <branch>` | Switch to a branch (uses worktree if available) |
| `/maestro:branch status` | Show current branch's CDD status |
| `/maestro:branch migrate` | Migrate legacy context to branch-aware structure |
| `/maestro:session` | Manage sessions, locks, and notifications |
| `/maestro:session list` | Show all active sessions across branches |
| `/maestro:session release <branch>` | Release a stale session lock |
| `/maestro:session notifications` | View/manage cross-session notifications |
| `/maestro:session notify <branch> <msg>` | Send notification to another session |

### Git Worktree Commands (v1.10)

| Command | Description |
|---------|-------------|
| `/maestro:worktree create <branch>` | Create isolated worktree for a branch |
| `/maestro:worktree remove <branch>` | Remove a worktree (keeps the branch) |
| `/maestro:worktree list` | List all worktrees with their status |
| `/maestro:worktree navigate <branch>` | Get instructions to navigate to a worktree |
| `/maestro:worktree status` | Show current worktree context |
| `/maestro:worktree sync` | Sync shared context files across worktrees |

### Multi-Project Commands

| Command | Description |
|---------|-------------|
| `/maestro:workspace` | Manage workspace configuration and projects |
| `/maestro:projects` | List and switch between projects |
| `/maestro:setup --workspace` | Initialize multi-project workspace |
| `/maestro:newTrack --cross-project` | Create track spanning multiple repos |
| `/maestro:status --all` | View all projects status |

### Orchestration Commands

| Command | Description |
|---------|-------------|
| `/maestro` | Quick task orchestration with auto-routing |
| `/workflow` | Define and execute multi-step agent workflows |
| `/parallel-execute` | Run multiple agents in parallel |
| `/list-subagents` | Browse available agents by category |
| `/agent-info` | Get detailed information about an agent |

## Context-Driven Development

### How It Works

```
Context → Specification & Planning → Implementation with Sub-Agents
```

1. **Setup**: Define your product, tech stack, and workflow methodology
2. **Track**: Create tracked work units with specs and implementation plans
3. **Implement**: Execute plans with automatic sub-agent routing
4. **Monitor**: Track progress with status and checkpoints
5. **Iterate**: Revert cleanly if needed, re-implement with improvements

### CDD Mode (`/maestro:cdd`)

**Always start your session with `/maestro:cdd`** to activate Context-Driven Development mode. This command ensures Claude has full awareness of your project context and will leverage specialized sub-agents for every task.

```bash
/maestro:cdd
```

#### What CDD Mode Activates

| Feature | Description |
|---------|-------------|
| **Context Loading** | Loads product.md, tech-stack.md, workflow.md, and all active tracks |
| **Sub-Agent Orchestration** | Every task routes to appropriate specialist agents |
| **Context Updates** | Discussions and decisions automatically update context files |
| **Workflow Enforcement** | Follows your chosen methodology (TDD/Agile/Minimal) |
| **Track Awareness** | Knows active tracks, current tasks, and progress |

#### Sub-Agent Orchestration

When CDD mode is active, **every task leverages specialized sub-agents**:

**Single Agent Tasks** (simple, focused operations):
```
"Fix CSS bug"           → frontend-developer
"Optimize SQL query"    → sql-pro
"Add API endpoint"      → backend-developer
```

**Multi-Agent Teams** (complex, multi-domain tasks):
```
"Build user authentication" →
  api-designer + backend-developer + security-auditor + qa-expert

"Add payment processing" →
  api-designer + backend-developer + security-auditor +
  sql-pro + frontend-developer + qa-expert

"Set up CI/CD pipeline" →
  devops-engineer + security-auditor + deployment-engineer
```

#### Agent Selection Criteria

Agents are selected based on:

1. **Task Domain**: Frontend, backend, DevOps, security, data, etc.
2. **Project Tech Stack**: Matches specialists to your technologies
3. **Workflow Requirements**: TDD always includes qa-expert
4. **Task Complexity**: Simple tasks get one agent, complex tasks get teams

#### Automatic Context Updates

After every significant discussion in CDD mode, context files are updated:

| Decision Type | Updated File |
|--------------|--------------|
| New requirement | `spec.md` |
| Technical approach | `plan.md`, `tech-stack.md` |
| Guideline change | `product-guidelines.md` |
| Task completion | `plan.md` (mark complete) |
| Blocker encountered | `plan.md` (add note) |
| Scope change | `spec.md`, `plan.md` |

#### CDD Mode Output

When activated, you'll see:

```markdown
## CDD Mode Activated

### Project Context Loaded
- **Product**: My Awesome App
- **Tech Stack**: TypeScript, React, Node.js, PostgreSQL
- **Workflow**: TDD
- **Guidelines**: Security-first, 80% test coverage

### Active Tracks
| ID | Title | Status | Progress |
|----|-------|--------|----------|
| TRACK-001 | User Authentication | active | 60% |

### Available Specialists (based on tech stack)
| Domain | Primary Agents |
|--------|----------------|
| Frontend | frontend-developer, react-specialist |
| Backend | backend-developer, api-designer |
| Database | sql-pro, postgres-pro |
| Quality | qa-expert, test-automator |

Ready for CDD workflow. What would you like to work on?
```

### Project Structure

After running `/maestro:setup`, your project includes:

```
maestro/
├── product.md              # Product definition and vision
├── product-guidelines.md   # Core principles and constraints
├── tech-stack.md          # Technology decisions
├── workflow.md            # Development methodology
├── code-styleguide.md     # Code standards
├── tracks.md              # Track index
└── tracks/
    └── TRACK-001/
        ├── metadata.json  # Track metadata
        ├── spec.md        # Requirements specification
        └── plan.md        # Implementation plan
```

### Workflow Templates

Choose your development methodology:

- **TDD (Test-Driven Development)**: Write tests first, then implement
- **Agile**: Iterative development with flexibility
- **Minimal**: Lightweight tracking for quick tasks

### Track Lifecycle

```
[ ] Pending → [~] In Progress → [x] Complete
```

Each task in a track:
- Gets assigned to appropriate sub-agents
- Follows your chosen workflow
- Records commit SHAs
- Supports phase checkpoints

## Multi-Branch Parallel Sessions (v1.8)

Enable multiple Claude Code sessions to work **simultaneously** on different git branches with proper isolation and coordination.

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Git Repository                                │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ Claude Session 1 │    │ Claude Session 2 │                   │
│  │ (Terminal 1)     │    │ (Terminal 2)     │                   │
│  └────────┬─────────┘    └────────┬─────────┘                   │
│           │                       │                              │
│           ▼                       ▼                              │
│  ┌──────────────────┐    ┌──────────────────┐                   │
│  │ Branch: main     │    │ Branch: feature/ │                   │
│  │ Lock: session-1  │    │ Lock: session-2  │                   │
│  │ Track: TRACK-001 │    │ Track: TRACK-002 │                   │
│  └──────────────────┘    └──────────────────┘                   │
└─────────────────────────────────────────────────────────────────┘
```

### Quick Start

```bash
# Terminal 1: Work on main branch
git checkout main
/maestro:cdd
# Session started on branch 'main', lock acquired

# Terminal 2: Work on feature branch simultaneously
git checkout feature/auth
/maestro:cdd
# Session started on branch 'feature/auth', lock acquired

# Both sessions work independently with isolated contexts
```

### Key Features

#### Branch Isolation

Each branch maintains its own:
- Track list and track data
- Active track state
- Session history
- Branch-specific settings

#### Session Locking

When you activate CDD on a branch:
- A session lock is acquired
- Other sessions are blocked from that branch
- Lock includes heartbeat (stale after 5 min without activity)
- Lock is released when session ends

```bash
# If you try to access a locked branch:
⚠️  Branch 'feature/auth' is locked by another session

   Session ID: session-abc123
   Started: 10 minutes ago
   Last Activity: 2 minutes ago

   Options:
   1. Switch to a different branch: /maestro:branch switch <other-branch>
   2. View session details: /maestro:session info session-abc123
   3. Release stale lock: /maestro:session release feature/auth --force
```

#### Cross-Session Notifications

Sessions can notify each other about important events:

```bash
# View pending notifications
/maestro:session notifications

# Send notification to another session
/maestro:session notify feature/auth "Need review on auth changes"

# Automatic notifications fire when:
# - User input is required (checkpoint approval)
# - Errors are encountered
# - Tracks are completed
```

**Notification Banner (displayed automatically):**
```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Session on 'feature/auth' requires attention             │
│    "Track TRACK-002 needs approval to proceed with Phase 2" │
│    Run: /maestro:branch switch feature/auth                 │
└─────────────────────────────────────────────────────────────┘
```

### Branch-Aware Context Structure

When using multi-branch sessions (recommended: add `maestro/` to `.gitignore`):

```
maestro/
├── shared/                    # Shared across all branches (read-only)
│   ├── product.md
│   ├── tech-stack.md
│   └── workflow.md
├── branches/                  # Branch-specific context
│   ├── main/
│   │   ├── context.json      # Branch state
│   │   ├── tracks/           # Branch tracks
│   │   │   └── TRACK-001/
│   │   └── active-session.lock
│   └── feature--auth/
│       ├── context.json
│       ├── tracks/
│       │   └── TRACK-002/
│       └── active-session.lock
├── sessions/                  # Session registry
│   └── registry.json
└── notifications/             # Cross-session notifications
    ├── pending/
    └── archive/
```

### Migration from Legacy Structure

If you have an existing project without branch support:

```bash
/maestro:branch migrate
```

This will:
1. Create `maestro/shared/` for shared context files
2. Move existing tracks to `maestro/branches/{current-branch}/`
3. Set up session management directories
4. Preserve all existing data

### Branch Commands

```bash
# List branches with CDD context
/maestro:branch list

# Initialize context for current branch
/maestro:branch init

# Switch to a branch with context handling
/maestro:branch switch feature/auth

# View current branch status
/maestro:branch status

# List tracks on current branch
/maestro:branch tracks

# Delete context for a branch
/maestro:branch delete feature/old-feature
```

### Session Commands

```bash
# List all active sessions
/maestro:session list

# Get detailed session info
/maestro:session info session-abc123

# Release a stuck/stale lock
/maestro:session release feature/auth --force

# Cleanup all stale sessions
/maestro:session cleanup

# View/clear notifications
/maestro:session notifications
/maestro:session notifications --clear

# Send notification to branch
/maestro:session notify feature/auth "Message here"

# Configure notifications (enable OS notifications)
/maestro:session config --enable-os-notifications
```

### Gitignore-Aware Mode

When `maestro/` is gitignored:
- Context persists across `git checkout` operations
- Branch is detected via `git branch --show-current`
- Context is loaded based on detected branch
- Session state survives branch switches

This is the **recommended mode** for multi-branch development.

## Git Worktree Isolation (v1.10)

For **true physical isolation** between branches, use Git worktrees. Unlike regular branch switching (which affects all terminals), worktrees create completely separate working directories.

### The Problem

When you run `git checkout feature/auth`, ALL terminal sessions see the new branch. This breaks parallel workflows:

```
Terminal 1: git checkout feature/auth  →  ALL terminals now on feature/auth
Terminal 2: also now on feature/auth   ✗  (wanted to stay on main)
```

### The Solution: Worktrees

Git worktrees create separate directories for each branch:

```
~/project/                    → main branch
~/project-feature-auth/       → feature/auth (completely isolated)
~/project-hotfix-login/       → hotfix/login (completely isolated)
```

Each terminal works in its own directory with full independence.

### Quick Start

```bash
# Create a worktree for a feature branch
/maestro:worktree create feature/auth

# Output:
# ✓ Worktree created at: /Users/you/project-feature-auth
#
# To work in this worktree, open a NEW terminal and run:
#   cd /Users/you/project-feature-auth
#   /maestro:cdd

# List all worktrees
/maestro:worktree list

# Navigate to a worktree (shows instructions)
/maestro:worktree navigate feature/auth

# Remove when done (keeps the branch)
/maestro:worktree remove feature/auth
```

### Automatic Integration

Worktrees are automatically integrated into other commands:

- **`/maestro:cdd`**: Detects worktree context, skips locking (not needed), recommends worktrees when parallel sessions detected
- **`/maestro:branch switch`**: Checks for existing worktree first, navigates instead of checkout
- **`/maestro:implement`**: Notes worktree isolation status, no branch conflict warnings

### Worktree Structure

```
~/Projects/
├── my-app/                          # Main repository (main branch)
│   ├── .git/                        # Actual git data
│   ├── maestro/
│   │   ├── shared/                  # Shared context files
│   │   └── branches/main/           # Branch-specific context
│   └── src/
│
├── my-app-feature-auth/             # Worktree (feature/auth branch)
│   ├── .git                         # File pointing to main .git
│   ├── maestro/
│   │   ├── shared/                  # Copied from main
│   │   └── branches/feature--auth/  # Branch-specific context
│   └── src/
```

### Commands

```bash
# Create worktree for existing branch
/maestro:worktree create feature/auth

# Create worktree with new branch
/maestro:worktree create feature/payments --new

# List all worktrees with status
/maestro:worktree list

# Get navigation instructions
/maestro:worktree navigate feature/auth

# Check current worktree status
/maestro:worktree status

# Sync shared context to all worktrees
/maestro:worktree sync

# Remove worktree (branch preserved)
/maestro:worktree remove feature/auth
```

### Best Practices

1. **Always use separate terminals** for each worktree
2. **Create worktrees from main repo** for consistency
3. **Sync shared context** after updating product.md or tech-stack.md
4. **Remove worktrees** when branches are merged
5. **Use `/maestro:cdd`** in each worktree to activate CDD mode

### When to Use Worktrees vs Regular Branches

| Scenario | Recommendation |
|----------|---------------|
| Single terminal, switching between tasks | Regular branches OK |
| Multiple terminals, same branch | Regular branches OK |
| Multiple terminals, different branches | **Use worktrees** |
| CI/CD or automation scripts | Regular branches OK |
| Parallel feature development | **Use worktrees** |
| Quick hotfix while working on feature | **Use worktrees** |

## Context-Aware Learning System (v1.9)

The learning system captures decisions, research, and discoveries during CDD workflow execution, building knowledge over time that informs future tasks.

### Overview

```
┌─────────────────────────────────────────────────────────────────┐
│              Context-Aware Learning Architecture                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│           SessionLearningController (Orchestrator)               │
│                          │                                       │
│     ┌────────────────────┼────────────────────┐                 │
│     │                    │                    │                 │
│     ▼                    ▼                    ▼                 │
│ ┌──────────┐      ┌──────────────┐     ┌─────────────┐         │
│ │ Learning │      │   Context    │     │  Knowledge  │         │
│ │ Journal  │      │ Enrichment   │     │   Recall    │         │
│ └────┬─────┘      └──────┬───────┘     └──────┬──────┘         │
│      │                   │                    │                 │
│      └───────────────────┴────────────────────┘                 │
│                          │                                       │
│                          ▼                                       │
│                  ┌──────────────┐                               │
│                  │  Knowledge   │                               │
│                  │    Store     │                               │
│                  └──────────────┘                               │
└─────────────────────────────────────────────────────────────────┘
```

### How It Works

1. **Capture**: During task execution, decisions, research findings, and discoveries are captured in real-time
2. **Store**: High-confidence learnings are persisted to the knowledge store
3. **Recall**: When starting new tasks, relevant past knowledge is retrieved
4. **Inject**: Retrieved knowledge is formatted and injected into agent context
5. **Feedback**: Outcomes are recorded to improve future knowledge relevance

### Knowledge Types

| Type | Description | Example |
|------|-------------|---------|
| **Decision** | Choices made during implementation | "Use JWT with refresh tokens for auth" |
| **Pattern** | Reusable approaches identified | "API error handling with typed responses" |
| **Research** | Findings from investigation | "Redis caching improves response by 40%" |
| **Discovery** | Unexpected insights | "Component re-renders due to prop drilling" |
| **Blocker** | Issues and their resolutions | "Token expiry → Implemented refresh flow" |

### Automatic Knowledge Capture

During `/maestro:implement`, the system automatically:

```
Step 7 (Pre-execution):
  → Recalls relevant past knowledge
  → Injects into agent context with relevance scores
  → Tracks which knowledge IDs were used

Step 9 (Post-execution):
  → Parses agent output for decision indicators
  → Captures decisions with rationale
  → Records knowledge usage outcomes

Step 11 (Phase Completion):
  → Summarizes phase learnings
  → Generates enrichment suggestions
  → Displays learning summary

Step 12 (Track Completion):
  → Exports journal to knowledge base
  → Creates enhanced retrospective
  → Updates knowledge confidence scores
```

### Knowledge Injection Example

When starting a new task, relevant knowledge is automatically injected:

```markdown
## Relevant Past Knowledge

### Decisions (with confidence scores)
- **Use JWT with refresh tokens** (85% confidence, 92% relevance)
  - Rationale: Stateless authentication with secure token rotation
- **Prefer functional components** (78% confidence, 75% relevance)

### Applicable Patterns
- Error handling pattern: try-catch with custom error types
- API response format: { success, data, error }

### Recommendations
- Review decision on caching strategy (high priority)
- Similar task had authentication blocker - check token refresh
```

### Phase Learning Summary

At the end of each phase, a learning summary is displayed:

```
┌─────────────────────────────────────────────────────────┐
│ Phase 2 Learning Summary                                │
├─────────────────────────────────────────────────────────┤
│ Decisions: 3 captured                                   │
│   • Use connection pooling for DB (high confidence)     │
│   • Implement retry logic with exponential backoff      │
│   • Cache user sessions in Redis                        │
│                                                         │
│ Discoveries: 1                                          │
│   • Pattern: All API endpoints follow /api/v1/{resource}│
│                                                         │
│ Blockers Resolved: 1                                    │
│   • Auth token expiry → Implemented refresh flow        │
│                                                         │
│ Knowledge Injected: 2 entries used, 2 helpful           │
└─────────────────────────────────────────────────────────┘
```

### Knowledge Store Structure

```
maestro/
└── knowledge/
    ├── index.json           # Search index
    ├── decisions/           # Decision entries
    │   └── dec_xxx.json
    ├── patterns/            # Pattern entries
    │   └── pat_xxx.json
    ├── research/            # Research entries
    ├── learnings/           # Learning entries
    ├── blockers/            # Blocker entries
    └── sessions/            # Session journals
        └── session-xxx.json
```

### Feedback Loop

The system tracks knowledge usage outcomes:

```
Knowledge Used: "Use JWT for authentication" (dec_abc123)
Task Outcome: Success
Impact: Positive

→ Confidence adjusted: 0.78 → 0.82
→ Usage count: 3 → 4
→ Success rate: 100%
```

This feedback improves future knowledge relevance scoring.

## Knowledge Hydration (v1.12, Enhanced in v1.13)

Bootstrap your Knowledge System from existing git history. Perfect for onboarding existing projects to CDD or recovering knowledge from repositories without prior CDD usage.

**v1.13 Enhancements:**
- Smart commit grouping by tickets, branches, scopes, or semantic similarity
- Auto-generated feature documentation in Markdown
- ADR (Architecture Decision Record) auto-detection and generation
- Dependency change tracking (npm, Python, Go, Rust)
- Architecture pattern detection (hexagonal, DDD, MVC, microservices, etc.)

### Quick Start

```bash
# Interactive mode (recommended for first-time use)
/maestro:hydrate

# Quick hydration - last 6 months, git only
/maestro:hydrate --quick

# Full hydration with GitHub PRs
/maestro:hydrate --full --include-github

# Preview what would be extracted
/maestro:hydrate --preview

# Generate feature documentation and ADRs (v1.13)
/maestro:hydrate --generate-docs --generate-adrs

# Group commits by ticket IDs
/maestro:hydrate --group-by ticket
```

### What Gets Extracted

| Source | Knowledge Type | Examples |
|--------|---------------|----------|
| Breaking changes (`feat!`) | Decisions (high confidence) | "Migrated to PostgreSQL" |
| Feature commits (`feat`) | Entities, Patterns | New services, components |
| Bug fixes (`fix`) | Learnings | Problem/solution pairs |
| Refactors (`refactor`) | Patterns, Decisions | Code improvement approaches |
| Reverts | Learnings | "What not to do" insights |
| PR discussions | Decisions, Learnings | Review insights, rationale |

### Smart Commit Grouping (v1.13)

Commits can be grouped into logical features using multiple strategies:

| Strategy | Description | Example Pattern |
|----------|-------------|-----------------|
| `ticket` | Group by ticket/issue IDs | `JIRA-123`, `#456`, `GH-789` |
| `branch` | Group by feature branch from merge commits | `feature/user-auth` |
| `scope` | Group by conventional commit scope | `feat(auth):`, `fix(api):` |
| `semantic` | Cluster by content similarity (TF-IDF) | Similar descriptions |
| `auto` | Combine all strategies with priority ranking | Best match wins |

```bash
# Group by JIRA/GitHub ticket IDs
/maestro:hydrate --group-by ticket

# Group by feature branch names
/maestro:hydrate --group-by branch

# Group by conventional commit scopes
/maestro:hydrate --group-by scope

# Use semantic similarity clustering
/maestro:hydrate --group-by semantic

# Auto-detect best grouping (default)
/maestro:hydrate --group-by auto
```

### Feature Documentation (v1.13)

Automatically generate comprehensive Markdown documentation for each feature:

```bash
/maestro:hydrate --generate-docs
```

**Output Structure:**
```
maestro/features/
├── index.md                    # Feature index with links
├── timeline.md                 # Chronological timeline with Gantt chart
├── AUTH-001-user-auth.md       # Individual feature docs
├── PAY-002-payment-flow.md
└── API-003-rest-endpoints.md
```

**Feature Document Contents:**
- Summary and metadata (type, status, date range, commit count)
- Detailed change table with commits and files
- Related tickets and issues
- Key files touched
- Timeline with Mermaid Gantt chart

### ADR Auto-Detection (v1.13)

Automatically detect and generate Architecture Decision Records from commits:

```bash
/maestro:hydrate --generate-adrs --min-confidence 0.7
```

**Detection Signals:**

| Signal | Confidence | Example |
|--------|------------|---------|
| Breaking change (`feat!`, `BREAKING`) | 0.9 | Migration to new API |
| "chose X over Y" pattern | 0.85 | "Chose PostgreSQL over MongoDB" |
| Major dependency addition | 0.8 | Adding React, TypeScript |
| Architecture keywords | 0.75 | "adopted", "migrated", "switched to" |
| New directory structures | 0.7 | Adding `services/`, `adapters/` |
| Config file additions | 0.65 | Adding tsconfig.json, .eslintrc |

**ADR Output:**
```
maestro/decisions/
├── index.md               # ADR index
├── ADR-001-jwt-auth.md
├── ADR-002-postgres-db.md
└── ADR-003-react-query.md
```

### Dependency Tracking (v1.13)

Track technology decisions from package manifest changes:

**Supported Files:**
- `package.json` (npm/Node.js)
- `requirements.txt` (Python)
- `go.mod` (Go)
- `Cargo.toml` (Rust)

**What's Detected:**
- New framework/library adoptions
- Technology migrations (e.g., Redux → React Query)
- Major version upgrades
- DevTool and testing library changes

### Architecture Analysis (v1.13)

Detect architecture patterns from directory structure:

| Pattern | Indicators |
|---------|------------|
| Hexagonal | `ports/`, `adapters/`, `domain/` |
| DDD | `aggregates/`, `entities/`, `repositories/` |
| MVC | `models/`, `views/`, `controllers/` |
| Clean Architecture | `usecases/`, `interfaces/`, `domain/` |
| Microservices | `services/*`, multiple package.json files |
| Monorepo | `packages/*`, workspaces configuration |
| Layered | `presentation/`, `business/`, `data/` |

### Multi-Repository Support

Hydration automatically detects workspace structure:

```
Analyzing workspace...

Workspace type: Multi-repository (3 repos detected)

| Repository    | Type      | Commits | Date Range      |
|---------------|-----------|---------|-----------------|
| frontend/     | main      | 1,234   | 2022-03 to now  |
| backend/      | submodule | 890     | 2022-06 to now  |
| shared-libs/  | submodule | 456     | 2023-01 to now  |

Total: 2,580 commits
```

### Hydration Options

```bash
# Scope options
/maestro:hydrate --since 2024-01-01    # Start date
/maestro:hydrate --max-commits 500      # Limit commits
/maestro:hydrate --branches main,develop # Specific branches
/maestro:hydrate --skip-merges          # Skip merge commits

# Multi-repo options
/maestro:hydrate --all-repos            # All repositories
/maestro:hydrate --repos frontend,backend # Specific repos
/maestro:hydrate --no-submodules        # Exclude submodules

# Output options
/maestro:hydrate --create-tracks        # Generate retrospective tracks
/maestro:hydrate --min-confidence 0.7   # Confidence threshold
/maestro:hydrate --incremental          # Only new commits since last run
```

### Incremental Hydration

After initial hydration, use `--incremental` to process only new commits:

```bash
/maestro:hydrate --incremental
```

State is tracked in `maestro/hydration/state.json` with per-repository progress.

### GitHub Integration

When `GITHUB_TOKEN` is available, hydration extracts richer knowledge from PRs:

- PR titles and descriptions
- Review comments and approvals
- Linked issues
- Discussion insights

```bash
export GITHUB_TOKEN=your_token_here
/maestro:hydrate --include-github
```

### Context Enrichment Suggestions

After significant learnings, the system suggests context file updates:

```
Context Updates Suggested:
  • tech-stack.md: Add Redis caching section
  • product-guidelines.md: Document auth approach
  • code-styleguide.md: Add error handling pattern

Apply suggested context updates? (Y/n)
```

## Multi-Project Workspaces

### Overview

For projects with multiple repositories, git submodules, or monorepo structures:

```bash
# Initialize as workspace
/maestro:setup --workspace

# Add projects
/maestro:workspace add ./frontend
/maestro:workspace add ./backend --type submodule

# Switch between projects
/maestro:projects switch backend

# Create cross-project track
/maestro:newTrack --cross-project "Add shared authentication"
```

### Workspace Structure

```
workspace-root/
├── maestro/
│   ├── workspace.json          # Workspace configuration
│   ├── product.md              # Umbrella product vision
│   ├── cross-project-tracks.md # Cross-project track index
│   └── projects/               # Project registry
├── frontend/
│   ├── maestro/
│   │   ├── project.json        # Links to workspace
│   │   └── tracks.md           # Project tracks
│   └── src/
├── backend/                    # Git submodule
│   ├── maestro/
│   └── src/
└── .gitmodules
```

### Git Submodule Support

Maestro handles submodules automatically:
- Detects submodules from `.gitmodules`
- Commits to submodule repos first
- Updates parent repository references
- Supports atomic or independent commit strategies

### Cross-Project Tracks

Features spanning multiple repositories:

```bash
# Create cross-project track
/maestro:newTrack --cross-project "Implement shared auth"

# Implement across all projects
/maestro:implement CROSS-001 --all-projects

# Revert with submodule handling
/maestro:revert CROSS-001 --include-submodules
```

## Platform Sync

Synchronize CDD tracks with external project management platforms. Supports both direct API and MCP-based connections.

### Supported Platforms

| Platform | Connection Types | Features |
|----------|-----------------|----------|
| **ClickUp** | API | Tasks, lists, custom fields, priorities |
| **Linear** | API | Issues, projects, cycles, labels |
| **Jira** | API | Issues, epics, sprints, custom fields |
| **Asana** | API | Tasks, projects, sections, tags |
| **Todoist** | API | Tasks, projects, labels, priorities |
| **YouTrack** | API | Issues, tags, custom fields |
| **Notion** | MCP | Database pages, properties |
| **GitHub** | MCP | Issues, projects, milestones |

### Quick Start

```bash
# Initialize sync configuration
/maestro:sync config --init

# Test platform connections
/maestro:sync test

# Push all tracks to configured platforms
/maestro:sync push

# Pull items from external platforms
/maestro:sync pull --platform=linear

# Link existing track to external item
/maestro:sync link TRACK-001 jira:PROJ-123
```

### Configuration

Create `.cdd/sync-config.json` in your project (or use `/maestro:sync config --init`):

```json
{
  "sync": {
    "enabled": true,
    "mode": "bidirectional",
    "conflictResolution": "cdd_wins"
  },
  "platforms": {
    "linear": {
      "enabled": true,
      "connection": {
        "type": "api",
        "apiKey": "${LINEAR_API_KEY}"
      },
      "mapping": {
        "teamId": "your-team-id"
      }
    }
  }
}
```

### Connection Types

**Direct API**: Configure with API keys and tokens
```json
{
  "connection": {
    "type": "api",
    "apiKey": "${LINEAR_API_KEY}"
  }
}
```

**MCP-Based**: Use existing MCP servers
```json
{
  "connection": {
    "type": "mcp",
    "mcp": {
      "server": "notion-mcp-server",
      "toolPrefix": "notion"
    }
  }
}
```

### Sync Commands

| Command | Description |
|---------|-------------|
| `/maestro:sync status` | Show sync status for all platforms |
| `/maestro:sync push` | Push CDD tracks to external platforms |
| `/maestro:sync pull` | Pull items from external platforms |
| `/maestro:sync full` | Bidirectional sync |
| `/maestro:sync test` | Test platform connections |
| `/maestro:sync link` | Link track to external item |
| `/maestro:sync config` | Configure sync settings |

### Environment Variables

```bash
# ClickUp
export CLICKUP_API_KEY="your-api-key"

# Linear
export LINEAR_API_KEY="your-api-key"

# Jira
export JIRA_HOST="https://your-org.atlassian.net"
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"

# Asana
export ASANA_ACCESS_TOKEN="your-token"

# Todoist
export TODOIST_API_TOKEN="your-token"

# YouTrack
export YOUTRACK_HOST="https://your-org.youtrack.cloud"
export YOUTRACK_TOKEN="your-token"
```

## Installation

Choose the installation method that best fits your needs:

### Option 1: Direct Install from GitHub (Recommended)

The simplest way to install Maestro. Run this command in Claude Code:

```
/plugin install wamoscode/maestro-plugin
```

That's it! The plugin will be downloaded and installed automatically.

### Option 2: Install via Marketplace

If you prefer using the marketplace system:

```
# Add the marketplace
/plugin marketplace add wamoscode/maestro-plugin

# Install the plugin
/plugin install maestro@maestro-plugins
```

### Option 3: Local Development Setup

For contributors or local development with live reload:

```bash
# Clone the repository
git clone https://github.com/wamoscode/maestro-plugin.git ~/Projects/maestro-plugin

# Install from local path in Claude Code
/plugin install ~/Projects/maestro-plugin
```

### Option 4: Project-Level Installation

Add Maestro to a specific project by configuring `.claude/settings.json` in your project root:

```json
{
  "enabledPlugins": {
    "maestro@maestro-plugins": true
  },
  "extraKnownMarketplaces": {
    "maestro-plugins": {
      "source": {
        "source": "github",
        "repo": "wamoscode/maestro-plugin"
      }
    }
  }
}
```

Team members will be prompted to install the plugin when they open the project.

### Post-Installation

After installation, verify everything is working:

```
# List available agents
/list-subagents

# Get help
/agent-info maestro

# Initialize project for Context-Driven Development
/maestro:setup
```

### Updating

To update to the latest version:

```
/plugin update maestro
```

Or if installed via marketplace:

```
/plugin marketplace update maestro-plugins
/plugin update maestro@maestro-plugins
```

### Uninstallation

```
/plugin uninstall maestro
```

Or if installed via marketplace:

```
/plugin uninstall maestro@maestro-plugins
/plugin marketplace remove maestro-plugins
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Plugin not loading | Run `/plugin list` to verify installation; restart Claude Code |
| Commands not found | Check `/plugin info maestro` for status |
| MCP server errors | Ensure Node.js 18+ is installed |
| Permission denied | Check repository access permissions |
| Validation errors | Run `/plugin validate` in the plugin directory |

## Usage Examples

### Initialize a New Project

```bash
/maestro:setup
```

Walks you through:
- Product definition
- Technology stack
- Workflow selection (TDD/Agile/Minimal)
- Code style guide selection

### Create and Implement a Feature

```bash
# Create a track with interactive Q&A
/maestro:newTrack "Add payment processing with Stripe"

# Or with a description
/maestro:newTrack --type feature "Implement user dashboard"

# Start implementation
/maestro:implement TRACK-001

# Check progress
/maestro:status
```

### Quick Orchestration (No Tracking)

```bash
# Simple task
/maestro Build a REST API for user management

# With specific agents
/maestro --agents=backend-developer,security-auditor Add password reset

# Dry run to see plan
/maestro --dry-run Implement OAuth2 authentication
```

### Define Workflows

```bash
# Sequential workflow
/workflow backend-developer:"Build API" -> qa-expert:"Test" -> devops-engineer:"Deploy"

# Parallel groups
/workflow [frontend-developer | backend-developer] -> qa-expert

# From track plan
/workflow --from-track TRACK-001
```

### Browse Agents

```bash
# All agents
/list-subagents

# By category
/list-subagents infrastructure

# Project-relevant agents
/list-subagents --project

# Search
/list-subagents --search security
```

## Agent Categories

| Category | Agents | Focus |
|----------|--------|-------|
| Core Development | 11 | Frontend, backend, API, full-stack |
| Language Specialists | 11 | TypeScript, Python, Go, Rust, Java, etc. |
| Infrastructure | 4 | DevOps, Kubernetes, Terraform, Cloud |
| Quality & Security | 4 | Testing, code review, security audits |
| Data & AI | 3 | ML, data engineering, prompt engineering |
| Developer Experience | 2 | Documentation, refactoring |
| Specialized Domains | 2 | Blockchain, gaming |
| Business & Product | 2 | Product management, technical writing |
| Meta & Orchestration | 2 | Multi-agent coordination |
| Research & Analysis | 1 | Research analyst |

## Configuration

The plugin can be configured via `~/.maestro/config.json`:

```json
{
  "maxParallelAgents": 5,
  "defaultTimeout": 300000,
  "enableLogging": true,
  "logLevel": "info",
  "isolatedContexts": true,
  "autoRetry": true,
  "maxRetries": 3,
  "circuitBreaker": {
    "enabled": true,
    "threshold": 5,
    "resetTimeout": 60000
  }
}
```

## MCP Server

The plugin includes an MCP server that is automatically configured when you install the plugin. No manual configuration is required.

If you need to configure it manually (for development or custom setups), add to your `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "maestro": {
      "command": "node",
      "args": ["/path/to/maestro-plugin/mcp/server.js"]
    }
  }
}
```

### MCP Tools

**Agent Tools:**
- `list_agents` - List available sub-agents
- `get_agent_info` - Get agent details
- `analyze_task` - Analyze a task and get routing recommendations
- `execute_workflow` - Execute a defined workflow
- `get_execution_status` - Check execution status
- `get_metrics` - Get execution metrics

**Sync Tools:**
- `sync_status` - Get synchronization status for all platforms
- `sync_push` - Push CDD tracks to external platforms
- `sync_pull` - Pull items from external platforms
- `sync_link` - Link a CDD track to an external item
- `sync_test` - Test platform connections
- `sync_config` - Get or update sync configuration

**Knowledge Tools:**
- `hydrate_knowledge` - Bootstrap knowledge from git history (enhanced in v1.13)
- `hydrate_status` - Get hydration status and progress
- `generate_feature_docs` - Generate feature documentation from commit groups (v1.13)
- `generate_adrs` - Generate Architecture Decision Records (v1.13)
- `health_check` - Check system health status
- `kb_backup` - Backup knowledge store
- `kb_restore` - Restore knowledge from backup
- `generate_diagram` - Generate Mermaid diagrams from tracks

**Learning Tools:**
- `learning_init` - Initialize a learning session
- `learning_capture` - Capture decisions, research, discoveries
- `learning_finalize` - Finalize session and persist learnings
- `learning_status` - Get current learning session status
- `learning_get_knowledge` - Get relevant knowledge for context

## Directory Structure

```
maestro-plugin/
├── plugin.json              # Plugin metadata
├── commands/                # Slash commands
│   ├── maestro.md          # Main orchestration (track-aware)
│   ├── maestro/            # Context-driven commands
│   │   ├── cdd.md          # CDD mode activation
│   │   ├── setup.md        # Project initialization
│   │   ├── newTrack.md     # Track creation
│   │   ├── status.md       # Progress monitoring
│   │   ├── implement.md    # Track implementation
│   │   ├── revert.md       # Git-aware rollback
│   │   ├── sync.md         # Platform synchronization
│   │   ├── dashboard.md    # Progress dashboard
│   │   ├── impact.md       # Impact analysis
│   │   ├── stash.md        # Track stashing
│   │   ├── quick.md        # Quick actions
│   │   ├── branch.md       # Branch management (v1.8)
│   │   ├── session.md      # Session management (v1.8)
│   │   └── worktree.md     # Worktree management (v1.10)
│   ├── workflow.md         # Workflow orchestration
│   ├── list-subagents.md   # Agent browser
│   ├── agent-info.md       # Agent details
│   └── parallel-execute.md # Parallel execution
├── templates/               # Project templates
│   ├── workflow-tdd.md     # TDD methodology
│   ├── workflow-agile.md   # Agile methodology
│   ├── workflow-minimal.md # Minimal tracking
│   ├── sync-config.json    # Platform sync configuration
│   ├── tracks.md           # Track index template
│   ├── branch-context.json # Branch context template (v1.8)
│   ├── session-registry.json # Session registry template (v1.8)
│   ├── notification.json   # Notification template (v1.8)
│   ├── archetypes/         # Track archetypes
│   │   ├── api-endpoint.md
│   │   ├── auth-feature.md
│   │   └── database-migration.md
│   ├── code_styleguides/   # Language style guides
│   │   ├── typescript.md
│   │   ├── python.md
│   │   ├── go.md
│   │   └── rust.md
│   └── track/              # Track templates
│       ├── spec.md
│       ├── plan.md
│       └── metadata.json   # Now includes branch field (v1.8)
├── subagents/              # Agent definitions (42 agents)
│   ├── maestro.md          # Main orchestrator
│   ├── registry.json       # Agent registry
│   └── [10 category folders]
├── hooks/                  # Execution hooks
├── skills/                 # Specialized skills
│   ├── platform-sync/      # Platform sync adapters
│   │   ├── sync-engine.js
│   │   └── adapters/       # Platform-specific adapters
│   ├── branch-session-manager.js  # Session/lock management (v1.8)
│   ├── branch-context.js   # Branch context management (v1.8)
│   ├── session-notifications.js   # Cross-session notifications (v1.8)
│   ├── worktree-manager.js # Git worktree management (v1.10)
│   ├── session-learning-controller.js  # Learning orchestrator (v1.9)
│   ├── knowledge-store.js  # Knowledge persistence (v1.9)
│   ├── learning-journal.js # Real-time capture (v1.9)
│   ├── knowledge-recall.js # Knowledge retrieval (v1.9)
│   ├── context-enrichment.js  # Auto-enrichment (v1.9)
│   ├── workspace-scanner.js   # Multi-repo detection (v1.12)
│   ├── git-history-parser.js  # Commit parsing (v1.12, enhanced v1.13)
│   ├── knowledge-extractor.js # Knowledge extraction (v1.12)
│   ├── hydration-manager.js   # Hydration orchestration (v1.12, enhanced v1.13)
│   ├── feature-grouper.js     # Commit grouping strategies (v1.13)
│   ├── feature-documenter.js  # Feature doc generation (v1.13)
│   ├── adr-detector.js        # ADR detection and generation (v1.13)
│   ├── dependency-analyzer.js # Dependency change tracking (v1.13)
│   ├── structure-analyzer.js  # Architecture pattern analysis (v1.13)
│   ├── knowledge-capture.js   # ADRs and retrospectives
│   ├── context-versioning.js
│   ├── quality-gates.js
│   └── impact-analysis.js
├── scripts/                # Automation scripts
└── mcp/                    # MCP server
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

- Sub-agent definitions based on [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- Context-Driven Development inspired by [Conductor](https://github.com/gemini-cli-extensions/conductor)
