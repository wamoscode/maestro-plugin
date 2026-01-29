---
name: branch
description: Manage CDD context across git branches with multi-session support
usage: /maestro:branch <subcommand> [options]
aliases: [br, branches]
---

# /maestro:branch Command

Manage CDD (Context-Driven Development) context across git branches. This command enables multiple Claude Code sessions to work simultaneously on different branches with proper isolation and state management.

## CRITICAL: Mandatory Sub-Agent Usage

**All /maestro commands MUST be processed through specialized sub-agents via the Task tool.**

This is NOT optional. When executing branch operations:

1. **EVERY operation** routes to appropriate sub-agent(s)
2. **ALWAYS** use the Task tool with `subagent_type` parameter
3. **NEVER** process operations directly without sub-agent consultation

```
/maestro:branch operations → Task tool → appropriate specialist(s)

Branch management operations typically route to:
- devops-engineer: For git operations and branch management
- software-architect: For context structure decisions
- backend-developer: For file system operations
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `list` | List all branches with CDD context |
| `switch <branch>` | Switch to a branch with context preservation |
| `status` | Show current branch's CDD status |
| `tracks` | List tracks associated with current branch |
| `init` | Initialize CDD context for current branch |
| `delete <branch>` | Delete CDD context for a branch |
| `migrate` | Migrate legacy context to branch-aware structure |

## Usage Examples

```bash
# List all branches with CDD context
/maestro:branch list

# Switch to a branch (with context handling)
/maestro:branch switch feature/auth

# View current branch status
/maestro:branch status

# List tracks for current branch
/maestro:branch tracks

# Initialize context for current branch
/maestro:branch init

# Delete context for a branch
/maestro:branch delete feature/old-feature

# Migrate from legacy flat structure to branch-aware
/maestro:branch migrate
```

## Output Examples

### Branch List

```
/maestro:branch list
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BRANCHES WITH CDD CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Branch              │ Tracks │ Active Track │ Session  │ Last Used    │
│─────────────────────│────────│──────────────│──────────│──────────────│
│ main *              │ 3      │ TRACK-001    │ active   │ 2 min ago    │
│ feature/auth        │ 2      │ TRACK-002    │ locked   │ 10 min ago   │
│ feature/payments    │ 1      │ -            │ -        │ 2 days ago   │
│ hotfix/login        │ 1      │ TRACK-005    │ -        │ 1 hour ago   │

* = current branch
Locked branches have active sessions: feature/auth (session-abc123)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Branch Switch

```
/maestro:branch switch feature/auth
```

**If branch is available:**
```
✓ Switched to branch 'feature/auth'

Branch Context Loaded:
- Active Track: TRACK-002 (User Authentication)
- Tracks: 2 total (1 active, 1 completed)
- Last session: 10 minutes ago

Session started. CDD mode is active for this branch.
```

**If branch is locked:**
```
⚠️  Branch 'feature/auth' is locked by another session

   Session ID: session-abc123
   Started: 15 minutes ago
   Last Activity: 2 minutes ago
   User: walugembeamos@macbook-pro
   Terminal: iTerm2

   Options:
   1. Switch to a different branch: /maestro:branch switch <other-branch>
   2. View session details: /maestro:session info session-abc123
   3. Release stale lock: /maestro:session release feature/auth --force
```

### Branch Status

```
/maestro:branch status
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  BRANCH STATUS: main
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session: session-def456 (active)
Started: 30 minutes ago
Last Activity: just now

Context:
  Created: 2024-01-10
  Last Accessed: just now
  Structure: branch-aware (gitignored)

Tracks Summary:
  Total: 3 tracks
  Active: 1 (TRACK-001)
  Completed: 1
  Pending: 1

Active Work:
  Track: TRACK-001 - Project Setup
  Phase: 2/3
  Task: 2.3 - Configure authentication middleware
  Agents: backend-developer, security-auditor

Other Sessions:
  feature/auth: session-abc123 (active, TRACK-002)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Branch Tracks

```
/maestro:branch tracks
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  TRACKS ON BRANCH: main
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ ID        │ Type    │ Title                  │ Status    │ Progress │
│───────────│─────────│────────────────────────│───────────│──────────│
│ TRACK-001 │ Feature │ Project Setup          │ Active    │ 60%      │
│ TRACK-003 │ Chore   │ Database Migration     │ Completed │ 100%     │
│ TRACK-004 │ Bug     │ Fix Login Redirect     │ Pending   │ 0%       │

Note: These tracks are specific to branch 'main'.
Tracks on other branches are not shown.

To see tracks on another branch:
  /maestro:branch switch <branch>
  /maestro:branch tracks

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Branch Migration

```
/maestro:branch migrate
```

```
Migration to Branch-Aware Structure

This will reorganize your maestro/ directory to support multi-branch sessions:

Before (legacy):
  maestro/
  ├── product.md
  ├── tech-stack.md
  ├── workflow.md
  └── tracks/
      └── TRACK-001/

After (branch-aware):
  maestro/
  ├── shared/              # Shared across all branches
  │   ├── product.md
  │   ├── tech-stack.md
  │   └── workflow.md
  ├── branches/            # Branch-specific context
  │   └── main/
  │       ├── context.json
  │       └── tracks/
  │           └── TRACK-001/
  └── sessions/            # Session management

Current branch 'main' will receive the existing tracks.

Proceed with migration? (y/n)
```

