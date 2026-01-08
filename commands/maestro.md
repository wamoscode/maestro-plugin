---
name: maestro
description: Orchestrate a complex task by analyzing requirements and routing to appropriate sub-agents
usage: /maestro [task description]
aliases: [orchestrate, delegate, conduct]
---

# /maestro Command

Analyze a task and orchestrate execution across specialized sub-agents. When project context exists (via `/maestro:setup`), leverages product definition, tech stack, and workflow for informed orchestration.

## Invocation

```bash
/maestro <task description>
```

## Examples

```bash
/maestro Build a REST API for user management with authentication
/maestro Review this codebase for security vulnerabilities
/maestro Create a CI/CD pipeline for our Node.js application
/maestro Optimize database queries in the payments module
```

## Behavior

When invoked, Maestro will:

### 1. Check Project Context

If `maestro/` directory exists:
- Load `product.md` for product understanding
- Load `tech-stack.md` for technology context
- Load `workflow.md` for methodology preferences
- Check for active tracks in `tracks.md`

### 2. Analyze the Task

- Parse the task description
- Identify required domains and skills
- Detect keywords and context
- Cross-reference with project tech stack

### 3. Track Integration

If the task is complex (multi-step), Maestro will suggest:

```
This looks like a complex task. Would you like to:
1. Execute directly (quick, no tracking)
2. Create a track for structured implementation (/maestro:newTrack)

Choice (1/2):
```

If an active track exists and task relates to it:

```
Active Track: TRACK-002 (User Authentication)
Current Task: 2.3 - Implement JWT middleware

This request appears related. Would you like to:
1. Continue with track implementation (/maestro:implement)
2. Execute as standalone task

Choice (1/2):
```

### 4. Select Sub-Agents

- Match task to appropriate specialists
- Consider project tech stack for language specialists
- Determine if parallel or sequential execution
- Consider dependencies between sub-tasks

### 5. Execute

- Invoke selected sub-agents
- Follow workflow methodology if context exists
- Monitor progress and handle errors
- Coordinate between agents if needed

### 6. Synthesize Results

- Aggregate outputs from all agents
- Resolve any conflicts
- Present unified response
- Suggest follow-up actions

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--parallel` | Force parallel execution | auto |
| `--sequential` | Force sequential execution | auto |
| `--agents` | Specify agents to use | auto-detect |
| `--dry-run` | Show plan without executing | false |
| `--verbose` | Show detailed progress | false |
| `--no-context` | Ignore project context | false |
| `--track` | Create track for this task | false |

## Examples with Options

```bash
# Preview what agents would be used
/maestro --dry-run Implement user authentication

# Specify exact agents
/maestro --agents=backend-developer,security-auditor Add password reset feature

# Parallel execution with verbose output
/maestro --parallel --verbose Build frontend and backend for new feature

# Create a track for structured implementation
/maestro --track Add payment processing system

# Execute without using project context
/maestro --no-context Quick prototype for demo
```

## Agent Selection Logic

Maestro uses keyword matching and context analysis:

| Keywords | Primary Agents | Secondary Agents |
|----------|----------------|------------------|
| API, REST, endpoint | api-designer, backend-developer | graphql-architect |
| React, Vue, frontend | frontend-developer | react-specialist, vue-expert |
| Database, SQL, query | sql-pro, database-administrator | postgres-pro |
| Security, auth, JWT | security-auditor | penetration-tester, backend-developer |
| Test, QA, coverage | qa-expert, test-automator | debugger |
| Deploy, CI/CD, Docker | devops-engineer | kubernetes-specialist, deployment-engineer |
| Performance, optimize | performance-engineer | database-optimizer, sre-engineer |
| Mobile, iOS, Android | mobile-developer | swift-expert, kotlin-specialist |
| ML, AI, model | ml-engineer, ai-engineer | data-scientist |
| Docs, documentation | documentation-engineer | technical-writer |

### Tech Stack Routing

When project context exists, agents are selected based on `tech-stack.md`:

| Tech Stack Contains | Additional Agents |
|---------------------|-------------------|
| TypeScript | typescript-pro |
| Python, Django | python-pro, django-developer |
| Go | golang-pro |
| Rust | rust-engineer |
| React | react-specialist |
| Vue | vue-expert |
| Next.js | nextjs-developer |
| PostgreSQL | postgres-pro |
| Kubernetes | kubernetes-specialist |

## Output Format

```markdown
## Maestro Execution Report

