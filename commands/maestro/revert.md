---
name: revert
description: Revert track or task changes using git-aware rollback
usage: /maestro:revert <track-id|task-id>
aliases: [undo, rollback]
---

# /maestro:revert Command

Revert changes made during track implementation. This command understands logical work units (tracks and tasks) rather than just individual commits, allowing clean rollback of features or bug fixes.

**Multi-Project Support**: Handles cross-project reverts and submodule state restoration.

## What It Does

1. **Identifies commits** - Finds all commits associated with a track or task
2. **Analyzes dependencies** - Checks what else might be affected
3. **Creates revert commits** - Safely undoes changes without losing history
4. **Updates plan status** - Resets tasks to pending state
5. **Handles submodules** - Restores submodule references for cross-project tracks
6. **Preserves context** - Keeps spec and plan for re-implementation

## Usage

```bash
# Revert entire track
/maestro:revert TRACK-002

# Revert cross-project track
/maestro:revert CROSS-001

# Revert specific project in cross-project track
/maestro:revert CROSS-001 --project frontend

# Revert all projects in cross-project track
/maestro:revert CROSS-001 --all-projects

# Include submodule reference restoration
/maestro:revert CROSS-001 --include-submodules

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
| `--project <name>` | Revert only this project (cross-project tracks) |
| `--all-projects` | Revert across all projects (cross-project tracks) |
| `--include-submodules` | Also restore submodule references |
| `--dry-run` | Show what would be reverted |
| `--force` | Skip confirmation prompts |
| `--keep-commits` | Update plan only, don't git revert |

## Revert Scenarios

### Single Project Revert

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
  ...
  a1b2c3d feat: setup auth routes

Files affected (23):
  src/auth/
  src/middleware/
  tests/auth/

This will:
  ✗ Revert all 12 commits
  ✗ Reset 12 tasks to pending [ ]
  ✓ Keep spec.md and plan.md
  ✓ Preserve track for re-implementation

Proceed with revert? (y/N)
```

### Cross-Project Revert

```bash
/maestro:revert CROSS-001 --all-projects
```

```
══════════════════════════════════════════════════════════
  REVERT CROSS-PROJECT TRACK: CROSS-001
══════════════════════════════════════════════════════════

Track: Shared Authentication
Status: Complete
Projects: frontend, backend, shared-libs

Per-Project Commits:
  shared-libs (submodule): 3 commits
    def5678, ghi9012, jkl3456

  backend (submodule): 5 commits
    mno7890, pqr1234, stu5678, vwx9012, abc1234

  frontend: 4 commits
    def7890, ghi1234, jkl5678, mno2345

  parent (submodule refs): 2 commits
    qrs4567, tuv6789

Total: 14 commits across 4 repositories

──────────────────────────────────────────────────────────
  SUBMODULE STATE RESTORATION
──────────────────────────────────────────────────────────

Submodules will be restored to:
  shared-libs: abc1234 (before track)
  backend:     xyz7890 (before track)

Parent references will be updated to match.

──────────────────────────────────────────────────────────
  IMPACT ANALYSIS
──────────────────────────────────────────────────────────

Warning: Other tracks may depend on CROSS-001:
  - CROSS-002 uses shared-libs types from this track
  - FE-003 imports auth components from this track

Options:
  1. Proceed with full revert (may break dependent tracks)
  2. Revert only non-shared code
  3. Cancel

Choice (1/2/3):
```

### Revert Specific Project Only

```bash
/maestro:revert CROSS-001 --project frontend
```

```
══════════════════════════════════════════════════════════
  PARTIAL REVERT: CROSS-001 (frontend only)
══════════════════════════════════════════════════════════

Track: Shared Authentication
Reverting: frontend project only

Commits to revert:
  frontend: 4 commits
    def7890 feat: add login component
    ghi1234 feat: add auth context
    jkl5678 feat: add protected routes
    mno2345 feat: add logout button

Other projects remain unchanged:
  shared-libs: 3 commits (keeping)
  backend: 5 commits (keeping)

After revert:
  - frontend tasks: reset to pending
  - Plan shows partial completion
  - Frontend can be re-implemented independently

⚠ Note: Backend and shared-libs changes remain.
   Frontend may not work until re-implemented.

Proceed? (y/N)
```

### Submodule Revert Details

```bash
/maestro:revert CROSS-001 --include-submodules --dry-run
```

