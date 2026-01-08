---
name: implement
description: Execute track implementation following the plan with sub-agent orchestration
usage: /maestro:implement [track-id]
aliases: [impl, execute, work]
---

# /maestro:implement Command

Execute the implementation plan for a track, routing tasks to specialized sub-agents and following your chosen workflow methodology.

## What It Does

1. **Selects track** - Continues active track or picks next pending
2. **Reads context** - Loads spec, plan, and project configuration
3. **Routes tasks** - Assigns work to appropriate sub-agents
4. **Follows workflow** - Adheres to TDD/Agile/Minimal methodology
5. **Updates progress** - Marks tasks complete, records commits
6. **Verifies phases** - Runs checkpoints at phase boundaries

## Usage

```bash
# Continue current track or pick next
/maestro:implement

# Implement specific track
/maestro:implement TRACK-002

# Implement specific task
/maestro:implement TRACK-002 --task 2.3

# Dry run (show what would happen)
/maestro:implement --dry-run
```

## Options

| Option | Description |
|--------|-------------|
| `--task <id>` | Start from specific task |
| `--phase <num>` | Start from specific phase |
| `--dry-run` | Show plan without executing |
| `--skip-tests` | Skip test tasks (not recommended) |
| `--continue` | Auto-continue to next task |

## Implementation Flow

### 1. Track Selection

If no track specified:
- Check for in-progress track (status: `[~]`)
- If none, select first pending track
- If multiple pending, ask user to choose

### 2. Context Loading

Before starting work:
- Read `spec.md` for requirements
- Read `plan.md` for task list
- Read `workflow.md` for methodology
- Read `tech-stack.md` for technology context
- Read `code-styleguide.md` for code standards

### 3. Task Execution

For each task:

```
┌─────────────────────────────────────────────────────────┐
│ Task 2.3: Implement JWT middleware                      │
├─────────────────────────────────────────────────────────┤
│ Agent: security-auditor, backend-developer              │
│ Depends: 2.1, 2.2 ✓                                     │
│ Workflow: TDD                                           │
└─────────────────────────────────────────────────────────┘

Step 1: Mark task in progress
  plan.md: [~] Task 2.3

Step 2: Route to sub-agent(s)
  → security-auditor: Review JWT requirements
  → backend-developer: Implement middleware

Step 3: Follow workflow
  TDD: Write tests → Implement → Refactor

Step 4: Verify completion
  - Tests pass ✓
  - Code style ✓
  - No linting errors ✓

Step 5: Commit changes
  git commit -m "feat: implement JWT middleware"
  SHA: a1b2c3d

Step 6: Update plan
  plan.md: [x] Task 2.3
  Commit: a1b2c3d
```

### 4. Phase Checkpoints

At the end of each phase:

```
══════════════════════════════════════════════════════════
  PHASE 2 CHECKPOINT
══════════════════════════════════════════════════════════

Verifying Phase 2: Backend Auth

Tasks:
  [x] 2.1 Setup auth routes
  [x] 2.2 Create user model
  [x] 2.3 Implement JWT middleware
  [x] 2.4 Create token refresh endpoint
  [x] 2.5 Add password hashing

Checks:
  [x] All tasks complete
  [x] Tests passing (24/24)
  [x] Coverage: 87% (target: 80%)
  [x] No linting errors
  [x] No type errors

Phase 2 complete. Continue to Phase 3? (Y/n)
```

### 5. Track Completion

When all phases complete:

```
══════════════════════════════════════════════════════════
  TRACK COMPLETE: TRACK-002
══════════════════════════════════════════════════════════

User Authentication implementation complete!

Summary:
  - 4 phases completed
  - 20 tasks executed
  - 15 commits created
  - 142 tests passing
  - 89% code coverage

Commits: a1b2c3d..z9y8x7w

Documentation sync:
  - product.md: No changes needed
  - tech-stack.md: Added JWT library

Options:
  1. Archive track
  2. Delete track files
  3. Keep as-is

What would you like to do? (1/2/3)
```

## Sub-Agent Orchestration

Tasks are routed to sub-agents based on:

### Task Type Mapping

| Task Contains | Primary Agent | Support Agents |
|---------------|---------------|----------------|
| database, schema, migration | sql-pro | database-administrator |
| api, endpoint, route | api-designer | backend-developer |
| ui, component, page | frontend-developer | ui-designer |
| test, spec, coverage | qa-expert | test-automator |
| security, auth, jwt | security-auditor | backend-developer |
| deploy, ci, pipeline | devops-engineer | deployment-engineer |
| docker, kubernetes | kubernetes-specialist | devops-engineer |
| docs, readme | documentation-engineer | technical-writer |

### Language Detection

Based on `tech-stack.md`:
- TypeScript project → typescript-pro
- Python project → python-pro
- Go project → golang-pro
- React frontend → react-specialist
- Django backend → django-developer

### Parallel Execution

When tasks have no dependencies:

```
Executing in parallel:
  → Task 3.1: Build login form (frontend-developer)
  → Task 3.2: Create auth API client (typescript-pro)
  → Task 3.3: Add auth state management (react-specialist)

[████████████████░░░░] 80% - Waiting for all tasks...

All parallel tasks complete.
```

