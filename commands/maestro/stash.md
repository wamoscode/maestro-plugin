---
name: stash
description: Pause and resume tracks without reverting changes
usage: /maestro:stash <action> <track-id> [options]
aliases: [pause, shelve]
---

# /maestro:stash Command

Pause work on a track without reverting changes. Allows you to switch context and resume later with full state preserved.

## Purpose

Use when you need to:
- Temporarily pause work on a track
- Switch to a higher-priority task
- Wait for external dependencies
- Take a break and resume later
- Preserve work-in-progress state

## Usage

```bash
# Stash (pause) a track
/maestro:stash push TRACK-005 --reason "Waiting for API credentials"

# List stashed tracks
/maestro:stash list

# Resume a stashed track
/maestro:stash pop TRACK-005

# View stash details
/maestro:stash show TRACK-005

# Drop a stash (mark as abandoned, don't revert)
/maestro:stash drop TRACK-005 --confirm
```

## Actions

### push - Stash a Track

Pauses work on a track and saves current state.

```bash
/maestro:stash push TRACK-005 --reason "Blocked by external dependency"
```

**What it does:**
1. Saves current task progress
2. Records git state (branch, uncommitted changes)
3. Stores any in-progress context
4. Marks track as stashed
5. Updates tracks.md

**Output:**
```
╔══════════════════════════════════════════════════════════════╗
║                    TRACK STASHED                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Track: TRACK-005 - User Authentication                      ║
║  Stashed: 2024-01-15 14:30                                   ║
║  Reason: Blocked by external dependency                       ║
║                                                               ║
║  State Saved:                                                 ║
║  • Current task: 2.3 - Implement token validation            ║
║  • Phase: 2/3                                                ║
║  • Progress: 70%                                             ║
║  • Git branch: feature/auth                                  ║
║  • Uncommitted changes: 3 files                              ║
║                                                               ║
║  Resume with: /maestro:stash pop TRACK-005                   ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### list - List Stashed Tracks

Shows all currently stashed tracks.

```bash
/maestro:stash list
```

**Output:**
```
┌─────────────────────────────────────────────────────────────┐
│ STASHED TRACKS                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ID         │ Title                  │ Stashed    │ Reason   │
│ ───────────┼────────────────────────┼────────────┼──────────│
│ TRACK-005  │ User Authentication    │ 2 days ago │ Blocked  │
│ TRACK-008  │ Report Export          │ 5 days ago │ Priority │
│ TRACK-003  │ Email Integration      │ 1 week ago │ Waiting  │
│                                                              │
│ Total: 3 stashed tracks                                      │
│                                                              │
│ Commands:                                                    │
│ • /maestro:stash pop <id>   - Resume track                  │
│ • /maestro:stash show <id>  - View details                  │
│ • /maestro:stash drop <id>  - Abandon track                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### pop - Resume a Stashed Track

Resumes work on a stashed track.

```bash
/maestro:stash pop TRACK-005
```

**What it does:**
1. Restores track to active state
2. Loads saved context
3. Shows current task to continue
4. Optionally restores git state

