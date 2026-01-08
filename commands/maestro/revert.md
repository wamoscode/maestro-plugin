---
name: revert
description: Revert track or task changes using git-aware rollback
usage: /maestro:revert <track-id|task-id>
aliases: [undo, rollback]
---

# /maestro:revert Command

Revert changes made during track implementation. This command understands logical work units (tracks and tasks) rather than just individual commits, allowing clean rollback of features or bug fixes.

## What It Does

1. **Identifies commits** - Finds all commits associated with a track or task
2. **Analyzes dependencies** - Checks what else might be affected
3. **Creates revert commits** - Safely undoes changes without losing history
4. **Updates plan status** - Resets tasks to pending state
5. **Preserves context** - Keeps spec and plan for re-implementation

## Usage

```bash
# Revert entire track
/maestro:revert TRACK-002

# Revert specific task
/maestro:revert TRACK-002 --task 2.3

# Revert last N tasks
/maestro:revert TRACK-002 --last 3

# Preview without reverting
/maestro:revert TRACK-002 --dry-run

# Force revert (skip confirmations)
/maestro:revert TRACK-002 --force
```

## Options

| Option | Description |
|--------|-------------|
| `--task <id>` | Revert specific task only |
| `--last <n>` | Revert last N completed tasks |
| `--dry-run` | Show what would be reverted |
| `--force` | Skip confirmation prompts |
| `--keep-commits` | Update plan only, don't git revert |

## Revert Scenarios

### Revert Entire Track

```bash
/maestro:revert TRACK-002
```

```
══════════════════════════════════════════════════════════
  REVERT TRACK: TRACK-002
══════════════════════════════════════════════════════════

Track: User Authentication
Status: In Progress (60% complete)

Commits to revert (12 total):
  z9y8x7w feat: add password reset flow
  v6u5t4s feat: implement logout endpoint
  r3q2p1o feat: add token refresh
  ...
  a1b2c3d feat: setup auth routes

Files affected (23):
  src/auth/
  src/middleware/
  tests/auth/
  ...

This will:
  ✗ Revert all 12 commits
  ✗ Reset 12 tasks to pending [ ]
  ✓ Keep spec.md and plan.md
  ✓ Preserve track for re-implementation

Proceed with revert? (y/N)
```

### Revert Specific Task

```bash
/maestro:revert TRACK-002 --task 2.5
```

```
══════════════════════════════════════════════════════════
  REVERT TASK: 2.5
══════════════════════════════════════════════════════════

Track: TRACK-002 (User Authentication)
Task: 2.5 - Add password hashing

Commit: m4n5o6p
Files affected:
  src/auth/password.ts
  src/auth/password.test.ts
  package.json (bcrypt added)

Dependent tasks:
  ⚠ Task 2.6 depends on 2.5 (also completed)
  ⚠ Task 2.7 depends on 2.5 (also completed)

Options:
  1. Revert task 2.5 only (may break 2.6, 2.7)
  2. Revert tasks 2.5, 2.6, 2.7 together
  3. Cancel

Choice (1/2/3):
```

### Revert Last N Tasks

```bash
/maestro:revert TRACK-002 --last 3
```

```
══════════════════════════════════════════════════════════
  REVERT LAST 3 TASKS
══════════════════════════════════════════════════════════

Track: TRACK-002 (User Authentication)

Tasks to revert:
  [x] 2.7 - Add rate limiting (commit: x1y2z3a)
  [x] 2.6 - Implement session management (commit: b4c5d6e)
  [x] 2.5 - Add password hashing (commit: m4n5o6p)

After revert:
  - Track status: In Progress
  - Current task: 2.5 (pending)
  - Progress: 40% → 25%

Proceed? (y/N)
```

## Dry Run Output

```bash
/maestro:revert TRACK-002 --dry-run
```

```
══════════════════════════════════════════════════════════
  DRY RUN: REVERT TRACK-002
══════════════════════════════════════════════════════════

Would revert:
  - 12 commits
  - 23 files
  - 12 tasks reset to pending

Commands that would run:
  git revert --no-commit z9y8x7w
  git revert --no-commit v6u5t4s
  git revert --no-commit r3q2p1o
  ...
  git commit -m "revert: TRACK-002 User Authentication"

Plan updates:
  - [x] → [ ] Task 2.1
  - [x] → [ ] Task 2.2
  ...

No changes made (dry run).
```

## After Revert