## Workflow Integration

### TDD Workflow

```
For each task:
1. WRITE TESTS
   → qa-expert: Create failing tests
   → Run tests, confirm failure

2. IMPLEMENT
   → primary-agent: Write code to pass tests
   → Run tests, confirm passing

3. REFACTOR
   → code-reviewer: Suggest improvements
   → primary-agent: Apply refactoring
   → Run tests, confirm still passing

4. COMMIT
   → git commit with conventional message
   → Record SHA in plan.md
```

### Agile Workflow

```
For each task:
1. IMPLEMENT
   → primary-agent: Build functionality

2. TEST
   → qa-expert: Write tests for new code

3. REVIEW
   → code-reviewer: Quick review

4. COMMIT
   → git commit
   → Record SHA
```

### Minimal Workflow

```
For each task:
1. IMPLEMENT
   → primary-agent: Build and test

2. COMMIT
   → git commit
   → Record SHA
```

## Examples

```bash
# Start implementing the authentication feature
/maestro:implement TRACK-002

# Continue from where we left off
/maestro:implement

# See what task 3.1 involves
/maestro:implement --task 3.1 --dry-run

# Auto-continue through all tasks
/maestro:implement --continue
```

## Related Commands

- `/maestro:status` - Check progress
- `/maestro:newTrack` - Create new track
- `/maestro:revert` - Undo changes

---

## Implement Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Verify maestro/ directory exists
2. Verify required files:
   - maestro/product.md
   - maestro/tech-stack.md
   - maestro/workflow.md
   - maestro/tracks.md

3. If track ID provided:
   - Verify track directory exists
   - Verify spec.md and plan.md exist
```

### Step 1: Track Selection

```
If track ID provided:
  - Use specified track
Else if track with status "in_progress" exists:
  - Continue that track
Else if pending tracks exist:
  - If one: select it
  - If multiple: ask user to choose
Else:
  - "No tracks to implement. Create one with /maestro:newTrack"
```

### Step 2: Load Context

```
Read and parse:
1. maestro/tracks/<TRACK-ID>/spec.md
2. maestro/tracks/<TRACK-ID>/plan.md
3. maestro/tracks/<TRACK-ID>/metadata.json
4. maestro/workflow.md
5. maestro/tech-stack.md
6. maestro/code-styleguide.md (if exists)
```

### Step 3: Find Current Task

```
Parse plan.md for task statuses:
- Find first task marked [~] (resume in-progress)
- Or find first task marked [ ] (start next)

Verify dependencies:
- All tasks in "Depends" must be [x]
- If not: select different task or report blocker
```

### Step 4: Update Task Status

```
1. Change task from [ ] to [~] in plan.md
2. Update metadata.json:
   - status: "in_progress"
   - updated: current timestamp
   - current_task: task ID
```

### Step 5: Route to Sub-Agent(s)

```
1. Parse task for agent assignment
2. If multiple agents:
   - Primary agent leads
   - Secondary agents provide input
3. Invoke sub-agent with context:
   - Task description
   - Specification reference
   - Tech stack
   - Style guide
   - Workflow rules
```

### Step 6: Execute According to Workflow

**TDD Workflow:**
```
1. qa-expert: Write failing tests
2. Verify tests fail
3. primary-agent: Implement to pass tests
4. Verify tests pass
5. code-reviewer: Suggest refactoring
6. primary-agent: Apply refactoring
7. Verify tests still pass
```

**Agile Workflow:**
```
1. primary-agent: Implement feature
2. qa-expert: Write tests
3. Verify tests pass
4. code-reviewer: Quick review
```

**Minimal Workflow:**
```
1. primary-agent: Implement and basic test
```

### Step 7: Commit Changes

```
1. Stage relevant files: git add <files>
2. Create commit message:
   - Type based on task (feat/fix/refactor/test)
   - Reference track ID
   - Include task description
3. Commit: git commit -m "<message>"
4. Capture SHA
```

### Step 8: Update Plan

```
1. Mark task [x] in plan.md
2. Add commit SHA:
   - **Commit**: <SHA>
3. Update metadata.json:
   - current_task: next task or null
   - updated: timestamp
```

### Step 9: Check for Phase Completion

```
If all tasks in current phase are [x]:
  1. Run phase checkpoint verification
  2. Display checkpoint summary
  3. Ask for confirmation to continue
  4. If confirmed: proceed to next phase
```

### Step 10: Check for Track Completion

```
If all tasks in all phases are [x]:
  1. Run final verification
  2. Display track completion summary
  3. Offer archive/delete/keep options
  4. Update tracks.md status to "completed"
  5. Update metadata.json status
```

### Error Handling

```
If task fails:
  1. Keep task marked [~]
  2. Record error in plan.md
  3. Ask user how to proceed:
     - Retry task
     - Skip task (mark with note)
     - Abort implementation

If agent fails:
  1. Report agent error
  2. Suggest alternative agents
  3. Allow manual intervention
```

### Validation Rules

```
After EVERY operation:
  - Verify file writes succeeded
  - Verify git operations succeeded
  - If failure: HALT and report

Before marking task complete:
  - Verify expected changes exist
  - Verify tests pass (if applicable)
  - Verify no linting errors (if applicable)
```
