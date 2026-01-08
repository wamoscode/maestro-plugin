---
name: workflow
description: Create and execute multi-step workflows with defined agent sequences
usage: /workflow <workflow-definition>
aliases: [flow, pipeline]
---

# /workflow Command

Define and execute complex multi-step workflows with ordered agent execution, dependencies, and gates. Integrates with track system for structured project management.

## Invocation

```bash
/workflow <workflow-name>
/workflow --define <workflow-definition>
/workflow --run <saved-workflow>
/workflow --from-track <track-id>
```

## Quick Workflow Syntax

```bash
# Sequential workflow (-> means "then")
/workflow backend-developer -> qa-expert -> devops-engineer

# Parallel groups (| means "parallel")
/workflow [frontend-developer | backend-developer] -> qa-expert

# Named tasks
/workflow backend-developer:"Build API" -> security-auditor:"Audit" -> devops-engineer:"Deploy"
```

## Track Integration

### Create Workflow from Track

Generate a workflow from an existing track's plan:

```bash
/workflow --from-track TRACK-002
```

This reads `maestro/tracks/TRACK-002/plan.md` and creates an executable workflow.

### Save Workflow as Track

Convert a workflow definition into a tracked feature:

```bash
/workflow --to-track "User Authentication" \
  backend-developer:"Build API" -> \
  security-auditor:"Security review" -> \
  qa-expert:"Test"
```

Creates a new track with spec and plan generated from the workflow.

### Execute Track Workflow

Run a track's plan as a workflow:

```bash
/workflow --run-track TRACK-002
```

Equivalent to `/maestro:implement TRACK-002` but with workflow visualization.

## YAML Workflow Definition

```yaml
# feature-development.yaml
name: feature-development
description: Complete feature implementation workflow
track: TRACK-002  # Optional: link to existing track

steps:
  - name: requirements
    agent: product-manager
    task: "Define requirements for {feature_name}"
    outputs: [requirements.md]

  - name: design
    agent: api-designer
    task: "Design API for requirements"
    depends_on: [requirements]
    outputs: [api-spec.yaml]

  - name: implementation
    parallel: true
    steps:
      - agent: backend-developer
        task: "Implement backend based on API spec"
        depends_on: [design]
      - agent: frontend-developer
        task: "Build UI components"
        depends_on: [design]

  - name: testing
    agent: qa-expert
    task: "Create and run tests"
    depends_on: [implementation]
    gate:
      condition: coverage > 80%
      on_fail: block

  - name: security-review
    agent: security-auditor
    task: "Perform security audit"
    depends_on: [implementation]

  - name: deploy
    agent: devops-engineer
    task: "Deploy to staging"
    depends_on: [testing, security-review]
    gate:
      condition: all_tests_pass AND security_approved
```

## Examples

### Quick Feature Implementation

```bash
/workflow \
  product-manager:"Define user story" -> \
  [backend-developer:"Build API" | frontend-developer:"Build UI"] -> \
  qa-expert:"Test feature" -> \
  devops-engineer:"Deploy"
```

### Security-First Development

```bash
/workflow \
  security-auditor:"Threat model" -> \
  backend-developer:"Implement with security" -> \
  [penetration-tester:"Security test" | qa-expert:"Functional test"] -> \
  security-auditor:"Final review"
```

### Research to Implementation

```bash
/workflow \
  research-analyst:"Research best practices" -> \
  architect-reviewer:"Design solution" -> \
  backend-developer:"Implement" -> \
  documentation-engineer:"Document"
```

### From Existing Track

```bash
# Run workflow from track plan
/workflow --from-track TRACK-002

# Output:
# Loading workflow from TRACK-002: User Authentication
# Phase 1: Database Setup (3 tasks)
# Phase 2: Backend Auth (5 tasks)
# Phase 3: Frontend Integration (4 tasks)
# Phase 4: Testing & Security (3 tasks)
# Total: 15 tasks across 4 phases
# Execute? (Y/n)
```

## Workflow Management

```bash
# Save a workflow
/workflow --save my-workflow.yaml

# Save workflow to project templates
/workflow --save --project feature-workflow.yaml

# List saved workflows
/workflow --list

# List project workflows (in maestro/workflows/)
/workflow --list --project

# Run a saved workflow
/workflow --run my-workflow

# Delete a workflow
/workflow --delete my-workflow
```

