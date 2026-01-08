---
name: status
description: Display project progress and track status overview
usage: /maestro:status [track-id]
aliases: [st, progress]
---

# /maestro:status Command

Display the current status of your project, including all tracks, progress metrics, and active work.

## What It Does

1. **Shows project overview** - Product name, total tracks, overall progress
2. **Lists all tracks** - With status, type, and completion percentage
3. **Highlights active work** - Current task and assigned agents
4. **Identifies blockers** - Any issues preventing progress
5. **Shows recent activity** - Recently completed tasks

## Usage

```bash
# Full project status
/maestro:status

# Specific track status
/maestro:status TRACK-001

# Show only active tracks
/maestro:status --active

# Compact view
/maestro:status --compact
```

## Options

| Option | Description |
|--------|-------------|
| `--active` | Show only in-progress tracks |
| `--completed` | Show only completed tracks |
| `--compact` | Minimal output format |
| `--verbose` | Show detailed task breakdown |

## Output Format

### Full Project Status

```
══════════════════════════════════════════════════════════
  MAESTRO STATUS
══════════════════════════════════════════════════════════

Project: My Application
Workflow: TDD (Test-Driven Development)
Last Updated: 2024-01-08 14:32:00

──────────────────────────────────────────────────────────
  SUMMARY
──────────────────────────────────────────────────────────

Tracks:  3 total  │  1 active  │  1 completed  │  1 pending
Tasks:   24 total │  8 done    │  2 in progress │  14 pending

Overall Progress: [████████░░░░░░░░░░░░] 33%

──────────────────────────────────────────────────────────
  ACTIVE TRACK
──────────────────────────────────────────────────────────

TRACK-002: User Authentication
Type: Feature  │  Phase: 2/4  │  Progress: 40%

Current Task:
  → Task 2.3: Implement JWT middleware
    Agents: security-auditor, backend-developer
    Status: In Progress
    Started: 10 minutes ago

Next Task:
  ○ Task 2.4: Create token refresh endpoint

──────────────────────────────────────────────────────────
  ALL TRACKS
──────────────────────────────────────────────────────────

│ ID        │ Type    │ Title                  │ Status    │ Progress │
│───────────│─────────│────────────────────────│───────────│──────────│
│ TRACK-001 │ Chore   │ Project Setup          │ Completed │ 100%     │
│ TRACK-002 │ Feature │ User Authentication    │ Active    │ 40%      │
│ TRACK-003 │ Feature │ Dashboard Analytics    │ Pending   │ 0%       │

──────────────────────────────────────────────────────────
  RECENT ACTIVITY
──────────────────────────────────────────────────────────

✓ Task 2.2: Create user model (sql-pro) - 25m ago
✓ Task 2.1: Setup auth routes (backend-developer) - 1h ago
✓ Task 1.5: Initialize project structure (devops-engineer) - 2h ago

──────────────────────────────────────────────────────────
  BLOCKERS
──────────────────────────────────────────────────────────

None

══════════════════════════════════════════════════════════
```

### Specific Track Status

```
/maestro:status TRACK-002
```

```
══════════════════════════════════════════════════════════
  TRACK-002: User Authentication
══════════════════════════════════════════════════════════

Type: Feature
Priority: High
Created: 2024-01-08 10:00:00
Status: In Progress

Specification: maestro/tracks/TRACK-002/spec.md
Plan: maestro/tracks/TRACK-002/plan.md

──────────────────────────────────────────────────────────
  PROGRESS
──────────────────────────────────────────────────────────

Phase 1: Database Setup       [████████████████████] 100%
Phase 2: Backend Auth         [████████░░░░░░░░░░░░] 40%
Phase 3: Frontend Integration [░░░░░░░░░░░░░░░░░░░░] 0%
Phase 4: Testing & Security   [░░░░░░░░░░░░░░░░░░░░] 0%

Overall: [████████░░░░░░░░░░░░] 35% (7/20 tasks)

──────────────────────────────────────────────────────────
  PHASE 2 TASKS
──────────────────────────────────────────────────────────

[x] 2.1 Setup auth routes (backend-developer)
    Commit: a1b2c3d
[x] 2.2 Create user model (sql-pro)
    Commit: e4f5g6h
[~] 2.3 Implement JWT middleware (security-auditor)
    Started: 10 minutes ago
[ ] 2.4 Create token refresh endpoint
[ ] 2.5 Add password hashing

──────────────────────────────────────────────────────────
  COMMITS
──────────────────────────────────────────────────────────

a1b2c3d - feat: add auth route handlers (2h ago)
e4f5g6h - feat: create user database model (1h ago)

══════════════════════════════════════════════════════════
```

### Compact View

```
/maestro:status --compact
```

```
Maestro: My Application │ 3 tracks │ 33% complete

TRACK-001 Chore   Project Setup         ████████████████████ 100%
TRACK-002 Feature User Authentication   ████████░░░░░░░░░░░░  40% ← active
TRACK-003 Feature Dashboard Analytics   ░░░░░░░░░░░░░░░░░░░░   0%

Current: Task 2.3 - Implement JWT middleware (security-auditor)
```

## Examples

```bash
# See what's currently being worked on
/maestro:status --active

# Check specific track progress
/maestro:status FEAT-042

# Get full task breakdown
/maestro:status TRACK-002 --verbose
```

## Related Commands

- `/maestro:newTrack` - Create a new track
- `/maestro:implement` - Continue implementation
- `/maestro:revert` - Undo track or task

---

## Status Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Check maestro/ directory exists
   - If not: "No Maestro project found. Run /maestro:setup first."

2. Check required files:
   - maestro/tracks.md
   - maestro/product.md
   - If missing: "Project not fully initialized."
```

### Step 1: Read Project Context

```
1. Read maestro/product.md for project name
2. Read maestro/workflow.md for workflow type
3. Read maestro/tracks.md for track index
```

### Step 2: Gather Track Data

```
For each track in tracks.md:
  1. Read maestro/tracks/<TRACK-ID>/metadata.json
  2. Read maestro/tracks/<TRACK-ID>/plan.md
  3. Parse task statuses:
     - [ ] = pending
     - [~] = in progress
     - [x] = completed
  4. Calculate progress percentage
  5. Identify current phase
```

### Step 3: Calculate Metrics

```
- Total tracks
- Tracks by status (pending, active, completed)
- Total tasks across all tracks
- Tasks by status
- Overall progress percentage
```

### Step 4: Identify Active Work

```
Find tasks marked [~] (in progress):
- Track ID
- Task number and description
- Assigned agents
- Start time (if recorded)

Find next pending task:
- First [ ] task in active track
```

### Step 5: Check for Blockers

```
Scan plan.md files for:
- Tasks marked with BLOCKED
- Unmet dependencies
- Failed verification checkpoints
```

### Step 6: Gather Recent Activity

```
Read git log or plan.md for:
- Recently completed tasks (last 5)
- Commit SHAs
- Timestamps
- Assigned agents
```

### Step 7: Format Output

Based on options (--compact, --verbose, specific track):
- Format appropriate view
- Use box drawing characters for visual structure
- Highlight active items
- Show progress bars

### Specific Track Mode

If track ID provided:
```
1. Validate track exists
2. Read all track files
3. Show detailed phase breakdown
4. List all tasks with status
5. Show commit history for track
```

### Error Handling

```
If track not found:
  "Track <ID> not found. Use /maestro:status to see all tracks."

If no tracks exist:
  "No tracks found. Create one with /maestro:newTrack"

If files corrupted:
  Report specific file issue
  Suggest manual inspection
```