### Context
- **Project**: [from product.md or "No project context"]
- **Tech Stack**: [from tech-stack.md or "Auto-detected"]
- **Active Track**: [if any]

### Task Analysis
- **Request**: [original task]
- **Domains Identified**: [list]
- **Strategy**: [parallel/sequential/hybrid]

### Sub-Agent Assignments
| Agent | Task | Status | Duration |
|-------|------|--------|----------|
| api-designer | Design endpoints | Complete | 2m |
| backend-developer | Implement routes | Complete | 5m |
| qa-expert | Write tests | Complete | 3m |

### Synthesized Results
[Combined output from all agents]

### Recommendations
- [Follow-up suggestions]
- Consider creating a track for related work: /maestro:newTrack
```

## Context-Aware Features

When `maestro/` directory exists:

1. **Informed Agent Selection**: Uses tech stack to pick language specialists
2. **Workflow Compliance**: Follows TDD/Agile/Minimal methodology
3. **Style Guide Enforcement**: Applies project code standards
4. **Track Suggestions**: Recommends tracking for complex tasks
5. **Continuation Support**: Detects related active tracks

## Related Commands

- `/maestro:setup` - Initialize project context
- `/maestro:newTrack` - Create tracked feature/bug
- `/maestro:implement` - Execute track with full tracking
- `/maestro:status` - View project and track status
- `/list-subagents` - Browse available agents
- `/agent-info` - Get details on specific agent

---

## Orchestration Protocol

When this command is invoked, follow this protocol:

### Step 1: Context Check

```
Check for maestro/ directory:
  If exists:
    - Read maestro/product.md
    - Read maestro/tech-stack.md
    - Read maestro/workflow.md
    - Read maestro/tracks.md for active tracks
    - Set context_available = true
  Else:
    - Set context_available = false
    - Proceed with standalone orchestration
```

### Step 2: Task Analysis

```
1. Parse task description for:
   - Action verbs (build, fix, review, optimize, etc.)
   - Domain keywords (API, frontend, database, etc.)
   - Technology mentions (React, Python, PostgreSQL, etc.)

2. If context_available:
   - Cross-reference with tech-stack.md
   - Check if task relates to product goals
   - Identify if task fits active track
```

### Step 3: Complexity Assessment

```
Assess task complexity:
  - Single domain, quick task → Execute directly
  - Multi-domain, significant work → Suggest track creation
  - Related to active track → Suggest continuation

If --track flag or complex task:
  - Recommend /maestro:newTrack
  - Offer to create track automatically
```

### Step 4: Agent Selection

```
1. Map keywords to primary agents
2. If context_available:
   - Add language specialists from tech stack
   - Include workflow-required agents (qa-expert for TDD)
3. If --agents specified:
   - Use only specified agents
4. Determine execution strategy:
   - Independent tasks → parallel
   - Dependent tasks → sequential
   - Mixed → hybrid
```

### Step 5: Execute

```
For each agent assignment:
  1. Prepare context (task, tech stack, style guide)
  2. Invoke sub-agent
  3. If workflow.md exists:
     - Follow methodology (tests first for TDD, etc.)
  4. Capture output
  5. Handle errors with retry or fallback
```

### Step 6: Synthesize

```
1. Aggregate all agent outputs
2. Resolve conflicts (if any)
3. Generate unified response
4. Suggest follow-up actions:
   - Related tasks to consider
   - Track creation if warranted
   - Documentation updates
```