```
══════════════════════════════════════════════════════════
  DRY RUN: REVERT CROSS-001 WITH SUBMODULES
══════════════════════════════════════════════════════════

STEP 1: Revert submodule commits

  shared-libs:
    cd libs/shared
    git revert --no-commit jkl3456
    git revert --no-commit ghi9012
    git revert --no-commit def5678
    git commit -m "revert: CROSS-001 shared-libs changes"

  backend:
    cd backend
    git revert --no-commit abc1234
    git revert --no-commit vwx9012
    git revert --no-commit stu5678
    git revert --no-commit pqr1234
    git revert --no-commit mno7890
    git commit -m "revert: CROSS-001 backend changes"

STEP 2: Update parent submodule references

  cd <workspace-root>
  git add libs/shared backend
  git commit -m "revert: restore submodule refs pre-CROSS-001"

STEP 3: Revert non-submodule project commits

  frontend:
    git revert --no-commit mno2345
    git revert --no-commit jkl5678
    git revert --no-commit ghi1234
    git revert --no-commit def7890
    git commit -m "revert: CROSS-001 frontend changes"

STEP 4: Update track files

  - Reset all tasks to [ ] in plan.md
  - Update metadata.json with revert info
  - Update cross-project-tracks.md status

No changes made (dry run).
```

## Specific Task Revert (Cross-Project)

```bash
/maestro:revert CROSS-001 --task 2.3
```

```
══════════════════════════════════════════════════════════
  REVERT TASK: CROSS-001 Task 2.3
══════════════════════════════════════════════════════════

Track: Shared Authentication
Task: 2.3 - Implement JWT validation
Project: backend (submodule)
Commit: stu5678

Dependent tasks:
  ⚠ Task 2.4 (backend) depends on 2.3 - completed
  ⚠ Task 3.1 (frontend) uses JWT validation - completed

Options:
  1. Revert 2.3 only (may break 2.4, 3.1)
  2. Revert 2.3, 2.4, 3.1 together (cascade)
  3. Cancel

If choosing option 2:
  - backend: revert stu5678, vwx9012
  - frontend: revert def7890
  - Update parent submodule refs

Choice (1/2/3):
```

## Safety Features

### Cross-Project Dependency Analysis

Before reverting:
```
Checking cross-project dependencies...

CROSS-001 changes used by:
  CROSS-002:
    - Imports: shared-libs/types/auth.ts
    - Status: Active (30% complete)

  FE-003:
    - Imports: frontend/components/AuthProvider
    - Status: Complete

  BACK-004:
    - Uses: backend/middleware/jwt.ts
    - Status: Pending (not yet started)

Risk Assessment:
  High: CROSS-002 will likely fail without auth types
  High: FE-003 will be broken
  Low:  BACK-004 not started, will just need different approach

Recommendations:
  - Revert CROSS-002 first (or together)
  - Accept FE-003 breakage and re-implement
  - BACK-004 can proceed with new approach
```

### Submodule State Verification

```
Verifying submodule states before revert...

shared-libs:
  Current:  jkl3456
  Target:   abc1234 (pre-track)
  Pushed:   Yes
  Clean:    Yes ✓

backend:
  Current:  abc1234
  Target:   xyz7890 (pre-track)
  Pushed:   No ⚠
  Clean:    Yes ✓

Warning: backend submodule has unpushed commits.
If you revert and push, these commits will be lost for others.

Options:
  1. Push backend first, then revert
  2. Revert anyway (commits stay in reflog)
  3. Cancel

Choice:
```

### Partial Cross-Project Revert

When reverting only some projects:
```
⚠ Partial cross-project revert detected

You're reverting frontend but keeping backend and shared-libs.

This may cause issues:
  - Frontend expects backend auth API (still exists)
  - Frontend imports from shared-libs (still exists)

The partial revert is likely to work because:
  - Backend API remains unchanged
  - Shared types remain available

Proceed with partial revert? (y/N)
```

## After Revert

### Single Project

The track remains in place:
- `spec.md` - Unchanged
- `plan.md` - Tasks reset to `[ ]`
- `metadata.json` - Revert recorded

### Cross-Project

Additional state:
- Per-project task status reset
- `submoduleState.after` cleared
- Cross-project-tracks.md updated

Re-implement with:
```bash
# Re-implement entire cross-project track
/maestro:implement CROSS-001 --all-projects

# Re-implement specific project portion
/maestro:implement CROSS-001 --project frontend
```

## Examples

```bash
# Preview cross-project revert
/maestro:revert CROSS-001 --all-projects --dry-run

# Revert only backend portion
/maestro:revert CROSS-001 --project backend

# Force revert with submodule restoration
/maestro:revert CROSS-001 --include-submodules --force

# Revert last task in a submodule project
/maestro:revert SHARED-001 --last 1
```

## Related Commands

- `/maestro:status` - Check current state
- `/maestro:implement` - Re-implement after revert
- `/maestro:workspace sync` - Sync submodules

---

## Revert Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Verify maestro/ directory exists

2. Determine context:
   - Check for workspace.json → Workspace mode
   - Check for project.json → Project-in-workspace mode
   - Check track prefix (CROSS-*) → Cross-project track

