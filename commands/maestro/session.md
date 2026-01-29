---
name: session
description: Manage CDD sessions across branches with notifications and lock control
usage: /maestro:session <subcommand> [options]
aliases: [sessions, sess]
---

# /maestro:session Command

Manage Claude Code CDD sessions across branches. This command provides visibility into active sessions, lock management, and cross-session notifications for multi-branch parallel development.

## CRITICAL: Mandatory Sub-Agent Usage

**All /maestro commands MUST be processed through specialized sub-agents via the Task tool.**

This is NOT optional. When executing session operations:

1. **EVERY operation** routes to appropriate sub-agent(s)
2. **ALWAYS** use the Task tool with `subagent_type` parameter
3. **NEVER** process operations directly without sub-agent consultation

```
/maestro:session operations → Task tool → appropriate specialist(s)

Session management operations typically route to:
- devops-engineer: For process and lock management
- backend-developer: For file system and registry operations
- software-architect: For session architecture decisions
```

## Subcommands

| Subcommand | Description |
|------------|-------------|
| `list` | List all active sessions across branches |
| `info <session-id>` | Get detailed session information |
| `release <branch>` | Release a session lock for a branch |
| `cleanup` | Remove stale sessions (no heartbeat >5min) |
| `notifications` | List pending notifications |
| `notify <branch> <message>` | Send notification to a branch session |
| `config` | View/update notification settings |

## Usage Examples

```bash
# List all active sessions
/maestro:session list

# Get detailed info about a session
/maestro:session info session-abc123

# Release a stuck/stale lock
/maestro:session release feature/auth
/maestro:session release feature/auth --force

# Cleanup all stale sessions
/maestro:session cleanup

# View pending notifications
/maestro:session notifications
/maestro:session notifications --all

# Clear notifications
/maestro:session notifications --clear
/maestro:session notifications --clear --branch feature/auth

# Send notification to another session
/maestro:session notify feature/auth "Need review on auth changes"

# View/update notification config
/maestro:session config
/maestro:session config --enable-os-notifications
/maestro:session config --disable-os-notifications
```

## Output Examples

### Session List

```
/maestro:session list
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ACTIVE SESSIONS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

│ Session ID      │ Branch         │ Track      │ Last Activity │ Status  │
│─────────────────│────────────────│────────────│───────────────│─────────│
│ session-abc123  │ main *         │ TRACK-001  │ just now      │ active  │
│ session-def456  │ feature/auth   │ TRACK-002  │ 5 min ago     │ active  │
│ session-ghi789  │ feature/pay    │ -          │ 8 min ago     │ stale?  │

* = current session
Total: 3 sessions (2 active, 1 potentially stale)

Run '/maestro:session cleanup' to remove stale sessions.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Session Info

```
/maestro:session info session-def456
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SESSION INFO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Session ID:    session-def456
Branch:        feature/auth
Status:        active
Started:       2024-01-15 10:30:00 (45 minutes ago)
Last Activity: 2024-01-15 11:10:00 (5 minutes ago)

Active Track:  TRACK-002 - User Authentication
Track Status:  Phase 2/4, Task 2.3 in progress
Progress:      40%

Host Info:
  User:     walugembeamos
  Host:     macbook-pro.local
  Terminal: iTerm2 - Tab 2
  PID:      54321
  CWD:      /Users/walugembeamos/Projects/my-app

Lock Status:
  Lock File: maestro/branches/feature--auth/active-session.lock
  Heartbeat: 5 minutes ago (healthy)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Release Lock

```
/maestro:session release feature/auth
```

**If you're the owner:**
```
✓ Lock released for branch 'feature/auth'
  Session session-def456 has been terminated.
```

**If you're not the owner:**
```
⚠️  Cannot release lock: not the owner

The lock for branch 'feature/auth' belongs to:
  Session: session-def456
  User: walugembeamos@macbook-pro

Options:
  1. Use --force to override (use with caution)
  2. Contact the session owner
  3. Wait for session to become stale (>5 min idle)
```

**With --force:**
```
/maestro:session release feature/auth --force
```

```
⚠️  Force releasing lock for branch 'feature/auth'

Previous session:
  Session ID: session-def456
  Started: 45 minutes ago
  Last Activity: 5 minutes ago

✓ Lock forcefully released.
  Warning: The original session may experience errors.

Branch 'feature/auth' is now available.
```

### Cleanup Stale Sessions