**Output:**
```
╔══════════════════════════════════════════════════════════════╗
║                    TRACK RESUMED                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Track: TRACK-005 - User Authentication                      ║
║  Resumed: 2024-01-17 10:15                                   ║
║  Was stashed for: 2 days                                     ║
║                                                               ║
║  Resume Point:                                                ║
║  • Current task: 2.3 - Implement token validation            ║
║  • Phase: 2/3                                                ║
║  • Progress: 70%                                             ║
║                                                               ║
║  Notes from stash:                                           ║
║  • API credentials received (check email)                    ║
║  • Token format confirmed as JWT                             ║
║                                                               ║
║  Ready to continue implementation.                           ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### show - View Stash Details

Shows detailed information about a stashed track.

```bash
/maestro:stash show TRACK-005
```

**Output:**
```
┌─────────────────────────────────────────────────────────────┐
│ STASH DETAILS: TRACK-005                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Track: User Authentication                                   │
│ Type: Feature | Priority: High                               │
│                                                              │
│ STASH INFO                                                   │
│ • Stashed: 2024-01-15 14:30 (2 days ago)                    │
│ • Reason: Blocked by external dependency                     │
│ • Stashed by: User request                                  │
│                                                              │
│ SAVED STATE                                                  │
│ • Current phase: 2 - Implementation                         │
│ • Current task: 2.3 - Implement token validation            │
│ • Tasks completed: 5/8                                       │
│ • Progress: 70%                                              │
│                                                              │
│ GIT STATE                                                    │
│ • Branch: feature/auth                                       │
│ • Uncommitted files: 3                                       │
│   - src/auth/TokenManager.ts (modified)                     │
│   - src/auth/middleware/auth.ts (modified)                  │
│   - tests/auth.test.ts (new)                                │
│                                                              │
│ CONTEXT NOTES                                                │
│ • Waiting for: API credentials from external provider       │
│ • Decision pending: Token expiry duration                   │
│ • TODO: Add refresh token logic after main flow             │
│                                                              │
│ RESUME COMMAND                                               │
│ /maestro:stash pop TRACK-005                                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### drop - Abandon Stashed Track

Removes a track from stash without reverting. Use for abandoned work.

```bash
/maestro:stash drop TRACK-005 --confirm
```

**Output:**
```
╔══════════════════════════════════════════════════════════════╗
║                    STASH DROPPED                              ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Track: TRACK-005 - User Authentication                      ║
║  Status: Abandoned (was stashed)                             ║
║                                                               ║
║  The track has been removed from stash.                      ║
║  Code changes remain in the codebase (not reverted).         ║
║                                                               ║
║  To revert code changes: /maestro:revert TRACK-005           ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

## Options

| Option | Description |
|--------|-------------|
| `--reason <text>` | Reason for stashing |
| `--notes <text>` | Additional context notes |
| `--confirm` | Confirm destructive action (drop) |
| `--restore-git` | Restore git state on pop |

## Stash vs Revert

| Aspect | Stash | Revert |
|--------|-------|--------|
| Code changes | Preserved | Undone |
| Track state | Saved | Reset |
| Resume | Easy | Requires re-implementation |
| Use case | Temporary pause | Abandon/redo |

## Related Commands

- `/maestro:revert` - Revert track changes
- `/maestro:status` - View track status
- `/maestro:implement` - Continue implementation

---

## Stash Protocol

When this command is invoked, follow this protocol:

### Push (Stash) Protocol

```
1. Validate track exists and is active
2. Capture current state:
   a. Current task and phase
   b. Progress metrics
   c. Git branch and status
   d. Any uncommitted changes
   e. Recent context/decisions
3. Update metadata.json:
   - Set stash.stashed = true
   - Set stash.stashedAt = timestamp
   - Set stash.stashReason = reason
   - Set stash.resumeNotes = notes
4. Update track status to "stashed"
5. Update tracks.md
6. Display confirmation
```

### Pop (Resume) Protocol

```
1. Validate track is stashed
2. Load stash state from metadata
3. Update metadata.json:
   - Set stash.stashed = false
   - Clear stash fields
4. Update track status to previous (in_progress)
5. If --restore-git:
   a. Checkout saved branch
   b. Verify uncommitted changes
6. Update tracks.md
7. Display resume summary with context
8. Show current task to continue
```

### List Protocol

```
1. Scan all tracks in maestro/tracks/
2. Filter where stash.stashed = true
3. Sort by stashedAt (most recent first)
4. Display table with:
   - Track ID
   - Title
   - Stash date
   - Reason
```

### Drop Protocol

```
1. Require --confirm flag
2. Validate track is stashed
3. Update metadata.json:
   - Set status to "abandoned"
   - Clear stash fields
4. Update tracks.md
5. Do NOT revert code changes
6. Display confirmation
```
