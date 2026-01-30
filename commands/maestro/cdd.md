---
name: cdd
description: Activate Context-Driven Development mode - loads project context and enables structured track management
usage: /maestro:cdd
aliases: [context, cdd-mode]
---

# /maestro:cdd Command

Activate Context-Driven Development (CDD) mode for your current session. This command loads all project context and primes Claude to work with structured tracks, specifications, plans, and checkpoints.

**NEW in v1.8: Multi-Branch Session Support**
- Automatically detects current git branch
- Acquires session lock (one session per branch)
- Loads branch-specific context and tracks
- Starts notification polling for cross-session alerts
- Supports parallel work on different branches

## CRITICAL: Mandatory Sub-Agent Usage in CDD Mode

**When CDD mode is active, ALL tasks MUST be processed through sub-agents via the Task tool.**

This is NOT optional. In CDD mode:

1. **EVERY task** - no matter how simple - routes to appropriate sub-agent(s)
2. **ALWAYS** use the Task tool with `subagent_type` parameter
3. **NEVER** process implementation tasks directly
4. **NEVER** ask if user wants sub-agents - they are mandatory in CDD

```
CDD MODE = AUTOMATIC SUB-AGENT ROUTING FOR ALL TASKS

User: "Add a button to the form"
Action: Task tool → subagent_type="frontend-developer"

User: "Fix the login bug"
Action: Task tool → subagent_type="backend-developer" (+ security-auditor if auth-related)

User: "Optimize this query"
Action: Task tool → subagent_type="sql-pro"
```

## Purpose

Use this command at the **start of any session** to ensure Claude:
- Knows you're working with CDD methodology
- Has loaded all relevant project context
- Will maintain and update context after discussions
- Follows the track-based development workflow

## Invocation

```bash
/maestro:cdd
```

## What CDD Mode Enables

### 1. Context Awareness
- Loads product definition, guidelines, and tech stack
- Reads active tracks and their current state
- Understands project workflows and code standards

### 2. Structured Track Management
- **Specs**: Detailed requirements with acceptance criteria
- **Plans**: Phased implementation with task breakdowns
- **Checkpoints**: Quality gates between phases
- **Progress Tracking**: Real-time status updates

### 3. Context Updates
After every significant discussion or agreement:
- Context files are updated to reflect decisions
- Track progress is synchronized
- New insights are captured in appropriate documents

### 4. Workflow Enforcement

- Follows selected methodology (TDD/Agile/Minimal)
- Respects code style guidelines
- Maintains product alignment

### 5. Sub-Agent Orchestration

Every task in CDD mode leverages specialized sub-agents:

- **Automatic Agent Selection**: Tasks are routed to the most qualified specialists
- **Team Collaboration**: Complex tasks engage multiple agents working together
- **Tech Stack Alignment**: Agents are matched to your project's technologies
- **Domain Expertise**: Each agent brings deep knowledge in their specialty

**Single Agent Tasks:**
- Simple, focused operations (e.g., fix a typo, add a comment)
- Domain-specific work (e.g., SQL optimization → sql-pro)

**Multi-Agent Teams:**
- Feature implementation (e.g., frontend-developer + backend-developer + qa-expert)
- Architecture work (e.g., software-architect + api-designer + security-auditor)
- Full-stack changes (e.g., fullstack-developer + typescript-pro + sql-pro)

**Agent Selection Criteria:**
1. Task domain (frontend, backend, devops, security, etc.)
2. Project tech stack (from tech-stack.md)
3. Workflow requirements (qa-expert for TDD)
4. Task complexity and scope

## Output

**MANDATORY: The Knowledge System section MUST ALWAYS be displayed when activating CDD mode.**

When invoked, displays:

