# Multi-Project & Git Submodule Support Plan

Enhancement to support multiple projects with individual git repositories, git submodules, and related multi-repo scenarios.

## Overview

Extend Context-Driven Development to handle:
- **Workspaces**: Parent containers managing multiple projects
- **Git Submodules**: First-class support for submodule workflows
- **Monorepos**: Multiple packages within a single repository
- **Linked Repositories**: Projects that reference each other
- **Cross-Project Tracks**: Features spanning multiple repositories

## Architecture

### Project Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                      WORKSPACE (optional)                    │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  PROJECT A  │  │  PROJECT B  │  │  PROJECT C          │  │
│  │  (git repo) │  │ (submodule) │  │  (monorepo package) │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Directory Structure

#### Workspace-Level (`maestro-workspace/` or `maestro/workspace.json`)

```
project-root/
├── maestro/
│   ├── workspace.json          # Workspace configuration
│   ├── product.md              # Umbrella product vision
│   ├── cross-project-tracks.md # Cross-project track index
│   └── projects/               # Project registry
│       ├── frontend.json       # Project metadata & link
│       └── backend.json
│
├── frontend/                   # Project 1 (standalone repo)
│   ├── .git/
│   ├── maestro/
│   │   ├── project.json        # Project config (links to workspace)
│   │   ├── product.md
│   │   ├── tech-stack.md
│   │   ├── tracks.md
│   │   └── tracks/
│   └── src/
│
├── backend/                    # Project 2 (git submodule)
│   ├── .git                    # Submodule git link
│   ├── maestro/
│   │   ├── project.json
│   │   └── ...
│   └── src/
│
└── .gitmodules                 # Git submodule configuration
```

#### Standalone Project (No Workspace)

```
my-project/
├── .git/
├── maestro/
│   ├── product.md
│   ├── tech-stack.md
│   ├── workflow.md
│   ├── tracks.md
│   └── tracks/
└── src/
```

## Configuration Files

### workspace.json

```json
{
  "version": "1.0",
  "name": "my-platform",
  "description": "Multi-service platform",
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
      "type": "submodule",
      "git": {
        "url": "git@github.com:org/backend.git",
        "branch": "main"
      }
    },
    "shared-libs": {
      "path": "./libs/shared",
      "type": "submodule"
    },
    "packages/ui": {
      "path": "./packages/ui",
      "type": "monorepo-package"
    }
  },

  "submodules": {
    "autoDetect": true,
    "syncOnImplement": true,
    "commitStrategy": "atomic"
  },

  "crossProjectTracks": {
    "enabled": true,
    "requireApproval": false
  },

  "defaultProject": "frontend",
  "activeProject": null
}
```

### project.json (per-project)

```json
{
  "version": "1.0",
  "name": "frontend",
  "type": "project",

  "workspace": {
    "linked": true,
    "path": "../",
    "inherit": ["product-guidelines", "workflow"]
  },

  "git": {
    "type": "repository",
    "remote": "origin",
    "branch": "main",
    "submodulePath": null
  },

  "dependencies": {
    "projects": ["shared-libs"],
    "submodules": ["./libs/shared"]
  },

  "trackPrefix": "FE"
}
```

## New Commands

### /maestro:workspace

Manage workspace configuration and projects.

```bash
# Initialize as workspace
/maestro:workspace init

# Add project to workspace
/maestro:workspace add <path> [--type repository|submodule|package]

# Remove project from workspace
/maestro:workspace remove <project-name>

# List projects
/maestro:workspace list

# Sync submodules
/maestro:workspace sync
```

### /maestro:projects

List and switch between projects.

```bash
# List all projects with status
/maestro:projects

# Switch active project context
/maestro:projects switch <project-name>

# Show current project
/maestro:projects current
```

### Enhanced /maestro:setup

```bash
# Initialize as standalone project
/maestro:setup

# Initialize as workspace (multi-project)
/maestro:setup --workspace

# Initialize project within existing workspace
/maestro:setup --project

# Link to parent workspace
/maestro:setup --link-workspace <path>
```

### Enhanced /maestro:newTrack

```bash
# Project-specific track (default)
/maestro:newTrack "Add feature X"

# Cross-project track
/maestro:newTrack --cross-project "Implement shared auth"

# Track affecting specific projects
/maestro:newTrack --projects frontend,backend "Add API endpoint"

# Track in submodule
/maestro:newTrack --project shared-libs "Add utility function"
```

### Enhanced /maestro:status

```bash
# Current project status
/maestro:status

# All projects status
/maestro:status --all

# Specific project
/maestro:status --project backend

# Cross-project tracks
/maestro:status --cross-project

# Include submodule status
/maestro:status --submodules
```

### Enhanced /maestro:implement

```bash
# Implement in current project
/maestro:implement TRACK-001

# Cross-project implementation
/maestro:implement CROSS-001 --all-projects

# With submodule handling
/maestro:implement TRACK-001 --sync-submodules
```

### Enhanced /maestro:revert

```bash
# Revert in current project
/maestro:revert TRACK-001

# Cross-project revert
/maestro:revert CROSS-001 --all-projects

# Revert with submodule handling
/maestro:revert TRACK-001 --include-submodules

# Dry run to see affected repos
/maestro:revert TRACK-001 --dry-run
```

## Git Submodule Handling

### Detection

On setup or first command, detect:
1. Check for `.gitmodules` file
2. Parse submodule paths and URLs
3. Check submodule status (initialized, dirty, etc.)
4. Record in workspace.json

### Commit Strategy Options

