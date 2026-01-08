---
name: agent-info
description: Get detailed information about a specific sub-agent
usage: /agent-info <agent-name>
aliases: [agent, info]
---

# /agent-info Command

Display detailed information about a specific sub-agent including capabilities, tools, and usage examples.

## Invocation

```
/agent-info <agent-name>
```

## Examples

```bash
/agent-info backend-developer
/agent-info typescript-pro
/agent-info security-auditor
```

## Output Format

```markdown
## Agent: backend-developer

### Overview
Senior backend engineer specializing in scalable API development,
microservices architecture, database design, and server-side
performance optimization.

### Category
01 - Core Development

### Tools Available
- Read: Read files and content
- Write: Create new files
- Edit: Modify existing files
- Bash: Execute shell commands
- Glob: Find files by pattern
- Grep: Search file contents

### Core Competencies
- API Development (REST, GraphQL)
- Database Architecture
- Security Standards
- Performance Optimization
- Testing

### When to Use
- Building scalable backend services
- Implementing API endpoints
- Optimizing database queries
- Adding authentication/authorization
- Writing integration tests

### Example Tasks
1. "Create a REST API for user management"
2. "Optimize slow database queries"
3. "Implement JWT authentication"
4. "Add rate limiting to API endpoints"

### Collaborates With
- api-designer: For API contract definitions
- database-optimizer: For query performance
- devops-engineer: For deployment
- security-auditor: For security reviews

### Invocation
Direct:
```
/agent backend-developer "Implement user registration endpoint"
```

Via Maestro:
```
/maestro Create a user management API with CRUD operations
```
```

## Options

| Option | Description |
|--------|-------------|
| `--full` | Show complete system prompt |
| `--examples` | Show more usage examples |
| `--json` | Output as JSON |

## Related Commands

- `/list-subagents` - List all available agents
- `/maestro` - Orchestrate tasks with agents
- `/parallel-execute` - Run multiple agents in parallel
