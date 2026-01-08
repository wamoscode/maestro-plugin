---
name: maestro
description: Orchestrate a complex task by analyzing requirements and routing to appropriate sub-agents
usage: /maestro [task description]
aliases: [orchestrate, delegate, conduct]
---

# /maestro Command

Analyze a task and orchestrate execution across specialized sub-agents.

## Invocation

```
/maestro <task description>
```

## Examples

```
/maestro Build a REST API for user management with authentication
/maestro Review this codebase for security vulnerabilities
/maestro Create a CI/CD pipeline for our Node.js application
/maestro Optimize database queries in the payments module
```

## Behavior

When invoked, Maestro will:

1. **Analyze the Task**
   - Parse the task description
   - Identify required domains and skills
   - Detect keywords and context

2. **Select Sub-Agents**
   - Match task to appropriate specialists
   - Determine if parallel or sequential execution
   - Consider dependencies between sub-tasks

3. **Execute**
   - Invoke selected sub-agents
   - Monitor progress and handle errors
   - Coordinate between agents if needed

4. **Synthesize Results**
   - Aggregate outputs from all agents
   - Resolve any conflicts
   - Present unified response

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--parallel` | Force parallel execution | auto |
| `--sequential` | Force sequential execution | auto |
| `--agents` | Specify agents to use | auto-detect |
| `--dry-run` | Show plan without executing | false |
| `--verbose` | Show detailed progress | false |

## Examples with Options

```
/maestro --dry-run Implement user authentication
/maestro --agents=backend-developer,security-auditor Add password reset feature
/maestro --parallel --verbose Build frontend and backend for new feature
```

## Agent Selection Logic

Maestro uses keyword matching and context analysis:

| Keywords | Primary Agents |
|----------|---------------|
| API, REST, endpoint | api-designer, backend-developer |
| React, Vue, frontend | frontend-developer, react-specialist, vue-expert |
| Database, SQL, query | sql-pro, database-administrator |
| Security, auth, vulnerability | security-auditor, penetration-tester |
| Test, QA, coverage | qa-expert, test-automator |
| Deploy, CI/CD, Docker | devops-engineer, kubernetes-specialist |
| Performance, optimize | performance-engineer, database-optimizer |

## Output Format

```markdown
## Maestro Execution Report

### Task Analysis
- **Request**: [original task]
- **Domains Identified**: [list]
- **Strategy**: [parallel/sequential/hybrid]

### Sub-Agent Assignments
| Agent | Task | Status | Output |
|-------|------|--------|--------|
| ... | ... | ... | ... |

### Synthesized Results
[Combined output from all agents]

### Recommendations
[Follow-up suggestions]
```