```yaml
# In workspace.json or per-track
commitStrategy:
  # Atomic: Single commit message, update parent after submodule
  atomic:
    commitSubmoduleFirst: true
    updateParentRef: true
    singleMessage: true

  # Independent: Separate commits per repo
  independent:
    allowPartialCommit: true
    trackCommitSHAs: true

  # Synchronized: Commit all at once with linked messages
  synchronized:
    linkedMessages: true
    crossReference: true
```

### Track Metadata for Submodules

```json
{
  "id": "TRACK-001",
  "title": "Add shared authentication",
  "scope": {
    "type": "cross-project",
    "projects": ["frontend", "backend", "shared-libs"],
    "submodules": ["./libs/shared"]
  },
  "commits": {
    "frontend": ["abc123", "def456"],
    "backend": ["ghi789"],
    "shared-libs": {
      "submodule": true,
      "commits": ["jkl012"],
      "parentCommit": "mno345"
    }
  },
  "status": "active"
}
```

### Revert with Submodules

```
Revert Process:
1. Identify all commits per repo/submodule
2. Check for dependent changes
3. For submodules:
   a. Revert commits in submodule repo
   b. Update parent repo's submodule reference
   c. Commit parent repo update
4. For regular repos:
   a. Revert commits in order
5. Update track status
```

## Implementation Phases

### Phase 1: Core Infrastructure
- [ ] Create workspace.json schema and template
- [ ] Create project.json schema and template
- [ ] Add git submodule detection utility
- [ ] Update setup command for workspace/project modes

### Phase 2: Workspace Commands
- [ ] Implement /maestro:workspace command
- [ ] Implement /maestro:projects command
- [ ] Add project switching logic
- [ ] Add workspace sync functionality

### Phase 3: Track System Updates
- [ ] Add cross-project track support to newTrack
- [ ] Update track metadata for multi-repo
- [ ] Add project scope to plan.md template
- [ ] Update tracks.md for cross-project index

### Phase 4: Implementation Updates
- [ ] Update implement command for cross-project
- [ ] Add submodule commit handling
- [ ] Add project-aware sub-agent routing
- [ ] Update progress tracking per project

### Phase 5: Revert Updates
- [ ] Add cross-project revert logic
- [ ] Add submodule revert handling
- [ ] Add dependency checking across repos
- [ ] Update dry-run for multi-repo

### Phase 6: Status & Monitoring
- [ ] Update status for workspace view
- [ ] Add per-project status
- [ ] Add submodule status display
- [ ] Add cross-project progress metrics

### Phase 7: Documentation
- [ ] Update README.md
- [ ] Update command documentation
- [ ] Add multi-project examples
- [ ] Add troubleshooting guide

## File Changes Required

### New Files
- `templates/workspace.json` - Workspace configuration template
- `templates/project.json` - Project configuration template
- `commands/maestro/workspace.md` - Workspace management command
- `commands/maestro/projects.md` - Projects listing/switching command

### Modified Files
- `commands/maestro/setup.md` - Add workspace/project modes
- `commands/maestro/newTrack.md` - Add cross-project support
- `commands/maestro/status.md` - Add workspace/multi-project views
- `commands/maestro/implement.md` - Add cross-project execution
- `commands/maestro/revert.md` - Add cross-project/submodule revert
- `templates/tracks.md` - Add cross-project section
- `templates/track/metadata.json` - Add project scope fields
- `templates/track/plan.md` - Add project context
- `plugin.json` - Version bump to 1.3.0
- `README.md` - Document multi-project features

## Usage Examples

### Setting Up a Workspace

```bash
# In parent directory with multiple repos
/maestro:setup --workspace

# Interactive flow:
# 1. "I detected the following directories with git repos:"
#    - frontend/ (repository)
#    - backend/ (submodule)
#    - libs/shared/ (submodule)
# 2. "Would you like to include these as projects?"
# 3. Configure workspace-level product vision
# 4. Set default project for new tracks
```

### Cross-Project Feature Development

```bash
# Create track spanning multiple projects
/maestro:newTrack --cross-project "Implement SSO authentication"

# Interactive flow:
# 1. Asks which projects are involved
# 2. Creates spec with project-specific sections
# 3. Creates plan with tasks per project
# 4. Assigns sub-agents per project context

# Implement across projects
/maestro:implement CROSS-001

# Maestro will:
# 1. Execute tasks in dependency order
# 2. Commit to each repo appropriately
# 3. Update submodule references
# 4. Track all commits in metadata
```

### Working with Submodules

```bash
# View submodule status
/maestro:status --submodules

# Output:
# Submodules:
# - libs/shared: clean (commit abc123)
# - backend: 2 uncommitted changes

# Create track in submodule
/maestro:projects switch shared-libs
/maestro:newTrack "Add date utility"
/maestro:implement SHARED-001

# Maestro will:
# 1. Work in submodule context
# 2. Commit to submodule repo
# 3. Prompt to update parent reference
```

### Project Context Switching

```bash
# See all projects
/maestro:projects

# Output:
# Projects in workspace "my-platform":
#
# * frontend (active)
#   Type: repository
#   Tracks: 3 active, 5 completed
#
#   backend
#   Type: submodule
#   Tracks: 1 active, 2 completed
#
#   shared-libs
#   Type: submodule
#   Tracks: 0 active, 3 completed

# Switch context
/maestro:projects switch backend

# Now all commands operate on backend project
/maestro:status  # Shows backend status
/maestro:newTrack "Add endpoint"  # Creates in backend
```