```markdown
## CDD Mode Activated

### Session Info
- **Session ID**: [generated session ID]
- **Branch**: [current git branch]
- **Lock**: Acquired
- **Repository**: [Main repo or Worktree]

### 🧠 Knowledge System Status [REQUIRED - ALWAYS DISPLAY]
┌──────────────────────────────────────────────────────────┐
│ 🧠 KNOWLEDGE SYSTEM                                       │
├──────────────────────────────────────────────────────────┤
│ Status: Initialized ✓                                    │
│ Store: X entries (Y decisions, Z patterns, W other)     │
│ Recent Decisions:                                        │
│   • [Most recent decision title]                         │
│   • [Second most recent]                                 │
│ Learning: Journal active, Enrichment enabled             │
└──────────────────────────────────────────────────────────┘

Note: If no knowledge exists yet, display:
┌──────────────────────────────────────────────────────────┐
│ 🧠 KNOWLEDGE SYSTEM                                       │
├──────────────────────────────────────────────────────────┤
│ Status: Initialized ✓                                    │
│ Store: Empty (no knowledge captured yet)                 │
│ Learning: Journal active, ready to capture decisions     │
└──────────────────────────────────────────────────────────┘

### Project Context Loaded
- **Product**: [name from product.md]
- **Tech Stack**: [summary from tech-stack.md]
- **Workflow**: [methodology from workflow.md]
- **Guidelines**: [key principles]

### Active Tracks
| ID | Title | Status | Progress |
|----|-------|--------|----------|
| TRACK-001 | Feature name | active | 60% |

### Current Focus
[Most recent active task or phase]

### Other Active Sessions
[List of other branches with active CDD sessions, if any]

### Pending Notifications
[Any cross-session notifications]

### CDD Principles Active

- All discussions will update relevant context
- Track structure: spec.md -> plan.md -> implementation
- Phase checkpoints before advancing
- Context files reflect current decisions
- **Sub-agents engaged for every task**
- **🧠 Knowledge system captures decisions automatically**

### Available Specialists (based on tech stack)

| Domain | Primary Agents |
|--------|----------------|
| Frontend | frontend-developer, react-specialist |
| Backend | backend-developer, api-designer |
| Database | sql-pro, postgres-pro |
| Quality | qa-expert, test-automator |
| Security | security-auditor |

Ready for CDD workflow. What would you like to work on?
```

## CDD Workflow Reminder

When CDD mode is active, Claude follows this workflow:

### For New Features/Bugs
1. Create track with `/maestro:newTrack`
2. Define spec with requirements and acceptance criteria
3. Create phased plan with tasks
4. Implement following workflow methodology
5. Pass checkpoint validations

### For Ongoing Work
1. Check track status with `/maestro:status`
2. Continue implementation with `/maestro:implement`
3. Update context after decisions
4. Document blockers and resolutions

### For Discussions
1. Capture key decisions in relevant context files
2. Update specs if requirements change
3. Adjust plans if approach changes
4. Log progress and insights

## Context Update Protocol

After any significant discussion or agreement:

```
1. IDENTIFY what was decided:
   - New requirement? → Update spec.md
   - Technical approach? → Update plan.md or tech-stack.md
   - Guideline change? → Update product-guidelines.md
   - Implementation detail? → Update task in plan.md

2. UPDATE the appropriate file:
   - Read current content
   - Integrate new information
   - Preserve existing structure
   - Add timestamp/note if significant

3. CONFIRM the update:
   - Briefly mention what was updated
   - Ensure user visibility
```

## No Context Found

If no `maestro/` directory exists:

```markdown
## CDD Mode - No Context Found

No project context detected. To enable full CDD functionality:

1. Run `/maestro:setup` to initialize project context
2. Answer the interactive questions about your project
3. Run `/maestro:cdd` again

Would you like me to:
1. Initialize project context now? (runs /maestro:setup)
2. Work without context? (limited CDD features)
```

## Related Commands

### Core Commands
- `/maestro:setup` - Initialize project context
- `/maestro:newTrack` - Create new track
- `/maestro:status` - View current status
- `/maestro:implement` - Execute track implementation
- `/maestro:revert` - Rollback track changes

