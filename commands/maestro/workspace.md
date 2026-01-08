---
name: workspace
description: Manage multi-project workspace configuration and projects
usage: /maestro:workspace <action> [options]
aliases: [ws]
---

# /maestro:workspace Command

Manage workspaces containing multiple projects, git repositories, and submodules. Enables cross-project development and coordinated track management.

## What It Does

1. **Initialize Workspace**: Set up a parent workspace for multiple projects
2. **Add Projects**: Register git repos, submodules, or monorepo packages
3. **Manage Submodules**: Detect, sync, and track git submodules
4. **Configure Settings**: Set commit strategies, inheritance rules

## Actions

### init

Initialize current directory as a workspace.

```bash
/maestro:workspace init
```

**Interactive Flow:**
1. Scans for git repositories in subdirectories
2. Detects .gitmodules for submodules
3. Identifies monorepo package patterns
4. Asks which to include as projects
5. Creates `maestro/workspace.json`

### add

Add a project to the workspace.

```bash
# Add a local directory
/maestro:workspace add ./frontend

# Add with explicit type
/maestro:workspace add ./backend --type submodule

# Add with custom name
/maestro:workspace add ./packages/ui --name ui-components --type package
```

**Project Types:**
- `repository` - Standalone git repository
- `submodule` - Git submodule
- `package` - Monorepo package (no separate git)
- `linked` - External repo linked by path

### remove

Remove a project from workspace tracking.

```bash
/maestro:workspace remove frontend

# Remove without confirmation
/maestro:workspace remove backend --force
```

Note: This only removes from workspace tracking, not the actual files.

### list

List all projects in the workspace.

```bash
/maestro:workspace list

# With detailed info
/maestro:workspace list --verbose

# As JSON
/maestro:workspace list --json
```

**Output Example:**
```
Workspace: my-platform

Projects (4):
  frontend        repository   main     3 active tracks
  backend         submodule    main     1 active track
  shared-libs     submodule    main     clean
  packages/ui     package      -        2 active tracks

Submodules:
  backend         @ abc1234 (clean)
  shared-libs     @ def5678 (2 uncommitted)
```

### sync

Synchronize submodules and project state.

```bash
# Sync all submodules
/maestro:workspace sync

# Sync specific submodule
/maestro:workspace sync backend

# Initialize uninitialized submodules
/maestro:workspace sync --init

# Update submodule references
/maestro:workspace sync --update
```

### config

Configure workspace settings.

```bash
# View current config
/maestro:workspace config

# Set default project
/maestro:workspace config --default-project frontend

# Set commit strategy
/maestro:workspace config --commit-strategy atomic

# Enable/disable cross-project tracks
/maestro:workspace config --cross-project-tracks true
```

## Options

| Option | Description |
|--------|-------------|
| `--type <type>` | Project type: repository, submodule, package, linked |
| `--name <name>` | Custom project name |
| `--force` | Skip confirmation prompts |
| `--verbose` | Show detailed output |
| `--json` | Output as JSON |
| `--init` | Initialize uninitialized submodules |
| `--update` | Update submodule references |

## Workspace Configuration

The workspace is configured via `maestro/workspace.json`:

```json
{
  "version": "1.0",
  "name": "my-platform",
  "type": "workspace",

  "projects": {
    "frontend": {
      "path": "./frontend",
      "type": "repository",
      "git": {
        "remote": "origin",
        "branch": "main"
      }
    },
    "backend": {
      "path": "./backend",
      "type": "submodule"
    }
  },

  "submodules": {
    "autoDetect": true,
    "syncOnImplement": true,
    "commitStrategy": "atomic"
  },

  "crossProjectTracks": {
    "enabled": true,
    "prefix": "CROSS"
  },

  "settings": {
    "defaultProject": "frontend",
    "activeProject": null
  }
}
```

## Commit Strategies

### Atomic
Commits are coordinated across repositories:
1. Commit to submodules first
2. Update parent submodule references
3. Single commit message for the change

