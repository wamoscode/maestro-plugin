---
name: worktree
description: Manage Git worktrees for true branch isolation in multi-session development
usage: /maestro:worktree <subcommand> [options]
aliases: [wt, trees]
---

# /maestro:worktree Command

Manage Git worktrees to achieve true branch isolation for multi-session CDD development. Unlike regular branch switching (which affects all terminals), worktrees create completely separate working directories for each branch.

## Why Worktrees?

**Problem**: When you switch branches with `git checkout`, ALL terminal sessions see the new branch. This breaks parallel development workflows.

**Solution**: Git worktrees create separate physical directories for each branch. Each terminal can work in a different worktree, achieving true isolation.

```
# Without worktrees (all terminals affected):
Terminal 1: git checkout feature/auth  →  ALL terminals now on feature/auth
Terminal 2: also now on feature/auth   ✗

# With worktrees (true isolation):
Terminal 1: ~/project/                 →  on main
Terminal 2: ~/project-feature-auth/    →  on feature/auth
Terminal 3: ~/project-hotfix-login/    →  on hotfix/login  ✓
```

## CRITICAL: Mandatory Sub-Agent Usage

**All /maestro commands MUST be processed through specialized sub-agents via the Task tool.**

```
/maestro:worktree operations → Task tool → appropriate specialist(s)

Worktree management operations typically route to:
- devops-engineer: For git worktree operations
- backend-developer: For file system operations
- software-architect: For workspace architecture decisions
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `create <branch>` | Create a worktree for a branch |
| `remove <branch>` | Remove a worktree (keeps the branch) |
| `list` | List all worktrees with their status |
| `navigate <branch>` | Get instructions to navigate to a worktree |
| `status` | Show current worktree status and context |
| `sync` | Sync shared context files across worktrees |

## Usage Examples

```bash
# Create a worktree for a feature branch
/maestro:worktree create feature/auth

# Create worktree for new branch (will create the branch)
/maestro:worktree create feature/payments --new

# List all worktrees
/maestro:worktree list

# Get navigation instructions for a worktree
/maestro:worktree navigate feature/auth

# Show current worktree status
/maestro:worktree status

# Remove a worktree when done
/maestro:worktree remove feature/auth

# Sync shared context to all worktrees
/maestro:worktree sync
```

## Output Examples

### Create Worktree

```
/maestro:worktree create feature/auth
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CREATING WORKTREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch: feature/auth
Target: /Users/walugembeamos/Projects/my-app-feature-auth

Creating worktree...
✓ Worktree created

Initializing Maestro context...
✓ Maestro directory initialized
✓ Shared context linked

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORKTREE READY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

To work in this worktree, open a NEW terminal and run:

  cd /Users/walugembeamos/Projects/my-app-feature-auth

Or open in VS Code:

  code /Users/walugembeamos/Projects/my-app-feature-auth

Then activate CDD mode:

  /maestro:cdd

This worktree is completely isolated from other branches.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### List Worktrees

```
/maestro:worktree list
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  GIT WORKTREES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Branch          │ Path                                    │ CDD Status  │
│─────────────────│─────────────────────────────────────────│─────────────│
│ main *          │ /Users/.../my-app                       │ active      │
│ feature/auth    │ /Users/.../my-app-feature-auth          │ ready       │
│ hotfix/login    │ /Users/.../my-app-hotfix-login          │ not init    │

* = current worktree
Total: 3 worktrees (1 main repo, 2 additional)

To navigate to a worktree:
  /maestro:worktree navigate <branch>

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Worktree Status

```
/maestro:worktree status
```

**In main repository:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORKTREE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Location: Main Repository
Path:     /Users/walugembeamos/Projects/my-app
Branch:   main

CDD Status:
  Context:  initialized
  Session:  active (session-abc123)
  Track:    TRACK-001 - Project Setup

Other Worktrees:
  feature/auth    → ready (TRACK-002 pending)
  hotfix/login    → needs init

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**In a worktree:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WORKTREE STATUS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Location: Worktree
Path:     /Users/walugembeamos/Projects/my-app-feature-auth
Branch:   feature/auth
Main:     /Users/walugembeamos/Projects/my-app

CDD Status:
  Context:  initialized
  Session:  inactive
  Track:    TRACK-002 - User Authentication (pending)

Shared Context:
  ✓ product.md         (synced)
  ✓ tech-stack.md      (synced)
  ✓ workflow.md        (synced)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Navigate to Worktree

```
/maestro:worktree navigate feature/auth
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  NAVIGATE TO WORKTREE: feature/auth
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Path: /Users/walugembeamos/Projects/my-app-feature-auth

