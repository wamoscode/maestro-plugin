---
name: implement
description: Execute track implementation following the plan with sub-agent orchestration
usage: /maestro:implement [track-id]
aliases: [impl, execute, work]
---

# /maestro:implement Command

Execute the implementation plan for a track, routing tasks to specialized sub-agents and following your chosen workflow methodology.

## CRITICAL: Mandatory Sub-Agent Routing

**ALL tasks in /maestro:implement MUST be executed through sub-agents via the Task tool.**

This is NOT optional:

1. **EVERY task** from the plan routes to appropriate sub-agent(s)
2. **ALWAYS** use Task tool with `subagent_type` parameter
3. **NEVER** implement tasks directly without sub-agent routing
4. **AUTOMATICALLY** select agents based on task type and tech stack

```text
Plan Task: "Implement JWT middleware"
→ Task tool: subagent_type="backend-developer" + "security-auditor"

Plan Task: "Create login form component"
→ Task tool: subagent_type="frontend-developer"

Plan Task: "Add user table migration"
→ Task tool: subagent_type="sql-pro"
```

**Multi-Project Support**: Execute cross-project tracks across multiple repositories with coordinated commits and submodule handling.

## What It Does

1. **Selects track** - Continues active track or picks next pending
2. **Reads context** - Loads spec, plan, and project configuration
3. **Routes tasks** - Assigns work to appropriate sub-agents
4. **Follows workflow** - Adheres to TDD/Agile/Minimal methodology
5. **Updates progress** - Marks tasks complete, records commits
6. **Handles submodules** - Commits and updates parent references
7. **Verifies phases** - Runs checkpoints at phase boundaries

## Usage

```bash
# Continue current track or pick next
/maestro:implement

# Implement specific track
/maestro:implement TRACK-002

# Cross-project track
/maestro:implement CROSS-001

# Execute across all involved projects
/maestro:implement CROSS-001 --all-projects

# Implement specific project portion
/maestro:implement CROSS-001 --project frontend

# Sync submodules before implementing
/maestro:implement TRACK-001 --sync-submodules

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
| `--project <name>` | Only implement tasks for this project |
| `--all-projects` | Execute cross-project track across all projects |
| `--sync-submodules` | Sync submodules before starting |
| `--dry-run` | Show plan without executing |
| `--skip-tests` | Skip test tasks (not recommended) |
| `--continue` | Auto-continue to next task |
| `--commit-strategy <type>` | Override workspace commit strategy |

## Implementation Flow

### Single Project Implementation

Standard flow for project-specific tracks:

```
┌─────────────────────────────────────────────────────────┐
│ Task 2.3: Implement JWT middleware                      │
├─────────────────────────────────────────────────────────┤
│ Agent: security-auditor, backend-developer              │
│ Depends: 2.1, 2.2 ✓                                     │
│ Workflow: TDD                                           │
└─────────────────────────────────────────────────────────┘

Step 1: Mark task in progress
Step 2: Route to sub-agent(s)
Step 3: Follow workflow (TDD/Agile/Minimal)
Step 4: Verify completion
Step 5: Commit changes
Step 6: Update plan
```

### Cross-Project Implementation

For tracks spanning multiple repositories:

```
══════════════════════════════════════════════════════════
  CROSS-PROJECT IMPLEMENTATION: CROSS-001
══════════════════════════════════════════════════════════

Track: Shared Authentication
Projects: frontend, backend, shared-libs
Commit Strategy: Atomic

──────────────────────────────────────────────────────────
  PROJECT ORDER
──────────────────────────────────────────────────────────

1. shared-libs (dependency - execute first)
   Tasks: 1.1, 1.2, 1.3

2. backend (depends on shared-libs)
   Tasks: 2.1, 2.2, 2.3, 2.4, 2.5

3. frontend (depends on backend, shared-libs)
   Tasks: 3.1, 3.2, 3.3, 3.4, 3.5

4. Integration
   Tasks: 4.1, 4.2

Proceed? (Y/n)
```

### Submodule Workflow

When implementing in a submodule:

```
══════════════════════════════════════════════════════════
  IMPLEMENTING IN SUBMODULE: shared-libs
══════════════════════════════════════════════════════════

Current state:
  Parent expects: abc1234
  Submodule at:   abc1234 (in sync)

──────────────────────────────────────────────────────────

Executing Task 1.1: Create auth types
  Agent: typescript-pro
  [████████████████████] Complete

Committing to submodule...
  git commit -m "feat: add authentication type definitions"
  SHA: def5678

──────────────────────────────────────────────────────────
  SUBMODULE UPDATE
──────────────────────────────────────────────────────────

Submodule 'shared-libs' has new commits:
  Before: abc1234
  After:  def5678

Update parent repository reference? (Y/n)
  → Creates commit in parent: "chore: update shared-libs submodule"
