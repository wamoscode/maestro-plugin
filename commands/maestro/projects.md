---
name: projects
description: List and switch between projects in a workspace
usage: /maestro:projects [action] [project-name]
aliases: [proj, project]
---

# /maestro:projects Command

View, switch, and manage projects within a multi-project workspace. Essential for cross-project development workflows.

## What It Does

1. **List Projects**: Show all projects with their status
2. **Switch Context**: Change active project for commands
3. **Show Current**: Display the currently active project
4. **Project Details**: Get detailed info about a specific project

## Actions

### list (default)

List all projects in the workspace.

```bash
/maestro:projects
/maestro:projects list
```

**Output:**
```
Workspace: my-platform (4 projects)

PROJECT         TYPE          BRANCH    TRACKS    STATUS
─────────────────────────────────────────────────────────
* frontend      repository    main      3 active  clean
  backend       submodule     main      1 active  2 uncommitted
  shared-libs   submodule     develop   0 active  clean
  packages/ui   package       -         2 active  modified

* = active project

Submodule Status:
  backend       @ abc1234 (ahead 2)
  shared-libs   @ def5678 (clean)
```

### switch

Switch the active project context.

```bash
/maestro:projects switch frontend
/maestro:projects switch backend
```

After switching:
- `/maestro:newTrack` creates tracks in that project
- `/maestro:status` shows that project's status
- `/maestro:implement` runs in that project context

**Output:**
```
Switched to project: backend

Project: backend
Type: submodule
Path: ./backend
Branch: main
Active Tracks: 1
  - BACK-003: API rate limiting (in progress)

Use /maestro:status for full details.
```

### current

Show the currently active project.

```bash
/maestro:projects current
```

**Output:**
```
Active Project: frontend

Path: ./frontend
Type: repository
Branch: main
Remote: origin (git@github.com:org/frontend.git)

Active Tracks:
  FE-001: User dashboard (75% complete)
  FE-002: Settings page (pending)
  FE-003: Dark mode (in progress)

Last Activity: 2 hours ago
```

### info

Get detailed information about a specific project.

```bash
/maestro:projects info backend
```

**Output:**
```
Project: backend

Configuration:
  Path: ./backend
  Type: submodule
  Track Prefix: BACK

Git Status:
  Branch: main
  Remote: origin (git@github.com:org/backend.git)
  Submodule Commit: abc1234
  Parent Reference: up to date
  Uncommitted: 2 files

Tech Stack (from maestro/tech-stack.md):
  Languages: Python, SQL
  Frameworks: Django, FastAPI
  Database: PostgreSQL

Tracks:
  Active: 1
    BACK-003: API rate limiting
  Completed: 5
  Total Tasks: 23

Dependencies:
  Uses: shared-libs
  Used By: frontend

Cross-Project Involvement:
  CROSS-001: Shared authentication (completed)
  CROSS-002: API versioning (active)
```

## Options

| Option | Description |
|--------|-------------|
| `--verbose` | Show detailed project info |
| `--json` | Output as JSON |
| `--tracks` | Include track details |
| `--git` | Include full git status |

## Project Context

When a project is active, all commands operate in that context:

| Command | Behavior |
|---------|----------|
| `/maestro:newTrack` | Creates track in active project |
| `/maestro:status` | Shows active project status |
| `/maestro:implement` | Runs in active project directory |
| `/maestro:revert` | Reverts in active project |

### Cross-Project Override

Use `--cross-project` or `--all-projects` to override:

```bash
# Create track spanning multiple projects
/maestro:newTrack --cross-project "Add shared feature"

# View all projects
/maestro:status --all

# Implement across projects
/maestro:implement CROSS-001 --all-projects
```

## Examples

### View All Projects with Git Status

```bash
/maestro:projects --git

# Output includes:
# - Branch status (ahead/behind)
# - Uncommitted changes
# - Submodule state
```

### Quick Project Switching Workflow

```bash
# Start in frontend
/maestro:projects current
# Output: Active Project: frontend

# Create frontend track
/maestro:newTrack "Add login page"
# Creates: FE-004

# Switch to backend
/maestro:projects switch backend

# Create backend track
/maestro:newTrack "Add auth API"
# Creates: BACK-004

# View all project tracks
/maestro:status --all
```

### Work on Submodule

