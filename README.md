# Maestro Plugin for Claude Code

A comprehensive orchestration plugin that bundles 100+ specialized sub-agents for intelligent task routing and multi-agent collaboration in Claude Code.

## Overview

Maestro acts as a master orchestrator—like a skilled conductor leading an orchestra—analyzing user tasks, determining the optimal sub-agent(s) to invoke, coordinating their execution (parallel or sequential), and synthesizing their results into cohesive deliverables.

## Features

- **100+ Specialized Sub-Agents**: Organized into 10 categories covering all aspects of software development
- **Intelligent Task Routing**: Automatic analysis and routing to appropriate specialists
- **Parallel Execution**: Run independent agents simultaneously for faster results
- **Workflow Orchestration**: Define complex multi-step workflows with dependencies
- **Error Handling**: Built-in retry logic, circuit breakers, and fallback strategies
- **MCP Integration**: Full Model Context Protocol support for advanced integrations

## Installation

### Quick Install

```bash
# Clone the repository
git clone https://github.com/maestro-plugin/maestro.git

# Navigate to the plugin directory
cd maestro

# Run the installation script
./scripts/install.sh
```

### Manual Install

1. Copy the plugin to your Claude Code plugins directory:
   - macOS: `~/.claude/plugins/maestro`
   - Linux: `~/.config/claude-code/plugins/maestro`

2. Install dependencies (if using MCP server):
   ```bash
   cd ~/.claude/plugins/maestro
   npm install
   ```

## Quick Start

### Basic Orchestration

```
/maestro Build a REST API for user management with authentication
```

### List Available Agents

```
/list-subagents
/list-subagents --category infrastructure
/list-subagents --search security
```

### Get Agent Details

```
/agent-info backend-developer
/agent-info security-auditor
```

### Parallel Execution

```
/parallel-execute \
  frontend-developer:"Build React components" \
  backend-developer:"Create API endpoints"
```

### Define Workflows

```
/workflow backend-developer:"Build API" -> qa-expert:"Test" -> devops-engineer:"Deploy"
```

## Agent Categories

| Category | Agents | Focus |
|----------|--------|-------|
| Core Development | 11 | Frontend, backend, API, full-stack |
| Language Specialists | 22+ | TypeScript, Python, Go, Rust, Java, etc. |
| Infrastructure | 12 | DevOps, Kubernetes, Terraform, Cloud |
| Quality & Security | 12 | Testing, code review, security audits |
| Data & AI | 12 | ML, data engineering, prompt engineering |
| Developer Experience | 13 | Documentation, tooling, refactoring |
| Specialized Domains | 12 | Blockchain, gaming, fintech, IoT |
| Business & Product | 10 | Product management, technical writing |
| Meta & Orchestration | 9 | Multi-agent coordination |
| Research & Analysis | 6 | Research, competitive analysis |

## Configuration

The plugin can be configured via `~/.maestro/config.json`:

```json
{
  "maxParallelAgents": 5,
  "defaultTimeout": 300000,
  "enableLogging": true,
  "logLevel": "info",
  "isolatedContexts": true,
  "autoRetry": true,
  "maxRetries": 3,
  "circuitBreaker": {
    "enabled": true,
    "threshold": 5,
    "resetTimeout": 60000
  }
}
```

## MCP Server

The plugin includes an MCP server for advanced integrations:

```json
{
  "mcpServers": {
    "maestro": {
      "command": "node",
      "args": ["~/.claude/plugins/maestro/mcp/server.js"]
    }
  }
}
```

### MCP Tools

- `list_agents` - List available sub-agents
- `get_agent_info` - Get agent details
- `analyze_task` - Analyze a task and get routing recommendations
- `execute_workflow` - Execute a defined workflow
- `get_execution_status` - Check execution status
- `get_metrics` - Get execution metrics

## Directory Structure

```
maestro-plugin/
├── plugin.json           # Plugin metadata
├── commands/             # Slash commands
│   ├── maestro.md
│   ├── list-subagents.md
│   ├── agent-info.md
│   ├── parallel-execute.md
│   └── workflow.md
├── subagents/            # Agent definitions
│   ├── maestro.md        # Main orchestrator
│   ├── registry.json     # Agent registry
│   ├── 01-core-development/
│   ├── 02-language-specialists/
│   ├── 03-infrastructure/
│   ├── 04-quality-security/
│   ├── 05-data-ai/
│   ├── 06-developer-experience/
│   ├── 07-specialized-domains/
│   ├── 08-business-product/
│   ├── 09-meta-orchestration/
│   └── 10-research-analysis/
├── hooks/                # Execution hooks
│   ├── pre-execution.js
│   ├── post-execution.js
│   ├── error-handler.js
│   └── agent-router.js
├── skills/               # Specialized skills
│   ├── task-analyzer.js
│   ├── result-aggregator.js
│   ├── dependency-resolver.js
│   └── context-manager.js
├── scripts/              # Automation scripts
│   ├── install.sh
│   ├── sync-agents.sh
│   └── validate.sh
└── mcp/                  # MCP server
    ├── config.json
    └── server.js
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

Sub-agent definitions based on [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents).