```

## Cross-Project Commit Strategies

### Atomic (Default)

Coordinated commits across all repositories:

```
1. Complete all tasks in dependency order
2. Commit to submodules first
3. Update parent submodule references
4. Create linked commit messages

Commits:
  shared-libs: def5678 "feat: add auth types"
  backend:     ghi9012 "feat: implement auth API"
  frontend:    jkl3456 "feat: add auth UI"
  parent:      mno7890 "chore: update submodules for auth"
```

### Independent

Each project commits separately:

```
1. Execute tasks project by project
2. Commit after each project's tasks complete
3. Submodule references update independently

shared-libs: Complete → Commit
backend: Complete → Commit
frontend: Complete → Commit
```

### Synchronized

Linked commit messages with cross-references:

```
All commits include:
  Related: CROSS-001
  See also: <other-repo>#<sha>

Example:
  "feat: implement auth API

  Related: CROSS-001
  Frontend: frontend#jkl3456
  Shared: shared-libs#def5678"
```

## Task Execution in Cross-Project

### Per-Project Context

Each project's tasks use that project's context:

```
Executing in 'frontend':
  - Uses frontend/maestro/tech-stack.md
  - Uses frontend/maestro/code-styleguide.md
  - Commits to frontend repository

Executing in 'backend':
  - Uses backend/maestro/tech-stack.md
  - Uses backend/maestro/code-styleguide.md
  - Commits to backend repository
```

### Parallel Execution (Same Project)

Tasks without dependencies run in parallel:

```
Executing in parallel (frontend):
  → Task 3.1: Build login form (frontend-developer)
  → Task 3.2: Create auth API client (typescript-pro)
  → Task 3.3: Add auth state management (react-specialist)

[████████████████░░░░] 80%
```

### Sequential Execution (Cross-Project)

Projects execute in dependency order:

```
shared-libs tasks complete ✓
  ↓ dependency satisfied
backend tasks running...
  ↓ when complete
frontend tasks start
```

## Phase Checkpoints

At the end of each phase:

```
══════════════════════════════════════════════════════════
  PHASE 2 CHECKPOINT (backend)
══════════════════════════════════════════════════════════

Project: backend
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

Commits for this phase:
  ghi9012, jkl3456, mno7890

Phase 2 complete. Continue to Phase 3? (Y/n)
```

## Track Completion

### Single Project

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

Commits: a1b2c3d..z9y8x7w
```

### Cross-Project

```
══════════════════════════════════════════════════════════
  CROSS-PROJECT TRACK COMPLETE: CROSS-001
══════════════════════════════════════════════════════════

Shared Authentication implementation complete!

Per-Project Summary:
  shared-libs: 3 tasks, 3 commits
  backend:     5 tasks, 5 commits
  frontend:    5 tasks, 4 commits
  integration: 2 tasks, 1 commit

Total:
  - 15 tasks executed
  - 13 commits across 4 projects
  - All tests passing

Submodule Updates:
  shared-libs: abc1234 → xyz7890 (pushed)
  Parent reference: Updated in commit qrs4567

Commits by project:
  shared-libs: def5678, ghi9012, jkl3456
  backend: mno7890, pqr1234, stu5678, vwx9012
  frontend: abc3456, def7890, ghi1234, jkl5678
  parent: mno9012

Archive track? (Y/n)
```

## Examples

```bash
# Start implementing authentication
/maestro:implement TRACK-002

# Continue cross-project implementation
/maestro:implement CROSS-001 --all-projects

# Only work on backend portion
/maestro:implement CROSS-001 --project backend

# Sync submodules first
/maestro:implement CROSS-001 --sync-submodules

# See execution plan
/maestro:implement CROSS-001 --dry-run

# Override commit strategy
/maestro:implement CROSS-001 --commit-strategy independent
```

## Related Commands

- `/maestro:status` - Check progress
- `/maestro:projects switch` - Change active project
- `/maestro:workspace sync` - Sync submodules
- `/maestro:revert` - Undo changes

---

## Implement Protocol

When this command is invoked, follow this protocol:

### Pre-Validation

```
1. Verify maestro/ directory exists

2. Determine context:
   - Check for workspace.json → Workspace mode
   - Check for project.json → Project-in-workspace mode
   - Else: Single project mode

3. Verify required files based on mode

4. If track ID provided:
   - Verify track directory exists
   - Verify spec.md and plan.md exist
   - If CROSS-* track: verify it's a workspace
```

### Step 1: Track Selection

```
If track ID provided:
  - Use specified track
  - If CROSS-* track in workspace: load cross-project config
Else if track with status "in_progress" exists:
  - Continue that track
Else if pending tracks exist:
  - If one: select it
  - If multiple: ask user to choose
Else:
  - "No tracks to implement. Create one with /maestro:newTrack"
```