Option 1: Open NEW terminal tab/window and run:
  cd /Users/walugembeamos/Projects/my-app-feature-auth

Option 2: Open in VS Code:
  code /Users/walugembeamos/Projects/my-app-feature-auth

Option 3: Open in Finder (macOS):
  open /Users/walugembeamos/Projects/my-app-feature-auth

IMPORTANT: Do NOT cd from current terminal!
           This would mix your session contexts.
           Always use a separate terminal/window.

Once in the worktree directory:
  /maestro:cdd    # Activate CDD mode for that branch

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Remove Worktree

```
/maestro:worktree remove feature/auth
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  REMOVING WORKTREE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Branch: feature/auth
Path:   /Users/walugembeamos/Projects/my-app-feature-auth

Checking for uncommitted changes...
✓ No uncommitted changes

Removing worktree...
✓ Worktree removed

Note: The branch 'feature/auth' still exists.
      Only the worktree directory was removed.

To also delete the branch:
  git branch -d feature/auth

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Sync Shared Context

```
/maestro:worktree sync
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SYNCING SHARED CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source: /Users/.../my-app/maestro/shared/

Syncing to worktrees:

  feature/auth:
    ✓ product.md
    ✓ tech-stack.md
    ✓ workflow.md

  hotfix/login:
    ✓ product.md
    ✓ tech-stack.md
    ✓ workflow.md

Sync complete: 2 worktrees updated

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## How It Works

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
│
└── my-app-hotfix-login/             # Worktree (hotfix/login branch)
    ├── .git                         # File pointing to main .git
    ├── maestro/
    │   ├── shared/                  # Copied from main
    │   └── branches/hotfix--login/  # Branch-specific context
    └── src/
```

### Isolation Guarantees

1. **Physical Separation**: Each branch has its own directory
2. **No Shared State**: File changes don't affect other branches
3. **Independent Terminals**: Each terminal works in its own directory
4. **Git Integration**: Commits, branches, history still shared via `.git`

### Context Management

- **Shared files** (product.md, tech-stack.md, etc.) are copied to worktrees
- **Branch context** is isolated per worktree
- **Session locks** work per worktree directory
- **Sync command** updates shared files across worktrees

---

## MANDATORY EXECUTION DIRECTIVE

**Every /maestro:worktree operation MUST use the Task tool with sub-agents.**

### Sub-Agent Routing for Worktree Operations

| Operation | Primary Agent | Secondary Agents |
|-----------|--------------|------------------|
| `create` | devops-engineer | backend-developer |
| `remove` | devops-engineer | - |
| `list` | devops-engineer | - |
| `navigate` | devops-engineer | - |
| `status` | devops-engineer | backend-developer |
| `sync` | backend-developer | - |

### Execution Pattern

```javascript
// For EVERY /maestro:worktree operation
Task({
  subagent_type: "devops-engineer", // or appropriate specialist
  prompt: "<operation details with worktree context>",
  description: "Worktree operation: <subcommand>"
})
```

---

## Worktree Protocol

When this command is invoked, follow these steps:

### /maestro:worktree create <branch>

```
1. Import WorktreeManager from skills/worktree-manager.js
2. Call detectWorktree() to verify in main repo or worktree
3. If in worktree:
   - Warn that worktrees should be created from main repo
   - Provide path to main repo
4. Call createWorktree(branch, options):
   - Creates worktree at ../repo-name-branch/
   - If --new flag, creates new branch
5. Call initializeMaestroInWorktree(worktreePath):
   - Creates maestro/ directory structure
   - Copies shared context files