```
/maestro:session cleanup
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  SESSION CLEANUP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Checking for stale sessions (no heartbeat >5 minutes)...

Found stale sessions:

│ Session ID      │ Branch         │ Idle Time   │ Status     │
│─────────────────│────────────────│─────────────│────────────│
│ session-ghi789  │ feature/pay    │ 8 min       │ removing   │
│ session-jkl012  │ hotfix/login   │ 15 min      │ removing   │

Cleanup Results:
  - Checked: 5 sessions
  - Removed: 2 stale sessions
  - Active: 3 sessions remain

Registry updated.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Notifications List

```
/maestro:session notifications
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  PENDING NOTIFICATIONS (2)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔔 [HIGH] User Input Required
   Branch: feature/auth
   Message: Track TRACK-002 needs approval to proceed with Phase 2
   Created: 10 minutes ago
   Expires: in 50 minutes
   Action: /maestro:branch switch feature/auth

──────────────────────────────────────────────────────────────

ℹ️ [NORMAL] Track Completed
   Branch: main
   Message: TRACK-003 has been completed successfully
   Created: 25 minutes ago
   Expires: in 35 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Commands:
  Clear all: /maestro:session notifications --clear
  Clear by branch: /maestro:session notifications --clear --branch feature/auth
```

### Notification Banner (shown automatically)

When CDD mode is active and polling detects notifications:

```
┌─────────────────────────────────────────────────────────────┐
│ 🔔 Session on 'feature/auth' requires attention             │
│    "Track TRACK-002 needs approval to proceed with Phase 2" │
│    Run: /maestro:branch switch feature/auth                 │
└─────────────────────────────────────────────────────────────┘
```

### Send Notification

```
/maestro:session notify feature/auth "Please review the auth middleware changes"
```

```
✓ Notification sent to branch 'feature/auth'

  Type: info
  Priority: normal
  Message: Please review the auth middleware changes
  Expires: in 1 hour

The session on 'feature/auth' will see this notification on their next poll.
```

### Notification Config

```
/maestro:session config
```

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  NOTIFICATION CONFIGURATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Settings:
  OS Notifications: disabled
  Poll Interval: 10 seconds
  Default Expiry: 1 hour
  Sound Enabled: no
  Priority Filter: high, normal, low (all)

Available Commands:
  Enable OS notifications:  /maestro:session config --enable-os-notifications
  Disable OS notifications: /maestro:session config --disable-os-notifications
  Set poll interval:        /maestro:session config --poll-interval 30
  Filter by priority:       /maestro:session config --priority high,normal

OS Notification Support:
  Platform: darwin (macOS)
  Method: osascript (native notifications)
  Status: available

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Options Reference

### Global Options

| Option | Description |
|--------|-------------|
| `--json` | Output in JSON format |
| `--quiet` | Minimal output |
| `--verbose` | Detailed output |

### Subcommand-Specific Options

**`release`:**
| Option | Description |
|--------|-------------|
| `--force` | Force release even if not owner |

**`notifications`:**
| Option | Description |
|--------|-------------|
| `--all` | Include read/expired notifications |
| `--clear` | Clear notifications |
| `--branch <name>` | Filter by branch |
| `--priority <level>` | Filter by priority (high/normal/low) |

**`notify`:**
| Option | Description |
|--------|-------------|
| `--priority <level>` | Set priority (default: normal) |
| `--type <type>` | Set type (info/warning/error) |

**`config`:**
| Option | Description |
|--------|-------------|
| `--enable-os-notifications` | Enable OS-level notifications |
| `--disable-os-notifications` | Disable OS-level notifications |
| `--poll-interval <seconds>` | Set polling interval |
| `--priority <levels>` | Set priority filter (comma-separated) |

---

## MANDATORY EXECUTION DIRECTIVE

**Every /maestro:session operation MUST use the Task tool with sub-agents.**

### Sub-Agent Routing for Session Operations

| Operation | Primary Agent | Secondary Agents |
|-----------|--------------|------------------|
| `list` | devops-engineer | - |
| `info` | devops-engineer | - |
| `release` | devops-engineer | - |
| `cleanup` | devops-engineer | - |
| `notifications` | devops-engineer | - |
| `notify` | devops-engineer | - |
| `config` | devops-engineer | software-architect |

### Execution Pattern

```javascript
// For EVERY /maestro:session operation
Task({
  subagent_type: "devops-engineer", // primary for session ops
  prompt: "<operation details with session context>",
  description: "Session operation: <subcommand>"
})
```

---

## Session Protocol

When this command is invoked, follow these steps:

### /maestro:session list

```
1. Read session registry: maestro/sessions/registry.json
2. For each session:
   a. Check if lock file still exists
   b. Read last heartbeat timestamp
   c. Determine status (active, stale, unknown)