### Workspace Commands
- `/maestro:workspace` - Manage multi-project workspace
- `/maestro:projects` - Switch between projects

### New in v1.5
- `/maestro:dashboard` - Rich visual dashboard with progress bars
- `/maestro:impact` - Analyze change impact and blast radius
- `/maestro:stash` - Pause/resume tracks without reverting
- `/maestro:quick` - Fast shortcuts for common actions

### New in v1.8: Multi-Branch Sessions
- `/maestro:branch` - Manage CDD context across git branches
- `/maestro:session` - Manage sessions, locks, and notifications

## New Features (v1.5)

### Context Versioning
- Automatic snapshots of context files
- Version history and comparison
- Semantic conflict detection with active tracks
- Rollback to previous context states

### Track Hierarchy & Relationships
- Epic → Story → Task hierarchy
- Track relationships: blockedBy, blocks, relatesTo
- Duplicate detection and linking

### Quality Gates
- Automated checkpoint execution
- Configurable quality criteria
- CI/CD integration hooks
- Per-track quality metrics

### Agent Performance Tracking
- Task completion metrics per agent
- Effectiveness scoring
- Intelligent agent selection based on history
- Team composition effectiveness

### Impact Analysis
- Blast radius visualization
- Dependency graph analysis
- Risk assessment and scoring
- Testing strategy recommendations

### Track Archetypes
Pre-defined templates for common track types:
- `api-endpoint` - REST/GraphQL API implementation
- `auth-feature` - Authentication/authorization
- `database-migration` - Schema changes
- `integration` - Third-party integrations
- `performance-optimization` - Performance improvements

### Knowledge Capture
- Automatic ADR generation
- Pattern library from completed tracks
- Track retrospective prompts
- Decision history tracking

### Custom Workflows
- YAML-based workflow DSL
- Conditional phases
- Custom quality gates
- Agent team compositions

## New Features (v1.8)

### Multi-Branch Parallel Sessions
Multiple Claude Code sessions can work simultaneously on different branches:
- **Branch Isolation**: Each branch maintains its own tracks and context
- **Session Locking**: One session per branch, prevents conflicts
- **Cross-Session Notifications**: Get alerted when other sessions need input
- **Context Persistence**: Session state survives branch switches

### NEW in v1.9: Git Worktree Isolation (RECOMMENDED)

For **true physical isolation**, use Git worktrees instead of branch switching:

```bash
# Create isolated worktree for a branch
/maestro:worktree create feature/auth

# Each worktree is a separate directory:
~/project/                    → main branch
~/project-feature-auth/       → feature/auth branch (isolated)
~/project-hotfix-login/       → hotfix/login branch (isolated)
```

**Why Worktrees?**
- Regular `git checkout` affects ALL terminal sessions
- Worktrees create separate directories - true isolation
- No session locking needed (physically separate)
- Each terminal works in its own directory

CDD mode automatically detects and recommends worktrees when parallel work is detected.

### Branch-Aware Context Structure
When `maestro/` is gitignored (recommended for multi-branch):

```
maestro/
├── shared/                    # Shared across all branches (read-only)
│   ├── product.md
│   ├── tech-stack.md
│   └── workflow.md
├── branches/                  # Branch-specific context
│   ├── main/
│   │   ├── context.json
│   │   ├── tracks/
│   │   └── active-session.lock
│   └── feature--auth/
│       └── ...
├── sessions/                  # Session registry
│   └── registry.json
└── notifications/             # Cross-session notifications
    ├── pending/
    └── archive/
```

### Session Lock Behavior
- Lock acquired on CDD activation
- Heartbeat every 30 seconds
- Stale after 5 minutes without heartbeat
- Other sessions blocked with clear warning

### Notification System
Sessions can notify each other about:
- Input required (checkpoint approval)
- Errors encountered
- Track completion
- Custom messages

---

## CDD Activation Protocol

When this command is invoked, follow this protocol:

### Step 0: Worktree Detection and Branch Setup (NEW in v1.9)

