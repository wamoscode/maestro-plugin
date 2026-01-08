---
name: newTrack
description: Create a new feature or bug track with specification and implementation plan
usage: /maestro:newTrack [description]
aliases: [track, new-track, create-track]
---

# /maestro:newTrack Command

Create a new development track with a detailed specification and implementation plan. Each track represents a logical unit of work (feature, bug fix, refactor, etc.) that can be implemented and reverted as a whole.

**Multi-Project Support**: In workspaces, tracks can be project-specific or cross-project spanning multiple repositories.

## What It Does

1. **Gathers requirements** through interactive Q&A
2. **Classifies the track** as Feature, Bug, Chore, or Refactor
3. **Determines scope** - single project or cross-project (workspaces)
4. **Generates specification** document (spec.md)
5. **Creates implementation plan** with tasks and sub-agent assignments (plan.md)
6. **Registers in tracks.md** for project-wide tracking

## Track Modes

### Single Project Track (Default)

Standard track within the current/active project.

```bash
/maestro:newTrack "Add user authentication"
```

### Cross-Project Track

Track spanning multiple projects in a workspace.

```bash
/maestro:newTrack --cross-project "Implement shared auth across services"
```

### Specific Project Track

Create track in a specific project (workspace mode).

```bash
/maestro:newTrack --project backend "Add rate limiting to API"
```

## Track Structure

### Single Project Track

```
maestro/tracks/<TRACK-ID>/
├── metadata.json    # Track type, status, timestamps
├── spec.md          # Requirements specification
└── plan.md          # Implementation plan with tasks
```

### Cross-Project Track

```
maestro/tracks/<CROSS-ID>/
├── metadata.json    # Includes project scope
├── spec.md          # Multi-project specification
└── plan.md          # Per-project phases and tasks
```

## Usage

```bash
# Interactive mode (current project)
/maestro:newTrack

# With initial description
/maestro:newTrack "Add user authentication with JWT"

# Specify type
/maestro:newTrack --type bug "Fix login timeout issue"

# Cross-project track (workspace only)
/maestro:newTrack --cross-project "Add shared authentication"

# Specify which projects (workspace)
/maestro:newTrack --projects frontend,backend "Add user profile"

# Create in specific project
/maestro:newTrack --project backend "Add caching layer"

# In submodule project
/maestro:newTrack --project shared-libs "Add date utilities"
```

## Options

| Option | Description |
|--------|-------------|
| `--type <type>` | Pre-set track type (feature, bug, chore, refactor) |
| `--priority <level>` | Set priority (high, medium, low) |
| `--skip-questions` | Auto-generate from description only |
| `--cross-project` | Create track spanning multiple projects |
| `--projects <list>` | Comma-separated project names to include |
| `--project <name>` | Create track in specific project |
| `--all-projects` | Include all workspace projects |

## Interactive Flow

### Step 1: Scope Determination (Workspace)

In workspace mode, first determine scope:

```
You're in workspace "my-platform"
Active project: frontend

How would you like to scope this track?
  1. Current project only (frontend)
  2. Select specific projects
  3. All projects
  4. Cross-project (coordinated implementation)
```

### Step 2: Description

If not provided:
> "Describe what you want to build or fix:"

### Step 3: Classification

Auto-classifies based on keywords:
- "fix", "bug", "broken" → Bug
- "add", "create", "new" → Feature
- "update", "upgrade" → Chore
- "refactor", "improve" → Refactor

### Step 4: Requirement Questions

Based on track type:

**For Features:**
1. What is the expected user outcome?
2. What are the acceptance criteria?
3. Are there dependencies on other features?
4. What components/areas will be affected?

**For Cross-Project Features (additional):**
5. Which projects should handle which aspects?
6. Are there shared dependencies?
7. What is the integration approach?

**For Bugs:**
1. What is the current (broken) behavior?
2. What is the expected behavior?
3. Steps to reproduce?
4. Which project(s) contain the bug?

### Step 5: Specification Review

**Single Project Spec:**
```markdown
# Specification: User Authentication

## Overview
Implement JWT-based authentication system...

## Requirements
- Users can register with email/password
- Users can log in and receive JWT token
...
```

**Cross-Project Spec:**
```markdown
# Specification: Shared Authentication

## Overview
Implement unified authentication across frontend and backend...

## Project Scope

### frontend
- Login/register UI components
- Token storage and refresh
- Protected route handling

### backend
- JWT generation and validation
- User credential verification
- Session management

### shared-libs
- Common auth types and interfaces
- Token validation utilities

## Integration Points
- Frontend calls backend auth API
- Both use shared-libs for types
...
```

### Step 6: Plan Generation

