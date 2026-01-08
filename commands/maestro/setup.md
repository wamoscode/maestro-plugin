---
name: setup
description: Initialize project or workspace context for Context-Driven Development
usage: /maestro:setup [--workspace | --project]
aliases: [init, initialize]
---

# /maestro:setup Command

Initialize your project or workspace with Context-Driven Development methodology. This command creates the context files that guide all future development work.

## Setup Modes

### Single Project (Default)
Standard single-repository setup for most projects.

```bash
/maestro:setup
```

### Workspace Mode
For multi-project environments with multiple repos, submodules, or monorepos.

```bash
/maestro:setup --workspace
```

### Project Within Workspace
Initialize a project that belongs to an existing workspace.

```bash
/maestro:setup --project
```

## What It Does

### Single Project Mode
1. **Analyzes your project** - Detects if this is a new (Greenfield) or existing (Brownfield) project
2. **Creates context files** - Generates product.md, tech-stack.md, workflow.md, and style guides
3. **Sets up track management** - Prepares the tracks system for feature development
4. **Optionally creates first track** - For new projects, helps define initial work

### Workspace Mode
1. **Scans for projects** - Detects git repos, submodules, and monorepo packages
2. **Creates workspace config** - Generates workspace.json with project registry
3. **Configures cross-project** - Enables cross-project track management
4. **Sets up inheritance** - Configures shared guidelines and workflows

### Project Mode (Within Workspace)
1. **Links to workspace** - Connects to parent workspace configuration
2. **Inherits settings** - Uses workspace guidelines and workflow
3. **Project-specific context** - Creates project-level tech-stack and tracks
4. **Configures track prefix** - Sets unique prefix for project tracks

## Directory Structures

### Single Project

```
my-project/
├── maestro/
│   ├── product.md              # Product vision and goals
│   ├── product-guidelines.md   # Core principles and constraints
│   ├── tech-stack.md           # Technology decisions
│   ├── workflow.md             # Development methodology
│   ├── code-styleguide.md      # Selected style guide
│   ├── tracks.md               # Track index
│   └── tracks/                 # Track files
└── src/
```

### Workspace

```
workspace-root/
├── maestro/
│   ├── workspace.json          # Workspace configuration
│   ├── product.md              # Umbrella product vision
│   ├── product-guidelines.md   # Shared guidelines
│   ├── workflow.md             # Default methodology
│   ├── cross-project-tracks.md # Cross-project track index
│   └── projects/               # Project registry
│       ├── frontend.json
│       └── backend.json
├── frontend/
│   ├── maestro/
│   │   ├── project.json        # Links to workspace
│   │   ├── tech-stack.md       # Project-specific
│   │   └── tracks.md           # Project tracks
│   └── src/
└── backend/
    ├── maestro/
    │   └── ...
    └── src/
```

## Usage

```bash
# Standard single-project setup
/maestro:setup

# Multi-project workspace
/maestro:setup --workspace

# Project within existing workspace
/maestro:setup --project

# Link to external workspace
/maestro:setup --project --link-workspace ../

# Reset and start fresh
/maestro:setup --reset

# Quick setup with TDD workflow
/maestro:setup --workflow tdd --skip-track
```

## Interactive Flow

### Standard Setup (Single Project)

#### Phase 1: Mode Detection

```
Checking project structure...

I detected:
  - .git/ directory (git repository)
  - package.json (Node.js project)
  - No parent workspace found

Recommended: Single project setup
Continue with single project setup? (Y) or switch to workspace (W)?
```

#### Phase 2: Project Assessment

**Greenfield (New Project)**
- No existing source files detected
- Will guide you through complete setup
- Creates initial track for first feature

**Brownfield (Existing Project)**
- Detects existing code, dependencies, git history
- Analyzes current tech stack automatically
- Focuses on documenting existing patterns

#### Phase 3: Product Definition

You'll be asked about:
- What does this product do?
- Who are the target users?
- What are the main features/goals?

#### Phase 4: Guidelines

Define your project's principles:
- Code quality standards
- Performance requirements
- Security considerations

#### Phase 5: Technology Stack

For Greenfield: Select technologies
For Brownfield: Confirm detected technologies