```
0. DETECT WORKTREE STATUS:
   - Check if .git is file (worktree) or directory (main repo)
   - Import WorktreeManager from skills/worktree-manager.js
   - Call WorktreeManager.detectWorktree()

   If IN WORKTREE:
     * Note: "Working in isolated worktree"
     * Get main repo path for reference
     * Branch is already isolated - no conflicts possible
     * SKIP session lock (worktrees are physically isolated)
     * Proceed to Step 1

   If IN MAIN REPO:
     * Check for other active sessions on other branches
     * If other sessions exist AND user is on non-main branch:
       - RECOMMEND worktree for isolation:
         "⚠️  Other active sessions detected. For true isolation:
          /maestro:worktree create {current-branch}
          This prevents branch switches from affecting other terminals."
     * Continue with standard locking

1. DETECT current git branch:
   - Run: git branch --show-current
   - Fallback: git rev-parse --abbrev-ref HEAD
   - Handle detached HEAD: prefix with "detached-"

2. CHECK for existing session lock on this branch:
   - Read: maestro/branches/{branch}/active-session.lock
   - If lock exists AND not stale (heartbeat < 5 min):
     * BLOCK with warning message
     * Show lock holder info
     * RECOMMEND WORKTREE (NEW):
       "For true isolation, create a worktree instead:
        /maestro:worktree create {branch}"
     * Suggest alternatives:
       - Create worktree (RECOMMENDED)
       - Switch to different branch
       - Release stale lock
       - View session details
     * EXIT protocol

3. ACQUIRE session lock:
   - Generate session ID
   - Create lock file with:
     * sessionId, pid, startedAt
     * user, host, terminal
     * lastHeartbeat timestamp
     * isWorktree: false (flag for worktree context)
   - Update session registry

4. START heartbeat timer:
   - Update lastHeartbeat every 30 seconds
   - Detect session termination

5. START notification polling:
   - Poll maestro/notifications/pending/ every 10 seconds
   - Display banner for high-priority notifications
   - Trigger OS notification if enabled
```

### Step 1: Context Detection

```
Check for maestro/ directory:
  If NOT exists:
    - Display "No Context Found" message
    - Offer to run /maestro:setup
    - Exit protocol

  If exists:
    - Detect context structure (legacy vs branch-aware)
    - If legacy and multi-branch desired:
      * Suggest running /maestro:branch migrate
    - Proceed to Step 2
```

### Step 2: Load All Context

```
DETECT context structure first:
  - If maestro/shared/ exists → branch-aware mode
  - If maestro/product.md exists → legacy mode

BRANCH-AWARE MODE (v1.8+):
  Shared context (read-only):
    - maestro/shared/product.md → Extract product name, vision, goals
    - maestro/shared/tech-stack.md → Extract technologies
    - maestro/shared/workflow.md → Extract methodology, quality standards
    - maestro/shared/product-guidelines.md → Extract principles
    - maestro/shared/code-styleguide.md → Note style guide presence

  Branch-specific context:
    - maestro/branches/{branch}/context.json → Branch state
    - maestro/branches/{branch}/tracks.md → Branch track index

LEGACY MODE:
  - maestro/product.md → Extract product name, vision, goals
  - maestro/tech-stack.md → Extract technologies
  - maestro/workflow.md → Extract methodology, quality standards
  - maestro/tracks.md → Get track index

OPTIONAL (both modes):
  - maestro/workspace.json → Check if workspace mode
  - maestro/setup_state.json → Check setup completion
```

### Step 3: Load Active Tracks