**Single Project Plan:**
```markdown
# Plan: User Authentication

## Phase 1: Database Setup
- [ ] Task 1.1: Create users table
  - **Agent**: sql-pro
  - **Depends**: none

## Phase 2: Backend Implementation
- [ ] Task 2.1: Implement registration
  - **Agent**: backend-developer
...
```

**Cross-Project Plan:**
```markdown
# Plan: Shared Authentication

## Phase 1: Shared Infrastructure
**Project**: shared-libs

- [ ] Task 1.1: Create auth types
  - **Agent**: typescript-pro
  - **Project**: shared-libs
  - **Depends**: none

## Phase 2: Backend Auth
**Project**: backend

- [ ] Task 2.1: JWT middleware
  - **Agent**: backend-developer
  - **Project**: backend
  - **Depends**: 1.1

## Phase 3: Frontend Auth
**Project**: frontend

- [ ] Task 3.1: Login component
  - **Agent**: frontend-developer
  - **Project**: frontend
  - **Depends**: 2.1, 1.1

## Integration Phase
**Projects**: frontend, backend

- [ ] Task 4.1: End-to-end auth testing
  - **Agent**: qa-expert
  - **Projects**: frontend, backend
  - **Depends**: 2.*, 3.*
```

### Step 7: Registration

Added to appropriate tracks file:

**Single Project**: `maestro/tracks.md`
**Cross-Project**: `maestro/cross-project-tracks.md`

## Track ID Format

### Single Project
- Format: `TRACK-XXX` or `<PREFIX>-XXX`
- Examples: `TRACK-001`, `FE-001`, `BACK-042`

### Cross-Project
- Format: `CROSS-XXX`
- Example: `CROSS-001`

## Examples

### Create a Cross-Project Feature

```bash
/maestro:newTrack --cross-project "Add real-time notifications"

# Interactive flow:
# 1. "Which projects should be involved?"
#    - [x] frontend (UI components)
#    - [x] backend (notification service)
#    - [ ] shared-libs
# 2. Requirement questions for each project
# 3. Creates spec with per-project sections
# 4. Creates plan with project-specific phases
```

### Create Track in Submodule

```bash
/maestro:newTrack --project shared-libs "Add validation utilities"

# Creates track in shared-libs project
# Uses shared-libs tech stack for agent selection
# Tracks will update parent submodule reference
```

### Select Projects Explicitly

```bash
/maestro:newTrack --projects frontend,backend "Add user profile"

# Only involves frontend and backend
# Creates coordinated plan across both
```

## Submodule Considerations

When creating tracks that involve submodules:

1. **Track metadata** records submodule state
2. **Implementation** commits to submodule first
3. **Parent reference** updated after submodule commits
4. **Revert** handles both submodule and parent

```json
{
  "id": "CROSS-001",
  "scope": {
    "type": "cross-project",
    "projects": ["frontend", "backend"],
    "submodules": ["shared-libs"]
  },
  "submoduleState": {
    "before": {
      "shared-libs": "abc123"
    }
  }
}
```

## After Creating a Track

1. Review the generated spec and plan
2. Make any needed adjustments
3. Start implementation with `/maestro:implement`
4. Check progress with `/maestro:status`

For cross-project tracks:
```bash
# View cross-project status
/maestro:status --cross-project

# Implement across projects
/maestro:implement CROSS-001 --all-projects
```

## Related Commands

- `/maestro:setup` - Initialize project context (required first)
- `/maestro:projects` - Switch between projects (workspace)
- `/maestro:status` - View all tracks and progress
- `/maestro:implement` - Start working on a track

---

## newTrack Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Check maestro/ directory exists
   - If not: "Run /maestro:setup first to initialize your project"

2. Determine context:
   - Check for maestro/workspace.json → Workspace mode
   - Check for maestro/project.json → Project-in-workspace mode
   - Else: Single project mode

3. Check required files exist:
   - Single: product.md, tech-stack.md, workflow.md
   - Workspace: workspace.json, workflow.md
   - If missing: "Project setup incomplete. Run /maestro:setup"

4. Read existing tracks:
   - From maestro/tracks.md (single/project)
   - From maestro/cross-project-tracks.md (cross-project)
   - Determine next track number
```

### Step 1: Determine Scope (Workspace Only)

```
If workspace mode and no --project/--cross-project flag:
  Ask: "How would you like to scope this track?"
    1. Current project only (<active-project>)
    2. Select specific projects
    3. Cross-project (coordinated)

If --cross-project:
  - Show available projects
  - Ask which to include (or use --projects list)

If --project <name>:
  - Validate project exists
  - Set as target project
```

### Step 2: Gather Description

```
If description provided in command:
  - Use it as initial description
Else:
  - Ask: "Describe what you want to build or fix:"
  - Wait for response
