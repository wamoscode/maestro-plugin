---
name: list-subagents
description: List all available sub-agents with their descriptions and capabilities
usage: /list-subagents [category]
aliases: [agents, show-agents]
---

# /list-subagents Command

Display available sub-agents organized by category. When project context exists, highlights agents relevant to your tech stack.

## Invocation

```bash
/list-subagents [category]
```

## Categories

| ID | Name | Agent Count |
|----|------|-------------|
| 01 | Core Development | 11 |
| 02 | Language Specialists | 22 |
| 03 | Infrastructure | 12 |
| 04 | Quality & Security | 12 |
| 05 | Data & AI | 12 |
| 06 | Developer Experience | 13 |
| 07 | Specialized Domains | 12 |
| 08 | Business & Product | 10 |
| 09 | Meta & Orchestration | 9 |
| 10 | Research & Analysis | 6 |

## Examples

```bash
# List all agents
/list-subagents

# List agents in a specific category
/list-subagents core-development
/list-subagents 01
/list-subagents infrastructure

# Search for agents
/list-subagents --search python
/list-subagents --search security

# Show only project-relevant agents
/list-subagents --project

# Show agents for current track
/list-subagents --track TRACK-002
```

## Options

| Option | Description |
|--------|-------------|
| `--search <term>` | Filter agents by name or description |
| `--category <id>` | Show only agents in category |
| `--tools` | Show tools available to each agent |
| `--compact` | Show condensed output |
| `--json` | Output as JSON |
| `--project` | Show only agents relevant to project tech stack |
| `--track <id>` | Show agents assigned to specific track |
| `--recommended` | Show recommended agents for current context |

## Project-Aware Features

### Tech Stack Highlighting

When `maestro/` directory exists, agents matching your tech stack are highlighted:

```
## Available Sub-Agents (117 total)

### Your Project Stack
Based on tech-stack.md, these agents are most relevant:

| Agent | Match | Description |
|-------|-------|-------------|
| typescript-pro | TypeScript | TypeScript expert for advanced type systems |
| react-specialist | React | React ecosystem expert |
| nextjs-developer | Next.js | Next.js and SSR specialist |
| postgres-pro | PostgreSQL | PostgreSQL optimization expert |
| devops-engineer | CI/CD | DevOps and deployment expert |

### 01. Core Development (11 agents)
...
```

### Track Agent Summary

Show agents assigned to a track:

```bash
/list-subagents --track TRACK-002
```

```
## Agents for TRACK-002: User Authentication

| Agent | Tasks Assigned |
|-------|----------------|
| sql-pro | 1.1, 1.2 |
| backend-developer | 2.1, 2.2, 2.4 |
| security-auditor | 2.3, 4.1 |
| qa-expert | 4.2, 4.3 |

Total: 4 agents across 8 tasks
```

### Recommended Agents

Get recommendations based on context:

```bash
/list-subagents --recommended
```

```
## Recommended Agents

Based on your project and current work:

### For Current Track (TRACK-002: User Authentication)
- security-auditor - Authentication security review
- backend-developer - API implementation
- qa-expert - Test coverage

### For Your Tech Stack
- typescript-pro - TypeScript best practices
- react-specialist - Frontend components
- postgres-pro - Database optimization

### Commonly Used Together
- backend-developer + security-auditor
- frontend-developer + ui-designer
- devops-engineer + kubernetes-specialist
```

## Output Format

### Default Output

```
## Available Sub-Agents (117 total)

### 01. Core Development (11 agents)
Essential coding specialists for frontend, backend, API, and full-stack development

| Agent | Description |
|-------|-------------|
| api-designer | Expert API architect for REST and GraphQL design |
| backend-developer | Senior backend engineer for scalable systems |
| frontend-developer | Expert frontend engineer for React/Vue/Angular |
| fullstack-developer | Versatile full-stack for end-to-end features |
| ui-designer | UI/UX design implementation specialist |
| mobile-developer | Cross-platform mobile development expert |
| websocket-engineer | Real-time communication specialist |
| graphql-architect | GraphQL schema and federation expert |
| microservices-architect | Distributed systems designer |
| electron-pro | Desktop application specialist |
| wordpress-master | WordPress development expert |

### 02. Language Specialists (22 agents)
Deep expertise in specific programming languages and frameworks

| Agent | Description |
|-------|-------------|
| typescript-pro | TypeScript expert for advanced type systems |
| python-pro | Python expert for modern Python development |
| javascript-pro | JavaScript ecosystem specialist |
| golang-pro | Go expert for concurrent systems |
| rust-engineer | Rust systems programming expert |
| ... | ... |

[continues for all categories]
```

### Compact Output

```bash
/list-subagents --compact
```

```
01-core-development: api-designer, backend-developer, frontend-developer, fullstack-developer, ui-designer...
02-language-specialists: typescript-pro, python-pro, javascript-pro, golang-pro, rust-engineer...
03-infrastructure: devops-engineer, kubernetes-specialist, terraform-engineer, cloud-architect...
04-quality-security: qa-expert, security-auditor, code-reviewer, debugger, test-automator...
05-data-ai: data-engineer, ml-engineer, ai-engineer, data-scientist, prompt-engineer...
...
```

### JSON Output

```bash
/list-subagents --json
```

```json
{
  "total": 117,
  "project": {
    "detected": true,
    "techStack": ["TypeScript", "React", "PostgreSQL"],
    "relevantAgents": ["typescript-pro", "react-specialist", "postgres-pro"]
  },
  "categories": [
    {
      "id": "01-core-development",
      "name": "Core Development",
      "count": 11,
      "agents": [
        {
          "id": "api-designer",
          "description": "Expert API architect for REST and GraphQL design",
          "tools": ["Read", "Write", "Edit", "Glob", "Grep", "WebFetch"],
          "relevant": true
        }
      ]
    }
  ]
}
```

## Agent Details

To get detailed information about a specific agent, use:

```bash
/agent-info <agent-name>
```

## Related Commands

- `/agent-info` - Detailed agent information
- `/maestro` - Orchestrate with selected agents
- `/workflow` - Define agent workflows
- `/maestro:implement` - Execute with assigned agents