```bash
# Switch to submodule project
/maestro:projects switch shared-libs

# Current shows submodule details
/maestro:projects current
# Shows submodule-specific info

# Changes here need parent update
/maestro:implement SHARED-001
# After completion: "Update parent submodule reference? (Y/n)"
```

### Export Project List

```bash
/maestro:projects --json > projects.json
```

**JSON Output:**
```json
{
  "workspace": "my-platform",
  "activeProject": "frontend",
  "projects": [
    {
      "name": "frontend",
      "path": "./frontend",
      "type": "repository",
      "branch": "main",
      "tracks": {
        "active": 3,
        "completed": 5
      },
      "status": "clean"
    },
    {
      "name": "backend",
      "path": "./backend",
      "type": "submodule",
      "branch": "main",
      "submodule": {
        "commit": "abc1234",
        "synced": true
      },
      "tracks": {
        "active": 1,
        "completed": 2
      },
      "status": "modified"
    }
  ]
}
```

## Submodule Projects

When working with submodule projects:

### Switching to Submodule

```bash
/maestro:projects switch backend

# Output:
# Switched to project: backend (submodule)
#
# Note: This is a git submodule
# - Changes are committed to the submodule repo
# - Parent repo reference updates separately
# - Use /maestro:workspace sync to update parent
```

### Submodule Commit Workflow

After implementing changes in a submodule:

1. Changes committed to submodule
2. Maestro prompts: "Update parent submodule reference?"
3. If yes: commits parent repo with updated ref
4. Track metadata records both commits

### Checking Submodule State

```bash
/maestro:projects info backend --git

# Output includes:
# Submodule State:
#   Commit: abc1234
#   Parent Expects: abc1234 (in sync)
#   Local Changes: none
#   Remote: 2 commits ahead
```

## Related Commands

- `/maestro:workspace` - Manage workspace configuration
- `/maestro:status` - Detailed status of current/all projects
- `/maestro:newTrack` - Create track (project-aware)
- `/maestro:implement` - Execute track (project-aware)

---

## Projects Protocol

When this command is invoked, follow this protocol:

### Action: list

```
1. Load workspace.json
2. If not a workspace:
   - Check for single project (maestro/project.json)
   - If found: show single project info
   - If not: "Not a workspace or project. Run /maestro:setup first."

3. For each project in workspace.projects:
   a. Check path exists
   b. Get git status (branch, uncommitted count)
   c. Load project's maestro/tracks.md for track count
   d. Determine status (clean/modified/untracked)

4. Format output table:
   - Mark active project with *
   - Show all columns aligned
   - Add submodule section if applicable

5. If --verbose: include tech stack and recent activity
6. If --json: output structured JSON
```

### Action: switch

```
1. Validate project name exists in workspace
2. Check project path is accessible
3. Update workspace.json activeProject field
4. Load project's maestro/ context if exists
5. Display project summary:
   - Project name and type
   - Path and branch
   - Active tracks
   - Suggest next actions

6. If submodule:
   - Note that commits go to submodule repo
   - Remind about parent reference updates
```

### Action: current

```
1. Load workspace.json
2. Get activeProject
3. If null:
   - "No active project. Use /maestro:projects switch <name>"

4. Load project details:
   - Git info (branch, remote, status)
   - Track info (from project's maestro/)
   - Tech stack summary
   - Recent activity

5. Display formatted output
```

### Action: info

```
1. Validate project name (use active if not specified)
2. Load project configuration
3. If has maestro/ directory:
   - Load tech-stack.md
   - Load tracks.md
   - Calculate track statistics

4. Get git information:
   - Current branch
   - Remote URL
   - Uncommitted changes
   - If submodule: parent reference status

5. Check for cross-project involvement:
   - Load workspace cross-project-tracks.md
   - Find tracks involving this project

6. Display comprehensive info
7. If --json: output structured JSON
```

### Error Handling

```
Project not found:
  "Project 'xyz' not found in workspace.
   Available projects: frontend, backend, shared-libs
   Use /maestro:projects list to see all."

No workspace:
  "This is not a workspace.
   Run /maestro:setup --workspace to create one,
   or /maestro:setup for single-project mode."

Path not accessible:
  "Project 'backend' path './backend' not accessible.
   The directory may have been moved or deleted.
   Use /maestro:workspace remove backend to unregister."
```
