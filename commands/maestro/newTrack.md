---
name: newTrack
description: Create a new feature or bug track with specification and implementation plan
usage: /maestro:newTrack [description]
aliases: [track, new-track, create-track]
---

# /maestro:newTrack Command

Create a new development track with a detailed specification and implementation plan. Each track represents a logical unit of work (feature, bug fix, refactor, etc.) that can be implemented and reverted as a whole.

## What It Does

1. **Gathers requirements** through interactive Q&A
2. **Classifies the track** as Feature, Bug, Chore, or Refactor
3. **Generates specification** document (spec.md)
4. **Creates implementation plan** with tasks and sub-agent assignments (plan.md)
5. **Registers in tracks.md** for project-wide tracking

## Track Structure

```
maestro/tracks/<TRACK-ID>/
├── metadata.json    # Track type, status, timestamps
├── spec.md          # Requirements specification
└── plan.md          # Implementation plan with tasks
```

## Usage

```bash
# Interactive mode
/maestro:newTrack

# With initial description
/maestro:newTrack "Add user authentication with JWT"

# Specify type
/maestro:newTrack --type bug "Fix login timeout issue"
```

## Options

| Option | Description |
|--------|-------------|
| `--type <type>` | Pre-set track type (feature, bug, chore, refactor) |
| `--priority <level>` | Set priority (high, medium, low) |
| `--skip-questions` | Auto-generate from description only |

## Interactive Flow

### Step 1: Description

If not provided, you'll be asked:
> "Describe what you want to build or fix:"

### Step 2: Classification

The system auto-classifies based on keywords, or asks:
> "What type of work is this?"
> - Feature (new functionality)
> - Bug (fixing broken behavior)
> - Chore (maintenance, dependencies)
> - Refactor (improving existing code)

### Step 3: Requirement Questions

Based on track type, you'll answer 3-5 questions:

**For Features:**
1. What is the expected user outcome?
2. What are the acceptance criteria?
3. Are there dependencies on other features?
4. What components/areas will be affected?
5. Are there performance or security considerations?

**For Bugs:**
1. What is the current (broken) behavior?
2. What is the expected behavior?
3. Steps to reproduce?
4. What is the impact/severity?

**For Chores/Refactors:**
1. What is the goal of this work?
2. What areas will be affected?
3. Are there any risks?

### Step 4: Specification Review

A specification document is generated and shown:

```markdown
# Specification: User Authentication

## Overview
Implement JWT-based authentication system...

## Requirements
- Users can register with email/password
- Users can log in and receive JWT token
- Protected routes require valid token
...

## Acceptance Criteria
- [ ] User can register successfully
- [ ] User can log in and receive token
- [ ] Invalid credentials return 401
...
```

You can approve or request changes.

### Step 5: Plan Generation

An implementation plan is created with:
- Phases (logical groupings)
- Tasks with checkboxes
- Sub-agent assignments
- Dependencies between tasks

```markdown
# Plan: User Authentication

## Phase 1: Database Setup
- [ ] Task 1.1: Create users table schema
  - **Agent**: sql-pro
  - **Depends**: none

- [ ] Task 1.2: Create migrations
  - **Agent**: backend-developer
  - **Depends**: 1.1

## Phase 2: Backend Implementation
- [ ] Task 2.1: Implement registration endpoint
  - **Agent**: backend-developer, security-auditor
  - **Depends**: 1.2
...
```

### Step 6: Registration

The track is added to `maestro/tracks.md`:

```markdown
## Active Tracks

| ID | Type | Title | Status | Created |
|----|------|-------|--------|---------|
| TRACK-001 | Feature | User Authentication | Pending | 2024-01-08 |
```

## Track ID Format

Track IDs are auto-generated:
- Format: `TRACK-XXX` (sequential number)
- Or: `<TYPE>-XXX` (e.g., `FEAT-001`, `BUG-042`)

## Examples

### Create a Feature Track

```
/maestro:newTrack "Add dark mode support to the application"
```

Creates:
- `maestro/tracks/FEAT-001/spec.md`
- `maestro/tracks/FEAT-001/plan.md`
- `maestro/tracks/FEAT-001/metadata.json`

### Create a Bug Track

```
/maestro:newTrack --type bug "Users cannot reset password on mobile"
```

### Quick Track (Skip Questions)

```
/maestro:newTrack --skip-questions "Update dependencies to latest versions"
```

## After Creating a Track

1. Review the generated spec and plan
2. Make any needed adjustments
3. Start implementation with `/maestro:implement`
4. Check progress with `/maestro:status`

## Related Commands

- `/maestro:setup` - Initialize project context (required first)
- `/maestro:status` - View all tracks and progress
- `/maestro:implement` - Start working on a track

---

## newTrack Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Check maestro/ directory exists
   - If not: "Run /maestro:setup first to initialize your project"