```
BRANCH-AWARE MODE:
  From maestro/branches/{branch}/tracks.md:
    1. Parse track list
    2. For each track with status != completed:
       - Read maestro/branches/{branch}/tracks/{track-id}/metadata.json
       - Read maestro/branches/{branch}/tracks/{track-id}/spec.md
       - Read maestro/branches/{branch}/tracks/{track-id}/plan.md
    3. Identify most recent active track
    4. Update branch context with active track

LEGACY MODE:
  From maestro/tracks.md:
    1. Parse track list
    2. For each track with status != completed:
       - Read maestro/tracks/{track-id}/metadata.json
       - Read maestro/tracks/{track-id}/spec.md
       - Read maestro/tracks/{track-id}/plan.md
    3. Identify most recent active track
    4. Identify current task in progress
```

### Step 4: Workspace Check (Multi-Project)

```
If maestro/workspace.json exists:
  - Load workspace configuration
  - List projects in workspace
  - Check for cross-project tracks
  - Note submodule status if applicable
```

### Step 4.5: Knowledge System Initialization (v1.10.1+)

```
Initialize the context-aware learning system BEFORE display:

1. LOAD Knowledge Store:
   - Ensure maestro/knowledge/ directory exists
   - Load or build knowledge index for branch
   - Initialize KnowledgeStore with branch context
   - Count entries by type

2. INITIALIZE Learning Journal:
   - Start new journal session with sessionId
   - Link to current branch and track
   - Enable real-time capture

3. START Context Enrichment:
   - Initialize ContextEnrichment engine
   - Connect to KnowledgeRecall for task enrichment
   - Enable decision capture triggers
   - Enable phase completion hooks

4. CONFIGURE Feedback Loop:
   - Track which knowledge is injected into tasks
   - Prepare to record outcomes after task completion
   - Enable success/failure tracking for used knowledge

5. PREPARE Knowledge Summary for display:
   - Get total entries count
   - Get breakdown by type (decisions, patterns, other)
   - Get 2-3 most recent decisions
   - Determine learning status (active/inactive)

Note: If knowledge directory doesn't exist or is empty,
display "No knowledge captured yet" instead of stats.
```

### Step 5: Display CDD Mode Summary

```
Format and display IN THIS ORDER:

  1. Session info:
     - Session ID
     - Current branch
     - Lock status
     - Repository type (main repo or worktree)

  2. 🧠 KNOWLEDGE SYSTEM STATUS [MANDATORY - MUST DISPLAY]:
     ┌──────────────────────────────────────────────────────────┐
     │ 🧠 KNOWLEDGE SYSTEM                                       │
     ├──────────────────────────────────────────────────────────┤
     │ Status: Initialized ✓                                    │
     │ Store: X entries (Y decisions, Z patterns, W other)     │
     │ Recent Decisions: [list 2-3]                             │
     │ Learning: Journal active, Enrichment enabled             │
     └──────────────────────────────────────────────────────────┘

     THIS SECTION IS REQUIRED. If knowledge store is empty, show:
     "Store: Empty (no knowledge captured yet)"

  3. Project context summary

  4. Active tracks table (sorted by priority)

  5. Current focus (active task)

  6. Other active sessions:
     - List other branches with active sessions
     - Show pending notifications

  7. CDD principles reminder (include "🧠 Knowledge system captures decisions")

  8. Available specialists

  9. Ready prompt
```

**Example Output with Multi-Branch Info:**

```markdown
## CDD Mode Activated

### Session Info
- **Session ID**: session-abc123
- **Branch**: main
- **Lock**: Acquired
- **Repository**: Main repo (not worktree)

### 🧠 Knowledge System [ALWAYS DISPLAY THIS SECTION]
┌──────────────────────────────────────────────────────────┐
│ 🧠 KNOWLEDGE SYSTEM                                       │
├──────────────────────────────────────────────────────────┤
│ Status: Initialized ✓                                    │
│ Store: 47 entries (12 decisions, 8 patterns, 27 other)  │
│ Recent Decisions:                                        │
│   • Use JWT for authentication                           │
│   • Prefer functional components                         │
│ Learning: Journal active, Enrichment enabled             │
└──────────────────────────────────────────────────────────┘

### Project Context Loaded
- **Product**: My Application
- **Tech Stack**: React, Node.js, PostgreSQL
- **Workflow**: TDD (Test-Driven Development)

### Active Tracks (branch: main)
| ID | Title | Status | Progress |
|----|-------|--------|----------|
| TRACK-001 | User Auth | active | 60% |

### Other Active Sessions
| Branch | Session | Track | Last Activity |
|--------|---------|-------|---------------|
| feature/auth | session-def456 | TRACK-002 | 5 min ago |

### Pending Notifications (1)
🔔 Session on 'feature/auth' requires input
   "Approve Phase 2 checkpoint for TRACK-002"

### CDD Principles Active
- All discussions will update relevant context
- Track structure: spec.md -> plan.md -> implementation
- Phase checkpoints before advancing
- **🧠 Knowledge system captures decisions automatically**

Ready for CDD workflow. What would you like to work on?
```

