---
name: status
description: Display project progress and track status overview
usage: /maestro:status [track-id]
aliases: [st, progress]
---

# /maestro:status Command

Display the current status of your project or workspace, including all tracks, progress metrics, and active work.

**Multi-Project Support**: In workspaces, view status per-project, across all projects, or for cross-project tracks.

**NEW in v1.8: Multi-Branch Session Support**
- Shows current session information
- Displays other branches with active sessions
- Shows pending notifications from other sessions
- Tracks are now branch-specific

## What It Does

1. **Shows project/workspace overview** - Product name, total tracks, overall progress
2. **Lists all tracks** - With status, type, and completion percentage
3. **Highlights active work** - Current task and assigned agents
4. **Identifies blockers** - Any issues preventing progress
5. **Shows recent activity** - Recently completed tasks
6. **Submodule status** - Git submodule sync state (workspace mode)

## Usage

```bash
# Current project status
/maestro:status

# All projects in workspace
/maestro:status --all

# Specific track status
/maestro:status TRACK-001

# Cross-project tracks only
/maestro:status --cross-project

# Specific project status
/maestro:status --project backend

# Include submodule state
/maestro:status --submodules

# Compact view
/maestro:status --compact

# Show all branches with sessions (v1.8)
/maestro:status --sessions

# Show all branches with context (v1.8)
/maestro:status --branches
```

## Options

| Option | Description |
|--------|-------------|
| `--all` | Show status for all projects in workspace |
| `--project <name>` | Show status for specific project |
| `--cross-project` | Show only cross-project tracks |
| `--submodules` | Include git submodule status |
| `--active` | Show only in-progress tracks |
| `--completed` | Show only completed tracks |
| `--compact` | Minimal output format |
| `--verbose` | Show detailed task breakdown |
| `--json` | Output as JSON |
| `--sessions` | Show all active sessions (v1.8) |
| `--branches` | Show all branches with CDD context (v1.8) |

## Output Formats

### Single Project Status

```
══════════════════════════════════════════════════════════
  MAESTRO STATUS
══════════════════════════════════════════════════════════

Project: My Application
Workflow: TDD (Test-Driven Development)
Last Updated: 2024-01-08 14:32:00

──────────────────────────────────────────────────────────
  SESSION INFO (v1.8)
──────────────────────────────────────────────────────────

Session: session-abc123 (active)
Branch: main *
Started: 30 minutes ago
Lock Status: Acquired

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

──────────────────────────────────────────────────────────
  ALL TRACKS (branch: main)
──────────────────────────────────────────────────────────

│ ID        │ Type    │ Title                  │ Status    │ Progress │
│───────────│─────────│────────────────────────│───────────│──────────│
│ TRACK-001 │ Chore   │ Project Setup          │ Completed │ 100%     │
│ TRACK-002 │ Feature │ User Authentication    │ Active    │ 40%      │
│ TRACK-003 │ Feature │ Dashboard Analytics    │ Pending   │ 0%       │

──────────────────────────────────────────────────────────
  OTHER ACTIVE SESSIONS (v1.8)
──────────────────────────────────────────────────────────

│ Branch         │ Session        │ Track      │ Last Activity │
│────────────────│────────────────│────────────│───────────────│
│ feature/auth   │ session-def456 │ TRACK-004  │ 5 min ago     │
│ feature/pay    │ session-ghi789 │ -          │ 12 min ago    │

──────────────────────────────────────────────────────────
  PENDING NOTIFICATIONS (v1.8)
──────────────────────────────────────────────────────────

🔔 [HIGH] Session on 'feature/auth' requires input
   "Approve Phase 2 checkpoint for TRACK-004"
   Run: /maestro:branch switch feature/auth

══════════════════════════════════════════════════════════
```

### Workspace Status (--all)