2. Check required files exist:
   - maestro/product.md
   - maestro/tech-stack.md
   - maestro/workflow.md
   - If missing: "Project setup incomplete. Run /maestro:setup"

3. Read existing tracks from maestro/tracks.md
   - Determine next track number
```

### Step 1: Gather Description

```
If description provided in command:
  - Use it as initial description
Else:
  - Ask: "Describe what you want to build or fix:"
  - Wait for response
```

### Step 2: Classify Track Type

```
Analyze description for keywords:
  - "fix", "bug", "broken", "error", "crash" → Bug
  - "add", "create", "implement", "new" → Feature
  - "update", "upgrade", "dependency" → Chore
  - "refactor", "clean", "improve", "optimize" → Refactor

If unclear:
  - Ask user to select type
  - Provide options with descriptions
```

### Step 3: Interactive Questions

Ask questions ONE AT A TIME based on track type.

**Feature Questions:**
1. "What should the user be able to do when this is complete?"
2. "What are the key acceptance criteria? (list 3-5)"
3. "Which parts of the codebase will this affect?"
4. "Are there any technical constraints or requirements?"

**Bug Questions:**
1. "What is happening now (the bug)?"
2. "What should happen instead?"
3. "How can this be reproduced?"

**Chore/Refactor Questions:**
1. "What is the goal of this work?"
2. "What areas or files will be affected?"

### Step 4: Generate Specification

Create `spec.md` with:
```markdown
# Specification: <Title>

**Track ID**: <TRACK-ID>
**Type**: <Feature|Bug|Chore|Refactor>
**Created**: <timestamp>
**Status**: Draft

## Overview
<2-3 sentence summary based on description>

## Context
<Reference to product.md and relevant tech-stack.md items>

## Requirements
<Bulleted list based on answers>

## Acceptance Criteria
<Checkboxes based on answers>

## Technical Notes
<Any constraints, dependencies, or considerations>

## Affected Areas
<List of components/files that will be modified>
```

Show to user and ask for approval or changes.

### Step 5: Generate Plan

Read `maestro/workflow.md` to understand methodology.
Read `maestro/tech-stack.md` to understand technologies.

Create `plan.md` with:
```markdown
# Plan: <Title>

**Track ID**: <TRACK-ID>
**Specification**: [spec.md](./spec.md)
**Workflow**: <TDD|Agile|Minimal>
**Status**: Not Started

## Phase 1: <Phase Name>

- [ ] Task 1.1: <Task description>
  - **Agent**: <primary-agent>
  - **Depends**: none
  - **Commit**: (pending)

- [ ] Task 1.2: <Task description>
  - **Agent**: <primary-agent>, <secondary-agent>
  - **Depends**: 1.1
  - **Commit**: (pending)

### Phase 1 Checkpoint
- [ ] Verify all Phase 1 tasks complete
- [ ] Run tests
- [ ] Review changes

## Phase 2: <Phase Name>
...

## Completion Checklist
- [ ] All tasks complete
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Ready for deployment
```

### Step 6: Create Track Files

```
1. Generate track ID (TRACK-XXX or TYPE-XXX)
2. Create directory: maestro/tracks/<TRACK-ID>/
3. Write spec.md
4. Write plan.md
5. Write metadata.json:
   {
     "id": "<TRACK-ID>",
     "type": "<type>",
     "title": "<title>",
     "status": "pending",
     "created": "<ISO timestamp>",
     "updated": "<ISO timestamp>",
     "priority": "<priority>",
     "agents": ["<assigned-agents>"]
   }
```

### Step 7: Update tracks.md

```
Add entry to maestro/tracks.md:

| <ID> | <Type> | <Title> | Pending | <Date> |
```

### Step 8: Completion

Display summary:
```
✓ Track created: <TRACK-ID>

Files created:
  - maestro/tracks/<TRACK-ID>/spec.md
  - maestro/tracks/<TRACK-ID>/plan.md
  - maestro/tracks/<TRACK-ID>/metadata.json

Next steps:
  - Review the specification and plan
  - Run /maestro:implement to start working
  - Run /maestro:status to see all tracks
```

### Agent Assignment Logic

Map tasks to agents based on:

1. **Task keywords** → Agent matching from registry
2. **Tech stack** → Language/framework specialists
3. **Task type**:
   - Database tasks → sql-pro, database-administrator
   - API tasks → api-designer, backend-developer
   - UI tasks → frontend-developer, ui-designer
   - Test tasks → qa-expert, test-automator
   - Security tasks → security-auditor
   - Deploy tasks → devops-engineer

4. **Workflow requirements**:
   - TDD → Include qa-expert for test tasks
   - Security-sensitive → Include security-auditor

### Validation

After EVERY file operation:
- Verify success
- If failure: HALT and report error
- Update metadata with error state if needed