### Step 2: Load Context

**Single Project:**
```
Read and parse:
1. maestro/tracks/<TRACK-ID>/spec.md
2. maestro/tracks/<TRACK-ID>/plan.md
3. maestro/tracks/<TRACK-ID>/metadata.json
4. maestro/workflow.md
5. maestro/tech-stack.md
6. maestro/code-styleguide.md (if exists)
```

**Cross-Project:**
```
Read workspace config:
1. maestro/workspace.json
2. maestro/tracks/<CROSS-ID>/spec.md
3. maestro/tracks/<CROSS-ID>/plan.md
4. maestro/tracks/<CROSS-ID>/metadata.json

For each involved project:
1. <project>/maestro/tech-stack.md
2. <project>/maestro/code-styleguide.md
3. <project>/maestro/project.json
```

### Step 3: Determine Execution Order (Cross-Project)

```
1. Parse project dependencies from plan.md
2. Build execution graph
3. Topological sort for order:
   - Submodules first
   - Then dependent projects
   - Integration last
4. Verify all project paths accessible
```

### Step 4: Submodule Sync (if --sync-submodules or submodules exist)

```
For each submodule project:
  1. Check current state: git submodule status
  2. If behind: git submodule update
  3. If dirty: warn user, ask to proceed
  4. Record state in metadata.json submoduleState.before
```

### Step 5: Find Current Task

```
Parse plan.md for task statuses:
- Find first task marked [~] (resume in-progress)
- Or find first task marked [ ] (start next)

For cross-project:
- Respect project order
- Find first incomplete task in current project
- When project complete, move to next

Verify dependencies:
- All tasks in "Depends" must be [x]
- For cross-project: check cross-project dependencies
```

### Step 6: Update Task Status

```
1. Change task from [ ] to [~] in plan.md
2. Update metadata.json:
   - status: "in_progress"
   - updated: current timestamp
   - current_task: task ID
   - For cross-project: current_project
```

### Step 7: Route to Sub-Agent(s) with Knowledge Injection

```
1. Parse task for agent assignment

2. INJECT RELEVANT KNOWLEDGE (NEW):
   - Call KnowledgeRecall.recallForTask(task)
   - Score and rank relevant past knowledge
   - Filter by minimum relevance threshold (0.3)
   - Format knowledge for agent context:

   ## Relevant Past Knowledge
   ### Decisions (with confidence scores)
   - "Use JWT for authentication" (85% confidence, 92% relevance)
   - "Prefer functional components" (78% confidence, 75% relevance)

   ### Applicable Patterns
   - Error handling pattern: try-catch with custom error types
   - API response format: { success, data, error }

   ### Recommendations
   - Review decision on caching strategy (high priority)
   - Similar task had authentication blocker - check token refresh

   - Track which knowledge IDs were injected for feedback loop

3. Load project-specific context:
   - tech-stack.md from task's project
   - code-styleguide.md from task's project

4. Invoke sub-agent with ENRICHED context:
   - Original task description
   - Injected knowledge context
   - Project-specific guidelines
```

### Step 8: Execute According to Workflow

Follow workflow from project's workflow.md or workspace workflow.md.

### Step 9: Commit Changes and Capture Decisions

**Single Project:**
```
1. Stage relevant files: git add <files>
2. Create commit message
3. Commit: git commit -m "<message>"
4. Capture SHA

5. CAPTURE DECISIONS FROM AGENT OUTPUT (NEW):
   - Parse agent output for decision indicators:
     * "decided to", "chose", "selected", "will use"
     * "prefer", "going with", "approach"
   - For each detected decision:
     a. Call LearningJournal.logDecision({
          title: extracted decision title,
          rationale: extracted reasoning,
          agentId: executing agent,
          taskId: current task,
          phase: current phase,
          confidence: calculated from language certainty
        })
     b. Trigger ContextEnrichment.onDecisionCapture()
   - Log discoveries and patterns similarly

6. RECORD KNOWLEDGE OUTCOME (NEW):
   - For each knowledge ID injected in Step 7:
     a. Determine if knowledge was helpful:
        - Was it referenced in agent output?
        - Did task complete successfully?
     b. Call KnowledgeStore.recordOutcome(id, {
          taskId, trackId, success, impact, notes
        })
   - This improves future knowledge relevance scoring
```

**Submodule Project:**
```
1. cd to submodule directory
2. Stage and commit in submodule
3. Capture SHA
4. Record in metadata.json commitsByProject.<project>
5. Ask to update parent reference:
   - If yes: cd to parent, stage submodule, commit
   - Record parent commit in submoduleState.after
6. Capture decisions and record outcomes (as above)
```

