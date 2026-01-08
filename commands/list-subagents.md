---
name: list-subagents
description: List all available sub-agents with their descriptions and capabilities
usage: /list-subagents [category]
aliases: [agents, show-agents]
---

# /list-subagents Command

Display available sub-agents organized by category.

## Invocation

```
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
```

## Options

| Option | Description |
|--------|-------------|
| `--search <term>` | Filter agents by name or description |
| `--category <id>` | Show only agents in category |
| `--tools` | Show tools available to each agent |
| `--compact` | Show condensed output |
| `--json` | Output as JSON |

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
| ... | ... |

### 02. Language Specialists (22 agents)
Deep expertise in specific programming languages and frameworks

| Agent | Description |
|-------|-------------|
| typescript-pro | TypeScript expert for advanced type systems |
| python-pro | Python expert for modern Python development |
| ... | ... |

[continues for all categories]
```

### Compact Output

```
01-core-development: api-designer, backend-developer, frontend-developer, fullstack-developer...
02-language-specialists: typescript-pro, python-pro, javascript-pro, golang-pro...
03-infrastructure: devops-engineer, kubernetes-specialist, terraform-engineer...
...
```

### JSON Output

```json
{
  "total": 117,
  "categories": [
    {
      "id": "01-core-development",
      "name": "Core Development",
      "agents": [
        {
          "id": "api-designer",
          "description": "Expert API architect...",
          "tools": ["Read", "Write", "Edit", "Glob", "Grep", "WebFetch"]
        }
      ]
    }
  ]
}
```

## Agent Details

To get detailed information about a specific agent, use:

```
/agent-info <agent-name>
```