3. Identify current session
4. Format and display session table
```

### /maestro:session info <session-id>

```
1. Look up session in registry
2. If not found in registry, search lock files
3. Read lock file for detailed info
4. Load associated branch context
5. Get active track info if any
6. Format and display session details
```

### /maestro:session release <branch>

```
1. Find lock file for branch
2. Read lock data
3. Check ownership:
   - If current session owns it, release immediately
   - If not owner and no --force, show warning
   - If --force, proceed with warning
4. Remove lock file
5. Update session registry
6. Display confirmation
```

### /maestro:session cleanup

```
1. List all lock files: maestro/branches/*/active-session.lock
2. For each lock:
   a. Read last heartbeat
   b. Calculate idle time
   c. If idle > 5 minutes, mark as stale
3. For each stale session:
   a. Remove lock file
   b. Remove from registry
4. Display cleanup summary
```

### /maestro:session notifications

```
1. Read all files in maestro/notifications/pending/
2. Parse each notification JSON
3. Filter out:
   - Expired notifications (unless --all)
   - Own session notifications
4. Sort by priority, then by creation time
5. Display notification list
```

### /maestro:session notifications --clear

```
1. Find matching notification files:
   - All files if no filter
   - Filtered by --branch if specified
2. Move files to maestro/notifications/archive/
3. Display count of cleared notifications
```

### /maestro:session notify <branch> <message>

```
1. Validate target branch exists
2. Check if target branch has active session
3. Create notification object:
   - Generate unique ID
   - Set type, priority from options
   - Set expiry (default: 1 hour)
4. Write to maestro/notifications/pending/
5. Optionally trigger OS notification if enabled
6. Display confirmation
```

### /maestro:session config

```
1. Read current config: maestro/notifications/config.json
2. If options provided:
   a. Merge with existing config
   b. Write updated config
3. Detect OS notification capability
4. Display current configuration
```

---

## Notification Types

| Type | Icon | Description | Priority |
|------|------|-------------|----------|
| `input_required` | 🔔 | Session needs user input | high |
| `error` | ❌ | Session encountered error | high |
| `warning` | ⚠️ | Important warning | high/normal |
| `info` | ℹ️ | Informational message | normal |
| `progress` | ⏳ | Progress update | low |

## OS Notification Support

### macOS
- Uses `osascript` for native notifications
- Appears in Notification Center
- Sound optional

### Linux
- Uses `notify-send` (requires libnotify)
- Appears in desktop notification area

### Windows
- Uses PowerShell notification
- Limited support

---

## Integration with Other Commands

### Automatic Notifications

The following events trigger automatic notifications to other sessions:

1. **Input Required**
   - Triggered by: `/maestro:implement` reaching checkpoint
   - Content: "Track {ID} needs approval to proceed"
   - Priority: high

2. **Track Completed**
   - Triggered by: Track reaching 100% completion
   - Content: "Track {ID} has been completed"
   - Priority: normal

3. **Session Error**
   - Triggered by: Unrecoverable error during implementation
   - Content: Error details
   - Priority: high

4. **Session Blocked**
   - Triggered by: Track encountering blocker
   - Content: Blocker description
   - Priority: high

### Notification Polling

When CDD mode is active (`/maestro:cdd`):
- Notifications are polled every 10 seconds
- High-priority notifications display as banner
- OS notifications trigger for high priority (if enabled)

---

## Error Handling

### Session Not Found
```
Session 'session-xyz' not found.

Available sessions:
  session-abc123 (main)
  session-def456 (feature/auth)

Run '/maestro:session list' to see all sessions.
```

### No Active Sessions
```
No active sessions found.

Start a session by activating CDD mode:
  /maestro:cdd
```

### Cannot Release Lock
```
Cannot release lock for branch 'feature/auth'

Reason: Lock owned by different session
Owner: session-def456 (walugembeamos@macbook-pro)
Last Activity: 2 minutes ago

Options:
  1. Wait for owner to release
  2. Use --force to override (caution: may disrupt other session)
```

### Notification Send Failed
```
Cannot send notification to branch 'feature/test'

Reason: No active session on this branch

The notification was not sent. Consider:
  1. Waiting for a session to start on that branch
  2. Leaving a note in the track instead
```