3. Verify track exists:
   - For single project: maestro/tracks/<TRACK-ID>/
   - For cross-project: maestro/tracks/<CROSS-ID>/
   - Check metadata.json, spec.md, plan.md

4. Check git status in all affected repos:
   - Ensure working directories are clean
   - Or warn about uncommitted changes
```

### Step 1: Identify What to Revert

```
If --task specified:
  - Find task in plan.md
  - Note which project owns the task
  - Get associated commit SHA

If --project specified (cross-project):
  - Filter to only that project's tasks
  - Collect only that project's commits

If --all-projects or entire track:
  - Parse plan.md for all completed tasks
  - Group by project
  - Collect all commit SHAs per project
  - Include submodule reference commits if applicable

If --last N:
  - Get last N completed tasks (may span projects)
  - Collect their commits by project
```

### Step 2: Analyze Dependencies

```
For single project:
  - Check if other tasks depend on reverted ones
  - Check if other tracks reference this one

For cross-project:
  - Check inter-project dependencies
  - Check if other cross-project tracks use this code
  - For submodules: check if other projects import from them
  - Build dependency graph across all projects
```

### Step 3: Check Git State Per Repository

```
For each repository involved:
  1. cd to repository
  2. Verify commits exist: git log <sha>
  3. Check if pushed: git log origin/main..HEAD
  4. Check for conflicts: git revert --no-commit <sha> && git revert --abort
  5. For submodules: check parent expects correct ref
```

### Step 4: Confirmation

```
If not --force:
  Display per-project summary:
  - Commits per repository
  - Files affected per repository
  - Tasks that will be reset
  - Submodule state changes
  - Cross-project dependencies

  Ask for confirmation
```

### Step 5: Execute Revert

**For submodule projects (in dependency order):**
```
1. cd to submodule directory
2. For each commit (newest to oldest):
   git revert --no-commit <sha>
3. git commit -m "revert: <TRACK-ID> <project> changes"
4. Record revert commit SHA
5. Return to parent directory
```

**For regular projects:**
```
1. For each commit (newest to oldest):
   git revert --no-commit <sha>
2. git commit -m "revert: <TRACK-ID> changes"
3. Record revert commit SHA
```

**For parent repository (submodule refs):**
```
1. After all submodule reverts complete
2. Update submodule references:
   - Restore to pre-track state from metadata.json
   - Or to revert commit refs
3. git add <submodule-paths>
4. git commit -m "revert: restore submodule refs pre-<TRACK-ID>"
```

### Step 6: Update Plan

```
For each reverted task:
  1. Change [x] to [ ] in plan.md
  2. Remove or mark commit SHA:
     - **Commit**: (reverted)
  3. For cross-project: update per-project task status
```

### Step 7: Update Metadata

**Single project:**
```json
{
  "status": "pending",
  "updated": "<timestamp>",
  "reverted": {
    "timestamp": "<timestamp>",
    "tasks": ["2.5", "2.6"],
    "commits": ["sha1", "sha2"]
  }
}
```

**Cross-project:**
```json
{
  "status": "pending",
  "updated": "<timestamp>",
  "reverted": {
    "timestamp": "<timestamp>",
    "perProject": {
      "frontend": {
        "tasks": ["3.1", "3.2"],
        "commits": ["sha1", "sha2"],
        "revertCommit": "sha-revert-1"
      },
      "backend": {
        "tasks": ["2.1", "2.2"],
        "commits": ["sha3", "sha4"],
        "revertCommit": "sha-revert-2"
      }
    },
    "submoduleRefs": {
      "before": {"shared-libs": "jkl3456"},
      "after": {"shared-libs": "abc1234"},
      "parentRevertCommit": "sha-revert-parent"
    }
  }
}
```

### Step 8: Update Tracks Index

```
Single project:
  Update maestro/tracks.md

Cross-project:
  Update maestro/cross-project-tracks.md
  Also update each project's tracks.md if they show participation
```

### Step 9: Report Results

```
Display per-project:
  - Commits reverted
  - Tasks reset
  - Submodule state restored (if applicable)
  - New track progress

Suggest next steps:
  - "/maestro:implement <TRACK-ID> to restart"
  - "/maestro:workspace sync to verify submodule state"
```

### Error Handling

```
If git revert fails in any repo:
  1. Abort that repo's revert: git revert --abort
  2. Report which repo failed
  3. If partial revert occurred: warn about inconsistent state
  4. Suggest manual resolution

If submodule ref update fails:
  1. Report the error
  2. Submodule commits are reverted but parent not updated
  3. Suggest manual: git add <submodule> && git commit

If cross-project dependency prevents revert:
  1. Show which tracks/projects block
  2. Suggest reverting dependencies first
  3. Or offer --force to proceed anyway
```