```
══════════════════════════════════════════════════════════
  WORKSPACE STATUS: my-platform
══════════════════════════════════════════════════════════

Projects: 4  │  Total Tracks: 12  │  Active: 3  │  Cross-Project: 2

──────────────────────────────────────────────────────────
  PROJECT SUMMARY
──────────────────────────────────────────────────────────

│ Project      │ Type       │ Tracks │ Active │ Progress │
│──────────────│────────────│────────│────────│──────────│
│ frontend *   │ repository │ 5      │ 1      │ 65%      │
│ backend      │ submodule  │ 3      │ 1      │ 40%      │
│ shared-libs  │ submodule  │ 2      │ 0      │ 100%     │
│ packages/ui  │ package    │ 2      │ 1      │ 30%      │

* = active project

──────────────────────────────────────────────────────────
  CROSS-PROJECT TRACKS
──────────────────────────────────────────────────────────

│ ID        │ Title                    │ Projects              │ Progress │
│───────────│──────────────────────────│───────────────────────│──────────│
│ CROSS-001 │ Shared Authentication    │ frontend, backend     │ 60%      │
│ CROSS-002 │ API Version 2            │ backend, shared-libs  │ 25%      │

──────────────────────────────────────────────────────────
  SUBMODULE STATUS
──────────────────────────────────────────────────────────

│ Submodule   │ Commit  │ Status                        │
│─────────────│─────────│───────────────────────────────│
│ backend     │ abc1234 │ ✓ In sync with parent         │
│ shared-libs │ def5678 │ ⚠ 2 commits ahead (unpushed) │

──────────────────────────────────────────────────────────
  ACTIVE WORK
──────────────────────────────────────────────────────────

frontend:
  → FE-003: Add dark mode toggle (ui-designer)

backend:
  → BACK-002: Implement rate limiting (backend-developer)

CROSS-001:
  → Task 3.2: Frontend auth integration (frontend-developer)

══════════════════════════════════════════════════════════
```

### Cross-Project Status (--cross-project)

```
══════════════════════════════════════════════════════════
  CROSS-PROJECT TRACKS
══════════════════════════════════════════════════════════

Workspace: my-platform
Total Cross-Project Tracks: 2

──────────────────────────────────────────────────────────
  CROSS-001: Shared Authentication
──────────────────────────────────────────────────────────

Projects: frontend, backend, shared-libs
Status: Active
Overall Progress: [████████████░░░░░░░░] 60%

Per-Project Progress:
  shared-libs [████████████████████] 100% (3/3 tasks)
  backend     [████████████████░░░░] 80%  (4/5 tasks)
  frontend    [████░░░░░░░░░░░░░░░░] 20%  (1/5 tasks)

Current Tasks:
  → frontend: Task 3.2 - Auth integration (frontend-developer)

Commits:
  shared-libs: abc1234, def5678
  backend: ghi9012, jkl3456, mno7890

──────────────────────────────────────────────────────────
  CROSS-002: API Version 2
──────────────────────────────────────────────────────────

Projects: backend, shared-libs
Status: Active
Overall Progress: [█████░░░░░░░░░░░░░░░] 25%

Per-Project Progress:
  shared-libs [██████████░░░░░░░░░░] 50% (2/4 tasks)
  backend     [░░░░░░░░░░░░░░░░░░░░] 0%  (0/6 tasks)

Blocked: Waiting on shared-libs types to complete

══════════════════════════════════════════════════════════
```

### Specific Project Status (--project backend)

```
══════════════════════════════════════════════════════════
  PROJECT: backend
══════════════════════════════════════════════════════════

Type: Git Submodule
Parent Workspace: my-platform
Track Prefix: BACK

Git Status:
  Branch: main
  Remote: git@github.com:org/backend.git
  Status: 2 commits ahead of parent reference
  Uncommitted: 0 files

──────────────────────────────────────────────────────────
  TRACKS
──────────────────────────────────────────────────────────

│ ID       │ Type    │ Title              │ Status │ Progress │
│──────────│─────────│────────────────────│────────│──────────│
│ BACK-001 │ Feature │ User API           │ Done   │ 100%     │
│ BACK-002 │ Feature │ Rate Limiting      │ Active │ 60%      │
│ BACK-003 │ Bug     │ Memory Leak Fix    │ Pending│ 0%       │

Cross-Project Participation:
  CROSS-001: Shared Authentication (80% complete)
  CROSS-002: API Version 2 (0% - waiting)

──────────────────────────────────────────────────────────
  ACTIVE WORK
──────────────────────────────────────────────────────────

BACK-002: Rate Limiting
  → Task 3: Implement sliding window counter
    Agent: backend-developer
    Started: 15 minutes ago

══════════════════════════════════════════════════════════
```

### Compact Workspace View

```
/maestro:status --all --compact
```

```
Workspace: my-platform │ 4 projects │ 12 tracks │ 45% complete

frontend *   ████████████████░░░░ 65%  │ 5 tracks │ 1 active
backend      ████████░░░░░░░░░░░░ 40%  │ 3 tracks │ 1 active
shared-libs  ████████████████████ 100% │ 2 tracks │ 0 active
packages/ui  ██████░░░░░░░░░░░░░░ 30%  │ 2 tracks │ 1 active

Cross-Project: CROSS-001 (60%), CROSS-002 (25%)

Active: FE-003, BACK-002, CROSS-001/Task-3.2
```

## Examples