#### Phase 6: Workflow Selection

Choose your development methodology:
- **TDD** - Test-Driven Development (recommended)
- **Agile** - Iterative development with flexibility
- **Minimal** - Lightweight tracking

#### Phase 7: Code Style Guide

Select style guides for your languages.

### Workspace Setup

#### Phase 1: Project Discovery

```
Scanning for projects...

I detected the following:
  Directory          Type            Git Status
  ─────────────────────────────────────────────
  ./frontend         repository      clean
  ./backend          submodule       clean
  ./libs/shared      submodule       clean
  ./packages/ui      package         -

Include all as workspace projects? (Y/n)
```

#### Phase 2: Workspace Configuration

```
Workspace name: [detected from directory]
Default project for new tracks: [frontend]
Enable cross-project tracks: Yes
Commit strategy: [atomic/independent/synchronized]
```

#### Phase 3: Shared Context

```
Create shared product vision? (Y/n)
Create shared guidelines? (Y/n)
Select default workflow: [TDD/Agile/Minimal]
```

#### Phase 4: Project Initialization

```
Initialize each project with maestro context? (Y/n)

For each project:
- Create project.json linking to workspace
- Set up project-specific tech-stack.md
- Create tracks.md with project prefix
```

### Project Within Workspace

#### Phase 1: Workspace Detection

```
I detected a parent workspace at: ../

Workspace: my-platform
Projects: frontend, backend, shared-libs

Link this project to the workspace? (Y/n)
```

#### Phase 2: Project Configuration

```
Project name: [detected from directory]
Track prefix: [auto-generated, e.g., FE, BACK]
Inherit from workspace:
  [x] product-guidelines.md
  [x] workflow.md
  [ ] code-styleguide.md (project has own)
```

#### Phase 3: Project-Specific Context

```
Create project tech-stack.md? (Y/n)
[Brownfield: Detected TypeScript, React, TailwindCSS]
```

## Options

| Option | Description |
|--------|-------------|
| `--workspace` | Initialize as multi-project workspace |
| `--project` | Initialize as project within workspace |
| `--link-workspace <path>` | Link to workspace at specified path |
| `--reset` | Start fresh, ignore existing setup |
| `--skip-track` | Skip initial track creation |
| `--workflow <type>` | Pre-select workflow (tdd, agile, minimal) |
| `--prefix <prefix>` | Set track prefix for project |

## Examples

### Initialize Monorepo as Workspace

```bash
cd my-monorepo
/maestro:setup --workspace

# Detected:
# - packages/web
# - packages/api
# - packages/shared
# Creates workspace with 3 projects
```

### Add New Project to Existing Workspace

```bash
cd my-workspace/new-service
/maestro:setup --project

# Links to ../maestro/workspace.json
# Inherits shared settings
# Creates project-specific context
```

### Clone and Setup Submodule Project

```bash
git clone --recursive git@github.com:org/platform.git
cd platform
/maestro:setup --workspace

# Detects submodules automatically
# Configures submodule tracking
# Sets up cross-project management
```

## Resume Capability

Setup progress is saved to `maestro/setup_state.json`. If interrupted:

```bash
/maestro:setup
```

Will detect existing state and offer to resume from where you left off.

## After Setup

### Single Project

1. **Create tracks**: `/maestro:newTrack` to define features or bugs
2. **Check status**: `/maestro:status` to see project overview
3. **Implement**: `/maestro:implement` to start working on tracks

### Workspace

1. **View projects**: `/maestro:projects` to see all projects
2. **Switch project**: `/maestro:projects switch <name>`
3. **Create tracks**: Project-specific or cross-project
4. **Sync submodules**: `/maestro:workspace sync`

## Related Commands

- `/maestro:workspace` - Manage workspace configuration
- `/maestro:projects` - Switch between projects
- `/maestro:newTrack` - Create new feature or bug track
- `/maestro:status` - View project and track status

---

## Setup Protocol

When this command is invoked, follow this protocol:

### Step 0: Determine Mode