```

### Step 3: Classify Track Type

```
Analyze description for keywords:
  - "fix", "bug", "broken", "error", "crash" → Bug
  - "add", "create", "implement", "new" → Feature
  - "update", "upgrade", "dependency" → Chore
  - "refactor", "clean", "improve", "optimize" → Refactor

If unclear:
  - Ask user to select type
```

### Step 4: Interactive Questions

**Single Project:**
Ask questions based on type (see main documentation).

**Cross-Project (additional):**
1. "What is the primary goal across all projects?"
2. For each project: "What will <project> handle?"
3. "How will the projects integrate?"
4. "Are there shared dependencies?"
5. "What is the implementation order?"

### Step 5: Generate Specification

**Single Project spec.md:**
```markdown
# Specification: <Title>

**Track ID**: <TRACK-ID>
**Type**: <Feature|Bug|Chore|Refactor>
**Project**: <project-name>
**Created**: <timestamp>
**Status**: Draft

## Overview
<summary>

## Context
<Reference to product.md and tech-stack.md>

## Requirements
<Bulleted list>

## Acceptance Criteria
<Checkboxes>

## Technical Notes
<Constraints, dependencies>

## Affected Areas
<Components/files to modify>
```

**Cross-Project spec.md:**
```markdown
# Specification: <Title>

**Track ID**: <CROSS-ID>
**Type**: <type>
**Scope**: Cross-Project
**Projects**: <list>
**Created**: <timestamp>
**Status**: Draft

## Overview
<summary>

## Project Scope

### <project-1>
<Responsibilities and requirements>

### <project-2>
<Responsibilities and requirements>

## Integration Points
<How projects interact>

## Shared Dependencies
<Common libraries, types, interfaces>

## Acceptance Criteria
<Per-project and integration criteria>
```

### Step 6: Generate Plan

**Single Project plan.md:**
(See standard plan format in main documentation)

**Cross-Project plan.md:**
```markdown
# Plan: <Title>

**Track ID**: <CROSS-ID>
**Specification**: [spec.md](./spec.md)
**Workflow**: <workflow>
**Scope**: Cross-Project

## Overview

| Project | Phase | Tasks | Status |
|---------|-------|-------|--------|
| shared-libs | 1 | 3 | Pending |
| backend | 2 | 5 | Pending |
| frontend | 3 | 4 | Pending |
| integration | 4 | 2 | Pending |

## Phase 1: Shared Infrastructure
**Project**: shared-libs

- [ ] Task 1.1: <description>
  - **Agent**: <agent>
  - **Project**: shared-libs
  - **Depends**: none
  - **Commit**: (pending)

## Phase 2: Backend Implementation
**Project**: backend

- [ ] Task 2.1: <description>
  - **Agent**: <agent>
  - **Project**: backend
  - **Depends**: 1.*
  - **Commit**: (pending)

## Phase 3: Frontend Implementation
**Project**: frontend

- [ ] Task 3.1: <description>
  - **Agent**: <agent>
  - **Project**: frontend
  - **Depends**: 1.*, 2.1
  - **Commit**: (pending)

## Phase 4: Integration
**Projects**: frontend, backend

- [ ] Task 4.1: Integration testing
  - **Agent**: qa-expert
  - **Projects**: frontend, backend
  - **Depends**: 2.*, 3.*
  - **Commit**: (pending)

## Commit Strategy
<From workspace.json: atomic/independent/synchronized>

## Submodule Notes
<If applicable: submodule handling instructions>
```

### Step 7: Create Track Files

```
1. Generate track ID:
   - Single: TRACK-XXX or <PREFIX>-XXX
   - Cross-project: CROSS-XXX

2. Create directory:
   - Single: <project>/maestro/tracks/<ID>/
   - Cross-project: maestro/tracks/<ID>/

3. Write files:
   - spec.md
   - plan.md
   - metadata.json (with scope info)

4. For submodules: record current commit in metadata
```

### Step 8: Update tracks.md

```
Single Project:
  Add to <project>/maestro/tracks.md

Cross-Project:
  Add to maestro/cross-project-tracks.md
  Also note in each involved project's tracks.md
```

### Step 9: Completion

```
Display summary:
  ✓ Track created: <ID>

  Scope: <single-project|cross-project>
  Projects: <list>

  Files created:
    - <path>/spec.md
    - <path>/plan.md
    - <path>/metadata.json

  Next steps:
    - Review the specification and plan
    - Run /maestro:implement to start working
    - Run /maestro:status to see progress
```

### Agent Assignment Logic

For cross-project tracks, consider:

1. **Project tech stack** - Use project-specific tech-stack.md
2. **Task location** - Which project owns the task
3. **Integration tasks** - May need agents from multiple projects
4. **Submodule tasks** - Consider parent update requirements

### Validation

After EVERY file operation:
- Verify success
- Validate JSON is valid
- If failure: HALT and report error
- For cross-project: ensure all project directories accessible
