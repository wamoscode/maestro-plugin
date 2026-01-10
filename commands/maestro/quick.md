---
name: quick
description: Execute common CDD actions with minimal input
usage: /maestro:quick <action> [args]
aliases: [q, fast]
---

# /maestro:quick Command

Fast shortcuts for common CDD operations. Minimal input, maximum efficiency.

## Purpose

Speed up common workflows without typing full commands:
- Start/complete tasks quickly
- Add blockers and notes
- Run quality checks
- Navigate between tracks

## Usage

```bash
# Quick actions
/maestro:quick start           # Start next pending task
/maestro:quick done            # Complete current task
/maestro:quick blocker "msg"   # Add blocker to current task
/maestro:quick note "msg"      # Add note to current track
/maestro:quick check           # Run phase checkpoint
/maestro:quick next            # Move to next task
/maestro:quick switch TRACK-X  # Switch active track
```

## Actions

### start - Start Next Task

Starts the next pending task in the current track.

```bash
/maestro:quick start
```

**Output:**
```
✓ Started: Task 2.3 - Implement token validation
  Agent: backend-developer
  Track: TRACK-005 - User Authentication
```

### done - Complete Current Task

Marks the current in-progress task as complete.

```bash
/maestro:quick done
```

**With commit SHA:**
```bash
/maestro:quick done --commit abc123
```

**Output:**
```
✓ Completed: Task 2.3 - Implement token validation
  Duration: 2h 15m
  Commit: abc123

  Next: Task 2.4 - Add error handling
  Run `/maestro:quick start` to begin
```

### blocker - Add Blocker

Adds a blocker to the current task/track.

```bash
/maestro:quick blocker "Waiting for API credentials"
```

**Output:**
```
⚠ Blocker added to TRACK-005:
  "Waiting for API credentials"

  Track status: Blocked
  Consider: /maestro:stash push TRACK-005
```

### unblock - Remove Blocker

Removes a blocker from the current track.

```bash
/maestro:quick unblock
```

**Or by index:**
```bash
/maestro:quick unblock 1
```

**Output:**
```
✓ Blocker resolved: "Waiting for API credentials"
  Track status: Active
```

### note - Add Note

Adds a note to the current track's progress log.

```bash
/maestro:quick note "Decided to use JWT with 1h expiry"
```

**Output:**
```
✓ Note added to TRACK-005:
  "Decided to use JWT with 1h expiry"
```

### check - Run Quality Check

Runs the phase checkpoint for current track.

```bash
/maestro:quick check
```

**Output:**
```
Running phase checkpoint for TRACK-005...

┌─────────────────────────────────────────────┐
│ PHASE 2 CHECKPOINT                          │
├─────────────────────────────────────────────┤
│ ✓ Lint check         PASSED                 │
│ ✓ Type check         PASSED                 │
│ ✓ Unit tests         PASSED (42 tests)      │
│ ✓ Coverage           84% (≥80%)             │
├─────────────────────────────────────────────┤
│ Result: PASSED                              │
│ Ready to proceed to Phase 3                 │
└─────────────────────────────────────────────┘
```

### next - Move to Next Task

Completes current task and starts the next one.

```bash
/maestro:quick next
```

**Equivalent to:**
```bash
/maestro:quick done && /maestro:quick start
```

**Output:**
```
✓ Completed: Task 2.3 - Implement token validation
✓ Started: Task 2.4 - Add error handling
  Agent: backend-developer
```

### switch - Switch Active Track

Changes the active track context.

```bash
/maestro:quick switch TRACK-007
```

**Output:**
```
✓ Switched to: TRACK-007 - Payment Integration
  Phase: 1/4 - Research & Design
  Current task: 1.2 - API documentation review
  Progress: 20%
```

### status - Quick Status

Shows minimal status of current track.

```bash
/maestro:quick status
```

**Output:**
```
TRACK-005: User Authentication
├── Phase: 2/3 (Implementation)
├── Task: 2.3 - Implement token validation [IN PROGRESS]
├── Progress: 70%
└── Blockers: None
```

### list - List All Tracks

Quick list of all tracks with status.

```bash
/maestro:quick list
```

**Output:**
```
TRACKS
├── TRACK-005  User Authentication     [ACTIVE]  70%
├── TRACK-007  Payment Integration     [ACTIVE]  20%
├── TRACK-003  Email Integration       [STASHED] 45%
├── TRACK-006  Dashboard Widgets       [PENDING] 0%
└── TRACK-001  Initial Setup           [DONE]    100%
```

### adr - Quick ADR

Creates a quick Architecture Decision Record.

```bash
/maestro:quick adr "Use JWT for authentication tokens"
```

**Output:**
```
✓ ADR-0004 created: Use JWT for authentication tokens
  Status: Proposed
  Linked to: TRACK-005

  Edit: maestro/decisions/0004.md
```

### agent - Assign Agent

Assigns an agent to current task.

```bash
/maestro:quick agent security-auditor
```

**Output:**
```
✓ Agent assigned to Task 2.3:
  Primary: backend-developer
  Added: security-auditor (secondary)
```

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│ QUICK ACTIONS REFERENCE                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TASK MANAGEMENT                                              │
│   /q start              Start next pending task             │
│   /q done               Complete current task               │
│   /q next               Done + Start next                   │
│   /q status             Current track status                │
│                                                              │
│ ANNOTATIONS                                                  │
│   /q blocker "msg"      Add blocker                         │
│   /q unblock            Remove blocker                      │
│   /q note "msg"         Add progress note                   │
│   /q adr "decision"     Create quick ADR                    │
│                                                              │
│ QUALITY                                                      │
│   /q check              Run phase checkpoint                │
│   /q coverage           Check test coverage                 │
│                                                              │
│ NAVIGATION                                                   │
│   /q switch TRACK-X     Switch active track                 │
│   /q list               List all tracks                     │
│                                                              │
│ AGENTS                                                       │
│   /q agent <name>       Assign agent to task                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Options

| Option | Description |
|--------|-------------|
| `--commit <sha>` | Attach commit SHA to done |
| `--force` | Force action without confirmation |
| `--quiet` | Minimal output |

## Related Commands

- `/maestro:implement` - Full implementation mode
- `/maestro:status` - Detailed status
- `/maestro:stash` - Pause/resume tracks

---

## Quick Command Protocol

When this command is invoked, follow this protocol:

### Determine Active Track

```
1. Check for explicitly specified track
2. If not specified, use most recently active track
3. If no active track, prompt user to select
```

### Action Dispatch

```
For each action:

start:
  1. Find next pending task in current track
  2. Mark task as in_progress
  3. Record start time
  4. Update metadata.json
  5. Display confirmation

done:
  1. Get current in_progress task
  2. Mark task as completed
  3. Record completion time and commit
  4. Update metadata.json
  5. Check if phase complete
  6. Display next task

blocker:
  1. Add blocker to track metadata
  2. Update track status to "blocked"
  3. Display confirmation

note:
  1. Add to track's notes array
  2. Include timestamp
  3. Display confirmation

check:
  1. Load quality gate config
  2. Execute phase checkpoint
  3. Display results
  4. Update metadata with results

switch:
  1. Validate target track exists
  2. Update active track context
  3. Display track summary
```

### Output Format

```
Use minimal, scannable output:
- ✓ for success
- ⚠ for warning
- ✗ for failure
- Use indentation for details
- Show next action suggestion
```