```bash
# See all workspace activity
/maestro:status --all

# Check specific project
/maestro:status --project backend

# View cross-project track details
/maestro:status CROSS-001

# Check submodule sync status
/maestro:status --submodules

# Export status as JSON
/maestro:status --all --json > status.json
```

## Related Commands

- `/maestro:projects` - Switch between projects
- `/maestro:newTrack` - Create a new track
- `/maestro:implement` - Continue implementation
- `/maestro:revert` - Undo track or task
- `/maestro:workspace sync` - Sync submodules
- `/maestro:branch` - Manage branches with CDD context (v1.8)
- `/maestro:session` - Manage sessions and notifications (v1.8)

---

## Status Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Check maestro/ directory exists
   - If not: "No Maestro project found. Run /maestro:setup first."

2. Determine context structure (v1.8):
   - Check for maestro/branches/ → Branch-aware mode
   - Check for maestro/shared/ → Branch-aware mode
   - Else: Legacy mode

3. Determine workspace context:
   - Check for workspace.json → Workspace mode
   - Check for project.json → Project-in-workspace mode
   - Else: Single project mode

4. Check required files based on mode
```

### Step 0.5: Session Status (v1.8)

```
1. Get current git branch:
   - Run: git branch --show-current

2. Check for active session:
   - Read: maestro/branches/{branch}/active-session.lock
   - Parse session info (sessionId, startedAt, lastActivity)

3. Read session registry:
   - Read: maestro/sessions/registry.json
   - List all active sessions on other branches

4. Check for pending notifications:
   - List: maestro/notifications/pending/*.json
   - Filter: exclude own session, exclude expired
   - Sort: by priority (high first), then by time
```

### Step 1: Read Context

**Branch-Aware Mode (v1.8):**
```
1. Read shared context:
   - maestro/shared/product.md for project name
   - maestro/shared/workflow.md for workflow type
2. Read branch-specific context:
   - maestro/branches/{branch}/context.json
   - maestro/branches/{branch}/tracks.md for track index
```

**Legacy Single Project:**
```
1. Read maestro/product.md for project name
2. Read maestro/workflow.md for workflow type
3. Read maestro/tracks.md for track index
```

**Workspace:**
```
1. Read maestro/workspace.json
2. Read maestro/cross-project-tracks.md
3. For each project (or specified --project):
   - Read <project>/maestro/tracks.md
   - Read <project>/maestro/project.json
```

### Step 2: Gather Track Data

```
For each track in tracks:
  1. Read tracks/<TRACK-ID>/metadata.json
  2. Read tracks/<TRACK-ID>/plan.md
  3. Parse task statuses:
     - [ ] = pending
     - [~] = in progress
     - [x] = completed
  4. Calculate progress percentage
  5. Identify current phase
  6. For cross-project: calculate per-project progress
```

### Step 3: Calculate Metrics

**Single Project:**
```
- Total tracks
- Tracks by status
- Total tasks
- Tasks by status
- Overall progress
```

**Workspace:**
```
Per-project metrics plus:
- Total projects
- Projects by activity
- Cross-project track count
- Workspace-level progress
- Submodule sync status
```

### Step 4: Submodule Status (if applicable)

```
For each submodule project:
  1. Run: git submodule status <path>
  2. Parse current commit
  3. Compare to parent's expected ref
  4. Check for uncommitted changes
  5. Report sync status:
     - "In sync"
     - "N commits ahead"
     - "N commits behind"
     - "Modified locally"
```

### Step 5: Identify Active Work

```
Find tasks marked [~] (in progress):
- Track ID
- Task number and description
- Project (for cross-project)
- Assigned agents
- Start time

For workspace: group by project
```

### Step 6: Check for Blockers

```
Scan plan.md files for:
- Tasks marked BLOCKED
- Unmet dependencies
- Failed checkpoints
- Submodule sync issues

For cross-project:
- Check inter-project dependencies
- Verify shared code availability
```

### Step 7: Format Output

Based on options and mode:
- Single project view
- Workspace summary view
- Cross-project detail view
- Specific project view
- Compact view
- Sessions view (--sessions) (v1.8)
- Branches view (--branches) (v1.8)

Use visual formatting:
- Box drawing characters
- Progress bars
- Status indicators
- Color hints (if supported)

**Include in output (v1.8):**
- Current session info
- Other active sessions
- Pending notifications (high priority shown as banner)
- Branch context mode indicator

### Error Handling

```
Track not found:
  "Track <ID> not found. Use /maestro:status to see all tracks."

Project not found (workspace):
  "Project '<name>' not found. Available: frontend, backend, ..."

No tracks exist:
  "No tracks found. Create one with /maestro:newTrack"

Submodule issues:
  "Submodule '<name>' has sync issues. Run /maestro:workspace sync"
```