```
Check command options:
  - If --workspace: Workspace Mode
  - If --project: Project Mode
  - Else: Auto-detect

Auto-detect logic:
  1. Check for parent workspace (../maestro/workspace.json)
  2. Check for multiple git repos in subdirectories
  3. Check for .gitmodules
  4. Check for monorepo patterns (lerna.json, pnpm-workspace.yaml)

  If parent workspace found:
    "I detected a parent workspace. Initialize as project? (Y) or standalone (S)?"

  If multiple repos detected:
    "I detected multiple projects. Initialize as workspace? (Y) or single project (S)?"

  Else:
    Proceed with single project setup
```

### Step 1: Check for Existing Setup

```
Read maestro/setup_state.json (or workspace.json for workspace mode)
If exists and not complete:
  - Offer to resume from last phase
  - Or start fresh with --reset
```

### Step 2: Project/Workspace Classification

**Single Project:**
```
Analyze project root:
- Check for package.json, requirements.txt, go.mod, Cargo.toml
- Check for src/, lib/, app/ directories
- Check for .git directory
- Check for existing maestro/ directory

If significant code exists: Brownfield
Else: Greenfield
```

**Workspace:**
```
Scan for projects:
1. Find all directories with .git/
2. Parse .gitmodules for submodules
3. Check for package.json workspaces
4. Check for monorepo configs

Present findings and confirm inclusion
```

### Step 3: Interactive Questionnaire

**Single Project Questions:**

Product Questions:
1. "What is the name of this product/project?"
2. "Describe what this product does in 1-2 sentences."
3. "Who are the primary users?"
4. "What are the 3-5 main goals?"

Guidelines Questions:
1. "Code quality standards?" (strict/balanced/minimal)
2. "Performance requirements?"
3. "Security considerations?"

Tech Stack:
- Brownfield: "I detected [X]. Is this accurate?"
- Greenfield: "What languages/frameworks?"

Workflow: "Choose your workflow" (TDD/Agile/Minimal)

**Workspace Questions:**

1. "Workspace name?"
2. "Which projects to include?"
3. "Default project for new tracks?"
4. "Enable cross-project tracks?" (default: yes)
5. "Commit strategy?" (atomic/independent/synchronized)
6. "Create shared product vision?"
7. "Select default workflow"

**Project-in-Workspace Questions:**

1. "Confirm workspace link?"
2. "Project name?"
3. "Track prefix?"
4. "What to inherit?" (guidelines, workflow, styleguide)
5. "Project-specific tech stack?"

### Step 4: Generate Files

**Single Project:**
Create in `maestro/`:
- product.md
- product-guidelines.md
- tech-stack.md
- workflow.md (from template)
- code-styleguide.md
- tracks.md

**Workspace:**
Create in `maestro/`:
- workspace.json
- product.md (if shared)
- product-guidelines.md (if shared)
- workflow.md
- cross-project-tracks.md
- projects/<name>.json for each project

For each project with maestro init:
- project.json (links to workspace)
- tech-stack.md (if project-specific)
- tracks.md

**Project-in-Workspace:**
Create in `maestro/`:
- project.json (with workspace link)
- tech-stack.md
- tracks.md

Update parent workspace:
- Add project to workspace.json
- Create projects/<name>.json

### Step 5: Submodule Handling (Workspace)

```
If .gitmodules exists:
  1. Parse submodule definitions
  2. Check initialization status
  3. Offer to initialize if needed
  4. Record in workspace.json

For each submodule project:
  - Note submodule path and URL
  - Track current commit
  - Set type: "submodule" in project config
```

### Step 6: Initial Track (Greenfield/Single)

```
If Greenfield and user agrees:
  1. Ask for first feature/task description
  2. Create track using newTrack protocol
  3. Record in tracks.md
```

### Step 7: Complete

```
Update setup_state.json with completed status
Display summary:
  - Files created
  - Projects configured (workspace)
  - Submodules tracked (workspace)
  - Next steps

Suggest:
  - Single: /maestro:newTrack, /maestro:status
  - Workspace: /maestro:projects, /maestro:workspace sync
```

### Validation

After EVERY file operation:
- Verify the file was created successfully
- Validate JSON files are valid
- If any operation fails, HALT and report error
- Save progress to setup_state.json for resume