### Step 6: Set CDD Mode State

```
For the remainder of this session:
  1. After EVERY significant discussion:
     - Identify if context update needed
     - Update appropriate file (branch-specific in v1.8)
     - Confirm update to user

  2. Track-related work:
     - Reference active track
     - Follow workflow methodology
     - Maintain task/phase structure
     - Tracks are branch-specific (v1.8)

  3. Code generation:
     - Follow code-styleguide.md
     - Align with tech-stack.md
     - Respect product-guidelines.md

  4. Decision tracking:
     - Capture in relevant context file
     - Link to track if applicable
     - Timestamp significant changes

  5. Sub-agent orchestration (MANDATORY):
     - EVERY task must route to appropriate sub-agents
     - Select agents based on task analysis
     - Use teams for complex/multi-domain tasks
     - Leverage tech stack for specialist selection

  6. Session management (NEW in v1.8):
     - Maintain heartbeat (every 30s)
     - Poll for notifications (every 10s)
     - Fire notification when user input needed
     - Release lock on session end
```

### Step 6.5: Notification Triggers (v1.8+)

```
Fire notification to other sessions when:
  1. INPUT_REQUIRED:
     - Checkpoint approval needed
     - User decision required
     - Blocker encountered

  2. ERROR:
     - Unrecoverable error during implementation
     - Track execution failed

  3. TRACK_COMPLETED:
     - Track reaches 100% completion

  4. BLOCKED:
     - Track encounters external blocker

Notification delivery:
  - Write to maestro/notifications/pending/
  - Include: sessionId, branch, type, priority, message, action
  - OS notification for high priority (if enabled)
```

### Step 7: Sub-Agent Routing Protocol

```
For EVERY task in CDD mode:

1. ANALYZE the task:
   - Identify domains: frontend, backend, devops, security, data, etc.
   - Identify actions: create, modify, review, optimize, test, etc.
   - Assess complexity: simple, moderate, complex, very_complex

2. SELECT appropriate agents:

   Simple tasks (single domain):
     - Route to ONE specialist agent
     - Examples:
       * "Fix CSS bug" → frontend-developer
       * "Optimize query" → sql-pro
       * "Add API endpoint" → backend-developer

   Moderate tasks (single domain, multiple concerns):
     - Route to PRIMARY + SECONDARY agents
     - Examples:
       * "Add authenticated endpoint" → backend-developer + security-auditor
       * "Create React component with tests" → frontend-developer + qa-expert

   Complex tasks (multi-domain):
     - Assemble AGENT TEAM
     - Examples:
       * "Build user management feature" →
         api-designer + backend-developer + frontend-developer + qa-expert
       * "Set up CI/CD pipeline" →
         devops-engineer + security-auditor + deployment-engineer

   Very complex tasks (architecture-level):
     - Full specialist team with architect lead
     - Examples:
       * "Design microservices architecture" →
         software-architect + microservices-architect + api-designer +
         devops-engineer + security-auditor

3. MATCH to tech stack:
   - Read tech-stack.md for project technologies
   - Add language specialists:
     * TypeScript project → typescript-pro
     * Python/Django → python-pro, django-developer
     * React frontend → react-specialist
     * PostgreSQL → postgres-pro
   - Add framework specialists as needed

4. APPLY workflow requirements:
   - TDD workflow → ALWAYS include qa-expert
   - Security-sensitive → ALWAYS include security-auditor
   - Database changes → ALWAYS include sql-pro or database specialist

5. EXECUTE with coordination:
   - Independent tasks → parallel execution
   - Dependent tasks → sequential execution
   - Synthesize results from all agents
   - Resolve conflicts between agent outputs
```