The track remains in place with:
- `spec.md` - Unchanged (requirements still valid)
- `plan.md` - Tasks reset to `[ ]` pending
- `metadata.json` - Status updated, revert recorded

You can re-implement with:
```bash
/maestro:implement TRACK-002
```

## Safety Features

### Dependency Checking

Before reverting, checks for:
- Tasks that depend on what's being reverted
- Other tracks that might be affected
- Uncommitted local changes

### Unpushed Commits

If commits haven't been pushed:
```
These commits haven't been pushed to remote.
Options:
  1. Revert (create revert commits)
  2. Reset (remove commits entirely) ⚠ destructive
  3. Cancel

Choice:
```

### Conflict Detection

If revert would cause conflicts:
```
⚠ Revert would cause conflicts in:
  - src/auth/middleware.ts
  - src/routes/api.ts

Options:
  1. Proceed (resolve conflicts manually)
  2. Abort

Choice:
```

## Examples

```bash
# Preview what reverting the auth feature would do
/maestro:revert TRACK-002 --dry-run

# Quickly undo last task
/maestro:revert TRACK-002 --last 1 --force

# Revert just the password hashing implementation
/maestro:revert TRACK-002 --task 2.5
```

## Related Commands

- `/maestro:status` - Check current state
- `/maestro:implement` - Re-implement after revert

---

## Revert Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Verify maestro/ directory exists
2. Verify track exists:
   - maestro/tracks/<TRACK-ID>/
   - metadata.json, spec.md, plan.md

3. Check git status:
   - Ensure working directory is clean
   - Or warn about uncommitted changes
```

### Step 1: Identify What to Revert

```
If --task specified:
  - Find task in plan.md
  - Get associated commit SHA
  - Identify single commit to revert

If --last N specified:
  - Parse plan.md for last N completed tasks
  - Collect their commit SHAs

If entire track:
  - Parse plan.md for all completed tasks
  - Collect all commit SHAs
  - Order from newest to oldest
```

### Step 2: Analyze Dependencies

```
For each task being reverted:
  1. Check if other tasks depend on it
  2. Check if those tasks are also completed
  3. If yes: warn user about cascade

For entire track:
  1. Check if other tracks reference this one
  2. Warn about potential cross-track issues
```

### Step 3: Check Git State

```
1. Verify commits exist in history
2. Check if commits have been pushed:
   git log origin/main..HEAD
3. Identify potential conflicts:
   git revert --no-commit <sha> (then abort)
```

### Step 4: Confirmation

```
If not --force:
  Display summary of what will be reverted:
  - Number of commits
  - Files affected
  - Tasks that will be reset
  - Dependencies/warnings

  Ask for confirmation
```

### Step 5: Execute Revert

```
Option A: Multi-commit revert (default)
  For each commit (newest to oldest):
    git revert --no-commit <sha>

  Then:
    git commit -m "revert: <TRACK-ID> <description>"

Option B: Squashed revert
  git revert --no-commit <oldest-sha>^..<newest-sha>
  git commit -m "revert: <TRACK-ID> <description>"
```

### Step 6: Update Plan

```
For each reverted task:
  1. Change [x] to [ ] in plan.md
  2. Remove or mark commit SHA as reverted
  3. Add revert note:
     - **Reverted**: <timestamp>
```

### Step 7: Update Metadata

```
Update metadata.json:
{
  "status": "pending" or "in_progress",
  "updated": "<timestamp>",
  "reverted": {
    "timestamp": "<timestamp>",
    "tasks": ["2.5", "2.6", "2.7"],
    "commits": ["sha1", "sha2", "sha3"]
  }
}
```

### Step 8: Update Tracks Index

```
If track status changed:
  Update maestro/tracks.md with new status
```

### Step 9: Report Results

```
Display:
  - Number of commits reverted
  - Tasks reset to pending
  - New track progress percentage
  - Next steps

Suggest:
  "/maestro:implement <TRACK-ID> to restart"
```

### Error Handling

```
If git revert fails:
  1. Abort the revert: git revert --abort
  2. Report the error
  3. Suggest manual resolution

If conflicts occur:
  1. Report conflicted files
  2. Options:
     - Continue with manual resolution
     - Abort entirely
```

### --keep-commits Mode

```
If --keep-commits specified:
  1. Skip all git operations
  2. Only update plan.md task statuses
  3. Only update metadata.json
  4. Useful when git was already handled manually
```