6. Display success message with navigation instructions
```

### /maestro:worktree remove <branch>

```
1. Import WorktreeManager from skills/worktree-manager.js
2. Call listWorktrees() to find worktree for branch
3. If not found, show error
4. Check for uncommitted changes
5. If changes exist and no --force:
   - Show warning with list of changes
   - Ask for confirmation
6. Call removeWorktree(branch):
   - Runs git worktree remove
   - Cleans up directory
7. Display success message
```

### /maestro:worktree list

```
1. Import WorktreeManager from skills/worktree-manager.js
2. Call listWorktrees() to get all worktrees
3. For each worktree:
   a. Check if maestro/ is initialized
   b. Check for active session
   c. Get current track if any
4. Format and display worktree table
```

### /maestro:worktree navigate <branch>

```
1. Import WorktreeManager from skills/worktree-manager.js
2. Call listWorktrees() to find worktree for branch
3. If not found, show error with suggestion to create
4. Call getWorktreeInstructions(worktreePath):
   - Returns cd command
   - Returns VS Code command
   - Returns Finder/file manager command
5. Display navigation options
```

### /maestro:worktree status

```
1. Import WorktreeManager from skills/worktree-manager.js
2. Call detectWorktree():
   - Returns { isWorktree, mainRepoPath, currentBranch }
3. If in worktree:
   a. Show worktree location and branch
   b. Show link to main repo
   c. Check shared context sync status
4. If in main repo:
   a. Show main repo status
   b. List other worktrees with status
5. Display CDD status for current location
```

### /maestro:worktree sync

```
1. Import WorktreeManager from skills/worktree-manager.js
2. Call detectWorktree() to determine context:
   - If in worktree, use main repo as source
   - If in main repo, use current as source
3. Call listWorktrees() to get all worktrees
4. For each worktree:
   a. Call copySharedContext(sourceShared, targetWorktree)
   b. Track success/failure
5. Display sync summary
```

---

## Integration with Other Commands

### /maestro:cdd

When CDD mode is activated:
1. Detects if in worktree or main repo
2. Loads appropriate branch context
3. No branch switching needed (already isolated)

### /maestro:branch

Branch commands work within current worktree:
- `list` shows branches (not worktrees)
- `switch` warns if worktrees exist for better isolation
- Recommends `/maestro:worktree` for parallel work

### /maestro:session

Session management respects worktree isolation:
- Sessions are per-directory, not per-branch
- No conflicts between worktrees (separate directories)
- Notifications can reference worktree paths

---

## Error Handling

### Not in Git Repository
```
Error: Not in a git repository.

Worktrees require an initialized git repository.
Initialize git first: git init
```

### Worktree Already Exists
```
Worktree for branch 'feature/auth' already exists.

Path: /Users/.../my-app-feature-auth

To navigate there:
  /maestro:worktree navigate feature/auth
```

### Branch Not Found
```
Branch 'feature/xyz' does not exist.

Options:
1. Create branch with worktree:
   /maestro:worktree create feature/xyz --new

2. Create branch first:
   git checkout -b feature/xyz
   git checkout main
   /maestro:worktree create feature/xyz
```

### Uncommitted Changes on Remove
```
Cannot remove worktree for 'feature/auth'

Uncommitted changes detected:
  M src/auth/login.ts
  A src/auth/register.ts
  ? src/auth/temp.ts

Options:
1. Commit or stash changes first
2. Use --force to discard changes (DANGER)
```

### Cannot Create from Worktree
```
Cannot create worktree from another worktree.

Current location: /Users/.../my-app-feature-auth (worktree)
Main repository:  /Users/.../my-app

Please navigate to the main repository first:
  cd /Users/.../my-app
  /maestro:worktree create <branch>
```

---

## Best Practices

1. **Always use separate terminals** for each worktree
2. **Sync shared context** after updating product.md or tech-stack.md
3. **Remove worktrees** when branches are merged
4. **Create worktrees from main repo** for consistency
5. **Use /maestro:cdd** in each worktree to activate CDD mode
