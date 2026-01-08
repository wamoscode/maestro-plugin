---
name: agent-info
description: Get detailed information about a specific sub-agent
usage: /agent-info <agent-name>
aliases: [agent, info]
---

# /agent-info Command

Display detailed information about a specific sub-agent including capabilities, tools, usage examples, and project relevance.

## Invocation

```bash
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

### Project Relevance
Based on your tech-stack.md:
- Matches: Node.js, PostgreSQL, REST API
- Relevance: High

### Tools Available
| Tool | Purpose |
|------|---------|
| Read | Read files and content |
| Write | Create new files |
| Edit | Modify existing files |
| Bash | Execute shell commands |
| Glob | Find files by pattern |
| Grep | Search file contents |

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
| Agent | Purpose |
|-------|---------|
| api-designer | API contract definitions |
| database-optimizer | Query performance |
| devops-engineer | Deployment |
| security-auditor | Security reviews |
| qa-expert | Test coverage |

### Track Usage
Currently assigned in:
- TRACK-002: Task 2.1, 2.2, 2.4 (User Authentication)

### Invocation

**Direct:**
/agent backend-developer "Implement user registration endpoint"

**Via Maestro:**
/maestro Create a user management API with CRUD operations

**In Workflow:**
/workflow backend-developer:"Build API" -> qa-expert:"Test"
```

## Options

| Option | Description |
|--------|-------------|
| `--full` | Show complete system prompt |
| `--examples` | Show more usage examples |
| `--json` | Output as JSON |
| `--history` | Show agent usage history in project |
| `--related` | Show related agents with context |

## Project-Aware Features

### Tech Stack Relevance

When `maestro/tech-stack.md` exists, shows how the agent relates to your project:

```
### Project Relevance
Based on your tech-stack.md:

Matches:
  ✓ TypeScript - Primary language match
  ✓ Node.js - Runtime match
  ✓ PostgreSQL - Database match

Relevance Score: 95% (High)

Recommendation: This agent is well-suited for your project.
```

### Track Assignments

Shows where this agent is currently assigned:

```
### Active Assignments

TRACK-002: User Authentication
  - Task 2.1: Setup auth routes [x]
  - Task 2.2: Implement registration [x]
  - Task 2.4: Add password reset [~]

TRACK-003: Dashboard Analytics
  - Task 1.3: Create data API [ ]
```

### Usage History

With `--history` flag:

```
### Usage History (Last 30 days)

| Date | Track | Task | Duration |
|------|-------|------|----------|
| Jan 8 | TRACK-002 | 2.1 | 5m |
| Jan 8 | TRACK-002 | 2.2 | 8m |
| Jan 7 | TRACK-001 | 1.5 | 3m |

Total: 5 tasks, 25 minutes
```

### Related Agents

With `--related` flag:

```
### Related Agents

Commonly paired with backend-developer:

| Agent | Relationship | Use Case |
|-------|-------------|----------|
| security-auditor | Security review | Auth, data protection |
| api-designer | Design first | API contracts |
| qa-expert | Testing | Integration tests |
| database-optimizer | Performance | Query optimization |
| devops-engineer | Deployment | CI/CD, containers |

Similar agents:
- fullstack-developer (broader scope)
- django-developer (Python-specific)
- java-architect (Java-specific)
```

## JSON Output

```bash
/agent-info backend-developer --json
```

```json
{
  "id": "backend-developer",
  "name": "Backend Developer",
  "category": {
    "id": "01-core-development",
    "name": "Core Development"
  },
  "description": "Senior backend engineer...",
  "tools": ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
  "competencies": [
    "API Development",
    "Database Architecture",
    "Security Standards"
  ],
  "projectRelevance": {
    "score": 95,
    "matches": ["TypeScript", "Node.js", "PostgreSQL"],
    "level": "high"
  },
  "currentAssignments": [
    {
      "track": "TRACK-002",
      "tasks": ["2.1", "2.2", "2.4"]
    }
  ],
  "collaborates": ["api-designer", "security-auditor", "qa-expert"]
}
```

## Related Commands

- `/list-subagents` - List all available agents
- `/maestro` - Orchestrate tasks with agents
- `/workflow` - Define agent workflows
- `/maestro:implement` - Execute track with agents