**After migration:**
```
✓ Migration completed successfully

Shared Context:
  Location: maestro/shared/
  Files: product.md, tech-stack.md, workflow.md

Branch Context:
  Branch: main
  Location: maestro/branches/main/
  Tracks: 3 tracks migrated

Session Support:
  Registry: maestro/sessions/registry.json
  Notifications: maestro/notifications/

Legacy files have been preserved. After verification, you can manually remove:
  - maestro/product.md (copied to shared/)
  - maestro/tech-stack.md (copied to shared/)
  - maestro/tracks/ (copied to branches/main/tracks/)
```

## How It Works

### Branch Context Isolation

Each git branch maintains its own:
- Track list and track data
- Active track state
- Session history
- Branch-specific settings

### Shared Context

The following files are shared across all branches (read-only from branch context):
- `product.md` - Product definition
- `tech-stack.md` - Technology stack
- `workflow.md` - Development workflow
- `product-guidelines.md` - Product guidelines
- `code-styleguide.md` - Code style guide

### Session Locking

When you activate CDD on a branch:
1. A session lock is acquired
2. Other sessions are blocked from that branch
3. Lock includes heartbeat for stale detection (>5 min = stale)
4. Lock is released when session ends or via `/maestro:session release`

### Gitignore-Aware Mode

If `maestro/` is in `.gitignore`:
- Context persists across `git checkout` operations
- Branch is detected via `git branch --show-current`
- Context is loaded based on detected branch, not filesystem state

---

## MANDATORY EXECUTION DIRECTIVE

**Every /maestro:branch operation MUST use the Task tool with sub-agents.**

### Sub-Agent Routing for Branch Operations

| Operation | Primary Agent | Secondary Agents |
|-----------|--------------|------------------|
| `list` | devops-engineer | - |
| `switch` | devops-engineer | software-architect |
| `status` | devops-engineer | - |
| `tracks` | devops-engineer | - |
| `init` | devops-engineer | software-architect |
| `delete` | devops-engineer | - |
| `migrate` | software-architect | devops-engineer, backend-developer |

### Execution Pattern

```javascript
// For EVERY /maestro:branch operation
Task({
  subagent_type: "devops-engineer", // or appropriate specialist
  prompt: "<operation details with branch context>",
  description: "Branch operation: <subcommand>"
})
```

---

## Branch Protocol

When this command is invoked, follow these steps:

### /maestro:branch list

```
1. Read maestro/branches/ directory
2. For each branch directory:
   a. Read context.json for metadata
   b. Check for active-session.lock
   c. Count tracks in tracks/ directory
3. Get current git branch
4. Format and display branch table
```

### /maestro:branch switch <branch>

```
1. Get target branch name
2. Check if target branch has CDD context:
   - If no context exists, offer to initialize
3. Check for active session lock on target branch:
   - If locked by another session, show warning and block
   - If locked by current session, allow (already active)
4. Release current branch lock (if any)
5. Perform git checkout (if different branch)
6. Acquire lock on target branch
7. Load branch-specific context
8. Display loaded context summary
```

### /maestro:branch status

```
1. Get current git branch
2. Check for branch context:
   - If no context, suggest /maestro:branch init
3. Load branch context (context.json)
4. Read session lock info
5. Gather track statistics
6. Check for other active sessions
7. Display comprehensive status
```

### /maestro:branch tracks

```
1. Get current git branch
2. Load branch context
3. List tracks from maestro/branches/{branch}/tracks/
4. For each track, read metadata.json
5. Sort by status (active first, then pending, then completed)
6. Display track table
```

### /maestro:branch init

```
1. Get current git branch
2. Check if branch context already exists:
   - If exists, show message and exit
3. Detect context structure (legacy vs branch-aware)
4. If legacy structure exists:
   - Suggest migration first
5. Create branch directory structure:
   - maestro/branches/{branch}/
   - maestro/branches/{branch}/tracks/
6. Create initial context.json
7. Create empty tracks.md index
8. Display success message
```

### /maestro:branch delete <branch>

```
1. Validate branch name
2. Check if branch is current branch:
   - If so, require --force flag
3. Check for active session on branch:
   - If session exists, show warning
   - Require --force to delete
4. Remove maestro/branches/{branch}/ directory
5. Update session registry (remove any orphaned sessions)
6. Display confirmation
```

### /maestro:branch migrate

```
1. Detect current structure (legacy vs branch-aware)
2. If already branch-aware:
   - Display "already migrated" message
3. Show migration preview
4. Prompt for confirmation
5. Execute migration:
   a. Create maestro/shared/ directory
   b. Copy shared files to shared/
   c. Create maestro/branches/{current-branch}/
   d. Move tracks to branch directory
   e. Create session management directories
   f. Create .gitignore-aware marker file
6. Display migration summary
```

---

## Integration with Other Commands

### /maestro:cdd
- Automatically detects current branch
- Acquires session lock
- Loads branch-specific context

### /maestro:status
- Shows branch information in status
- Displays other active sessions

### /maestro:newTrack
- Creates track in current branch's context
- Track metadata includes branch field

### /maestro:session
- Manages sessions across branches
- Provides lock release functionality

---

## Error Handling

### No Context Found
```
Branch 'feature/new' has no CDD context.

Initialize context for this branch?
  /maestro:branch init

Or switch to a branch with existing context:
  /maestro:branch list
```

### Branch Locked
```
⚠️  Branch 'feature/auth' is locked by another session

See lock details and options above.
```

### Migration Required
```
Legacy context structure detected.

To use multi-branch sessions, please migrate first:
  /maestro:branch migrate

This will preserve all existing context while enabling branch isolation.
```

### Git Not Available
```
Error: Git is not available or not initialized.

Multi-branch sessions require a git repository.
Initialize git first: git init
```