## Options

| Option | Description |
|--------|-------------|
| `--define` | Define workflow inline |
| `--run` | Execute saved workflow |
| `--save` | Save workflow definition |
| `--list` | List saved workflows |
| `--dry-run` | Show execution plan |
| `--vars` | Pass variables to workflow |
| `--checkpoint` | Save progress for resume |
| `--resume` | Resume from checkpoint |
| `--from-track` | Generate workflow from track plan |
| `--to-track` | Save workflow as new track |
| `--run-track` | Execute track as workflow |
| `--project` | Use project workflows directory |

## Output Format

```markdown
## Workflow Execution: feature-development

### Context
- **Project**: My Application
- **Track**: TRACK-002 (linked)
- **Workflow**: TDD methodology

### Progress
[████████████░░░░░░░░] 60% - Step 3/5

### Steps
| Step | Agent | Status | Duration |
|------|-------|--------|----------|
| requirements | product-manager | ✓ Complete | 2m 15s |
| design | api-designer | ✓ Complete | 4m 30s |
| implementation | parallel | ⏳ Running | 3m... |
| testing | qa-expert | ○ Pending | - |
| deploy | devops-engineer | ○ Pending | - |

### Current Step: implementation
- backend-developer: Building API endpoints... (75%)
- frontend-developer: Creating components... (60%)

### Outputs
- requirements.md: Created
- api-spec.yaml: Created

### Track Updates
- TRACK-002 progress: 60%
- Tasks completed: 8/15
```

## Error Handling

```yaml
error_handling:
  on_failure:
    - notify: true
    - retry: 3
    - fallback: skip  # or 'abort', 'manual'

  recovery:
    checkpoint: true
    resume_from: last_successful

track_sync:
  update_on_complete: true
  record_commits: true
```

## Project Workflow Storage

When using `--project` flag, workflows are stored in:

```
maestro/
└── workflows/
    ├── feature-development.yaml
    ├── bug-fix.yaml
    └── deployment.yaml
```

## Related Commands

- `/maestro` - Quick task orchestration
- `/maestro:newTrack` - Create tracked feature
- `/maestro:implement` - Execute track plan
- `/maestro:status` - View progress
- `/parallel-execute` - Parallel execution only
- `/list-subagents` - View available agents

---

## Workflow Protocol

When this command is invoked, follow this protocol:

### Step 1: Parse Input

```
Determine mode:
  - Quick syntax (agent -> agent)
  - YAML file reference
  - --from-track flag
  - --run saved workflow
  - --to-track conversion
```

### Step 2: Check Project Context

```
If maestro/ directory exists:
  - Load tech-stack.md for agent selection
  - Load workflow.md for methodology
  - Check for linked track

If --from-track specified:
  - Load track plan.md
  - Convert phases/tasks to workflow steps
  - Maintain agent assignments
```

### Step 3: Build Workflow Graph

```
1. Parse steps and dependencies
2. Identify parallel groups
3. Validate all referenced agents exist
4. Check for circular dependencies
5. Calculate execution order
```

### Step 4: Execute (or Dry Run)

```
If --dry-run:
  - Display execution plan
  - Show agent assignments
  - Exit

For each step (in dependency order):
  1. Check dependencies complete
  2. If parallel: launch all parallel agents
  3. If sequential: execute one at a time
  4. Apply gates/conditions
  5. Capture outputs
  6. Update progress display
```

### Step 5: Track Sync (if linked)

```
If track linked:
  1. Update task statuses in plan.md
  2. Record commit SHAs
  3. Update metadata.json progress
  4. Sync with tracks.md
```

### Step 6: Completion

```
1. Display final summary
2. List all outputs created
3. If track linked: show track status
4. Suggest next actions
```

### --to-track Conversion

```
1. Parse workflow definition
2. Generate track ID
3. Create spec.md from workflow description
4. Create plan.md:
   - Convert steps to phases
   - Convert tasks with agent assignments
   - Maintain dependencies
5. Create metadata.json
6. Register in tracks.md
```