**Cross-Project (Atomic):**
```
After all projects complete:
1. Verify all submodule commits
2. Update parent references for all submodules
3. Create final parent commit linking all changes
4. Aggregate decisions across all project tasks
```

### Step 10: Update Plan

```
1. Mark task [x] in plan.md
2. Add commit SHA:
   - **Commit**: <SHA>
   - For cross-project: note which project
3. Update metadata.json
```

### Step 11: Check Phase/Project Completion with Learning Summary

```
If all tasks in current phase are [x]:
  1. Run phase checkpoint verification
  2. Display checkpoint summary

  3. SUMMARIZE PHASE LEARNINGS (NEW):
     a. Call SessionLearningController.onPhaseCompletion(phase, track)
     b. Collect all journal entries for this phase:
        - Decisions made
        - Discoveries found
        - Blockers resolved
        - Patterns identified

     c. Display Phase Learning Summary:
     ┌─────────────────────────────────────────────────────────┐
     │ Phase 2 Learning Summary                                │
     ├─────────────────────────────────────────────────────────┤
     │ Decisions: 3 captured                                   │
     │   • Use connection pooling for DB (high confidence)     │
     │   • Implement retry logic with exponential backoff      │
     │   • Cache user sessions in Redis                        │
     │                                                         │
     │ Discoveries: 1                                          │
     │   • Pattern: All API endpoints follow /api/v1/{resource}│
     │                                                         │
     │ Blockers Resolved: 1                                    │
     │   • Auth token expiry → Implemented refresh flow        │
     │                                                         │
     │ Knowledge Injected: 2 entries used, 2 helpful           │
     └─────────────────────────────────────────────────────────┘

     d. Generate enrichment suggestions:
        - Suggest updating context files if significant decisions
        - Propose adding to pattern library
        - Flag documentation updates needed

  4. Ask for confirmation to continue

For cross-project:
  If all tasks for current project are [x]:
    1. Run project checkpoint
    2. Summarize project-specific learnings
    3. If submodule: prompt for parent update
    4. Move to next project
```

### Step 12: Check Track Completion with Full Knowledge Synthesis

```
If all tasks in all phases/projects are [x]:
  1. Run final verification
  2. Display track completion summary
  3. For cross-project: show per-project summary
  4. Show submodule update summary

  5. FULL KNOWLEDGE SYNTHESIS (NEW):
     a. Call SessionLearningController.finalizeSession()
     b. Export journal to knowledge base:
        - Filter by minimum confidence threshold (0.6)
        - Save decisions, patterns, discoveries, blockers
        - Update knowledge index

     c. Generate Enhanced Retrospective:
        - Call KnowledgeCapture.createRetrospectiveWithJournal()
        - Include all session learnings
        - Document key decisions with rationale
        - List discovered patterns
        - Record blocker resolutions with prevention strategies

     d. Display Knowledge Report:
     ══════════════════════════════════════════════════════════
       TRACK KNOWLEDGE SYNTHESIS: TRACK-002
     ══════════════════════════════════════════════════════════

     Knowledge Captured:
       • Decisions: 8 (6 high-confidence, persisted to knowledge base)
       • Patterns: 3 (added to pattern library)
       • Research: 2 findings
       • Blockers: 2 resolved (with prevention strategies)

     Key Decisions:
       1. Use JWT with refresh tokens for auth (ADR-0012)
       2. Implement rate limiting at API gateway
       3. Cache frequently accessed data in Redis

     New Patterns:
       1. API error handling with typed error responses
       2. Repository pattern for data access

     Context Updates Suggested:
       • tech-stack.md: Add Redis caching section
       • product-guidelines.md: Document auth approach

     Feedback Loop:
       • Knowledge injected: 12 entries across 15 tasks
       • Helpful: 10 (83% success rate)
       • Knowledge confidence adjusted for 12 entries

     ══════════════════════════════════════════════════════════

     e. Prompt for context updates:
        - "Apply suggested context updates? (Y/n)"
        - If approved, apply enrichments

  6. Update tracks.md status to "completed"

  7. Archive session journal:
     - Save to maestro/knowledge/sessions/{sessionId}.json
     - Link to track retrospective
```

### Error Handling

```
If task fails:
  1. Keep task marked [~]
  2. Record error in plan.md
  3. Ask user how to proceed

If submodule commit fails:
  1. Report submodule error
  2. Offer to abort or retry
  3. If partial commits: warn about inconsistent state

If cross-project dependency unmet:
  1. Identify blocking project/task
  2. Suggest completing blocker first
  3. Or allow force continue with warning
```

### Validation Rules

```
After EVERY operation:
  - Verify file writes succeeded
  - Verify git operations succeeded
  - For submodules: verify parent sync state

Before marking task complete:
  - Verify expected changes exist
  - Verify tests pass (if applicable)
  - For submodules: verify commit recorded
```
