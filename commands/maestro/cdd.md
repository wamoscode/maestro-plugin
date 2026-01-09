---
name: cdd
description: Activate Context-Driven Development mode - loads project context and enables structured track management
usage: /maestro:cdd
aliases: [context, cdd-mode]
---

# /maestro:cdd Command

Activate Context-Driven Development (CDD) mode for your current session. This command loads all project context and primes Claude to work with structured tracks, specifications, plans, and checkpoints.

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

When invoked, displays:

```markdown
## CDD Mode Activated

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

### CDD Principles Active

- All discussions will update relevant context
- Track structure: spec.md -> plan.md -> implementation
- Phase checkpoints before advancing
- Context files reflect current decisions
- **Sub-agents engaged for every task**

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

- `/maestro:setup` - Initialize project context
- `/maestro:newTrack` - Create new track
- `/maestro:status` - View current status
- `/maestro:implement` - Execute track implementation
- `/maestro:workspace` - Manage multi-project workspace

---

## CDD Activation Protocol

When this command is invoked, follow this protocol:

### Step 1: Context Detection

```
Check for maestro/ directory:
  If NOT exists:
    - Display "No Context Found" message
    - Offer to run /maestro:setup
    - Exit protocol

  If exists:
    - Proceed to Step 2
```

### Step 2: Load All Context

```
Read and parse the following files:

REQUIRED:
  - maestro/product.md → Extract product name, vision, goals
  - maestro/tech-stack.md → Extract technologies
  - maestro/workflow.md → Extract methodology, quality standards
  - maestro/tracks.md → Get track index

OPTIONAL (if they exist):
  - maestro/product-guidelines.md → Extract principles
  - maestro/code-styleguide.md → Note style guide presence
  - maestro/workspace.json → Check if workspace mode
  - maestro/setup_state.json → Check setup completion
```

### Step 3: Load Active Tracks

```
From tracks.md:
  1. Parse track list
  2. For each track with status != completed:
     - Read maestro/tracks/{track-id}/metadata.json
     - Read maestro/tracks/{track-id}/spec.md (brief summary)
     - Read maestro/tracks/{track-id}/plan.md (current phase/task)

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

### Step 5: Display CDD Mode Summary

```
Format and display:
  1. Project context summary
  2. Active tracks table (sorted by priority)
  3. Current focus (active task)
  4. CDD principles reminder
  5. Ready prompt
```

### Step 6: Set CDD Mode State

```
For the remainder of this session:
  1. After EVERY significant discussion:
     - Identify if context update needed
     - Update appropriate file
     - Confirm update to user

  2. Track-related work:
     - Reference active track
     - Follow workflow methodology
     - Maintain task/phase structure

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