### Sub-Agent Team Examples

```
Feature: "Add payment processing"
Team:
  - api-designer (design endpoints)
  - backend-developer (implement logic)
  - security-auditor (review security)
  - sql-pro (database schema)
  - qa-expert (test coverage)
  - frontend-developer (payment UI)

Feature: "Optimize application performance"
Team:
  - performance-engineer (profiling, bottlenecks)
  - sql-pro (query optimization)
  - frontend-developer (bundle optimization)
  - devops-engineer (infrastructure tuning)

Feature: "Security audit and hardening"
Team:
  - security-auditor (vulnerability assessment)
  - penetration-tester (attack simulation)
  - backend-developer (fix implementation)
  - devops-engineer (infrastructure security)

Bug: "Fix authentication issue"
Team:
  - backend-developer (debug and fix)
  - security-auditor (verify fix is secure)
  - qa-expert (regression tests)
```

### Context Update Triggers

Update context when user:
- Makes a decision about requirements → spec.md
- Chooses a technical approach → plan.md, tech-stack.md
- Defines a new guideline → product-guidelines.md
- Clarifies product vision → product.md
- Completes a task → plan.md (mark complete)
- Encounters a blocker → plan.md (add note)
- Changes scope → spec.md, plan.md

### Validation

Before marking CDD mode as active:
- Ensure all required context files are readable
- Verify track structure is valid
- Confirm workflow type is recognized
- Check for any setup_state indicating incomplete setup

If validation fails:
- Report specific issues
- Suggest remediation
- Offer to fix or reinitialize

---

## MANDATORY EXECUTION DIRECTIVE FOR CDD MODE

**Once CDD mode is activated, EVERY subsequent task MUST use the Task tool with sub-agents.**

### Automatic Routing Rules

When user requests ANY task in CDD mode:

```text
1. ANALYZE the request
2. SELECT appropriate sub-agent(s) based on:
   - Task domain (frontend, backend, database, etc.)
   - Project tech stack (from tech-stack.md)
   - Workflow requirements (qa-expert for TDD)
3. INVOKE Task tool immediately
4. RETURN synthesized results
```

### Task Tool Pattern

```javascript
// For EVERY task in CDD mode
Task({
  subagent_type: "<domain-specialist>",
  prompt: "<task description with project context>",
  description: "<brief summary>"
})
```

### Quick Reference: Task → Agent Mapping

| User Says | Route To |
|-----------|----------|
| "Add/create/build [UI element]" | frontend-developer |
| "Add/create [API/endpoint]" | backend-developer, api-designer |
| "Fix [bug]" | relevant domain specialist |
| "Optimize [query/database]" | sql-pro |
| "Review [security/code]" | security-auditor, qa-expert |
| "Test [feature]" | qa-expert |
| "Deploy/setup [infra]" | devops-engineer |
| "Design [architecture]" | software-architect |

### CDD Mode Guarantees

When CDD is active, the user should NEVER need to say:
- "use sub-agents"
- "with appropriate specialists"
- "route this to..."

Sub-agent routing is AUTOMATIC and MANDATORY.

### DO NOT in CDD Mode

- Process tasks without Task tool invocation
- Ask "should I use sub-agents?"
- Skip routing for any task type
- Implement directly without specialist consultation

### ALWAYS in CDD Mode

- Route every task through Task tool
- Select agents based on task + tech stack
- Use multiple agents for complex tasks
- Include qa-expert for TDD workflow
- Include security-auditor for auth-related work
