---
name: workflow
description: Create and execute multi-step workflows with defined agent sequences
usage: /workflow <workflow-definition>
aliases: [flow, pipeline]
---

# /workflow Command

Define and execute complex multi-step workflows with ordered agent execution, dependencies, and gates.

## Invocation

```
/workflow <workflow-name>
/workflow --define <workflow-definition>
/workflow --run <saved-workflow>
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

## YAML Workflow Definition

```yaml
# feature-development.yaml
name: feature-development
description: Complete feature implementation workflow

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

## Workflow Management

```bash
# Save a workflow
/workflow --save my-workflow.yaml

# List saved workflows
/workflow --list

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

## Output Format

```markdown
## Workflow Execution: feature-development

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
```

## Related Commands

- `/conduct` - Simple task orchestration
- `/parallel-execute` - Parallel execution
- `/list-subagents` - View available agents