### Independent
Each repository commits separately:
- Projects commit independently
- Submodule references may be out of sync
- Faster but less coordinated

### Synchronized
Linked commit messages across repos:
- Each repo has its own commit
- Commit messages reference each other
- Track metadata records all commits

## Git Submodule Detection

On workspace init, automatically detects:

```
.gitmodules contents:
[submodule "backend"]
    path = backend
    url = git@github.com:org/backend.git
[submodule "libs/shared"]
    path = libs/shared
    url = git@github.com:org/shared-libs.git
```

**Detection Output:**
```
Detected 2 git submodules:
  backend         git@github.com:org/backend.git
  libs/shared     git@github.com:org/shared-libs.git

Include these as projects? (Y/n)
```

## Examples

### Initialize Monorepo Workspace

```bash
/maestro:workspace init

# Maestro detects:
# - ./packages/web (npm package)
# - ./packages/api (npm package)
# - ./packages/shared (npm package)
# - ./services/auth (git submodule)
```

### Add External Repository

```bash
# Link external repo
/maestro:workspace add ~/Projects/common-utils --type linked --name utils

# Now accessible as "utils" project
/maestro:projects switch utils
```

### Configure for Team Development

```bash
# Require approval for cross-project tracks
/maestro:workspace config --cross-project-approval true

# Use independent commits (faster)
/maestro:workspace config --commit-strategy independent

# Set backend as default for new tracks
/maestro:workspace config --default-project backend
```

## Related Commands

- `/maestro:projects` - Switch between projects
- `/maestro:setup --workspace` - Alternative workspace initialization
- `/maestro:status --all` - View all project statuses
- `/maestro:newTrack --cross-project` - Create cross-project track

---

## Workspace Protocol

When this command is invoked, follow this protocol:

### Action: init

```
1. Check if workspace.json already exists
   - If exists: offer to reconfigure or abort

2. Scan current directory:
   a. Find all directories with .git/
   b. Parse .gitmodules for submodules
   c. Check for package.json/workspaces patterns
   d. Check for monorepo patterns (lerna.json, pnpm-workspace.yaml)

3. Present findings:
   "I detected the following projects:
    - frontend/ (git repository)
    - backend/ (git submodule)
    - libs/shared/ (git submodule)
    - packages/ui/ (monorepo package)

    Include all as workspace projects? (Y/n)"

4. For each confirmed project:
   a. Determine type (repository/submodule/package)
   b. Get git info (remote, branch, status)
   c. Add to workspace.json projects

5. Ask for workspace settings:
   - "Workspace name?" (default: directory name)
   - "Default project for new tracks?"
   - "Enable cross-project tracks?" (default: yes)
   - "Commit strategy?" (atomic/independent/synchronized)

6. Create maestro/ directory if needed
7. Write workspace.json
8. Create cross-project-tracks.md
9. Display summary and next steps
```

### Action: add

```
1. Validate path exists
2. Determine project type:
   - Check if path is in .gitmodules -> submodule
   - Check if path has .git/ -> repository
   - Check if path has package.json -> package
   - Else: ask user for type

3. Extract git info if applicable:
   - remote URL
   - current branch
   - commit status

4. Check if already registered
   - If yes: ask to update or abort

5. Add to workspace.json projects section
6. If project has maestro/ dir, link workspace reference
7. Display confirmation
```

### Action: sync

```
1. Load workspace.json
2. For each submodule:
   a. Check if initialized (git submodule status)
   b. If --init and not initialized: git submodule init && update
   c. If --update: git submodule update --remote
   d. Check for uncommitted changes
   e. Report status

3. For each project:
   a. Verify path exists
   b. Check git status if applicable
   c. Report any issues

4. Update workspace.json with current state
5. Display sync summary
```

### Validation

After EVERY operation:
- Verify workspace.json is valid JSON
- Verify all project paths exist
- If submodule operation fails, report error clearly
- Suggest recovery steps for common issues
