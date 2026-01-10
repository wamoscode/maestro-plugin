# Maestro Plugin for Claude Code

A comprehensive orchestration plugin that bundles 40+ specialized sub-agents for intelligent task routing and multi-agent collaboration in Claude Code. Now with **Context-Driven Development** methodology and **Platform Sync** for external project management integration.

## Overview

Maestro acts as a master orchestrator—like a skilled conductor leading an orchestra—analyzing user tasks, determining the optimal sub-agent(s) to invoke, coordinating their execution (parallel or sequential), and synthesizing their results into cohesive deliverables.

**New in v1.6**: Platform Sync for bidirectional synchronization with ClickUp, Linear, Jira, Asana, Todoist, YouTrack, and more via API or MCP.

**v1.5**: Enhanced CDD with context versioning, quality gates, impact analysis, track archetypes, and knowledge capture.

**v1.4**: CDD mode activation command (`/maestro:cdd`) with mandatory sub-agent orchestration for all tasks.

**v1.3**: Multi-project workspace support with git submodule handling, cross-project tracks, and coordinated commits across repositories.

## Features

- **40+ Specialized Sub-Agents**: Organized into 10 categories covering all aspects of software development
- **Intelligent Task Routing**: Automatic analysis and routing to appropriate specialists
- **Parallel Execution**: Run independent agents simultaneously for faster results
- **Workflow Orchestration**: Define complex multi-step workflows with dependencies
- **Context-Driven Development**: Structured tracks with specs, plans, and checkpoints
- **Platform Sync**: Bidirectional sync with ClickUp, Linear, Jira, Asana, Todoist, YouTrack
- **Multi-Project Workspaces**: Manage multiple repositories as a unified workspace
- **Git Submodule Support**: First-class handling of submodules with parent reference tracking
- **Cross-Project Tracks**: Features spanning multiple repositories with coordinated commits
- **Track Management**: Create, implement, and revert feature/bug tracks
- **Quality Gates**: Automated checkpoints and CI/CD integration
- **Impact Analysis**: Blast radius calculation and risk assessment
- **Track Archetypes**: Pre-built templates for common patterns (API, auth, migrations)
- **Workflow Templates**: TDD, Agile, and Minimal methodologies
- **Code Style Guides**: TypeScript, Python, Go, and Rust templates
- **Git Integration**: Commit tracking and git-aware revert functionality
- **MCP Integration**: Full Model Context Protocol support for advanced integrations

## Quick Start

### Context-Driven Development (Recommended)

For structured project management:

```bash
# 1. Initialize your project (first time only)
/maestro:setup

# 2. Activate CDD mode (start of every session)
/maestro:cdd

# 3. Create a feature track
/maestro:newTrack "Add user authentication with JWT"

# 4. Check status
/maestro:status

# 5. Implement the track
/maestro:implement

# 6. Revert if needed
/maestro:revert TRACK-001
```

### Quick Orchestration

For quick, untracked tasks:

```bash
/maestro Build a REST API for user management with authentication
```

## Commands

### Context-Driven Development Commands

| Command | Description |
|---------|-------------|
| `/maestro:cdd` | **Activate CDD mode** - loads context and enables sub-agent orchestration |
| `/maestro:setup` | Initialize project/workspace context |
| `/maestro:newTrack` | Create a new feature, bug, or chore track |
| `/maestro:status` | View project progress and track status |
| `/maestro:implement` | Execute track implementation with sub-agents |
| `/maestro:revert` | Git-aware rollback of tracks or tasks |
| `/maestro:sync` | Sync tracks with external platforms |
| `/maestro:dashboard` | Rich terminal dashboard with progress visualization |
| `/maestro:impact` | Analyze change impact and blast radius |
| `/maestro:stash` | Pause/resume tracks without reverting |
| `/maestro:quick` | Fast shortcuts for common CDD actions |

### Multi-Project Commands

| Command | Description |
|---------|-------------|
| `/maestro:workspace` | Manage workspace configuration and projects |
| `/maestro:projects` | List and switch between projects |
| `/maestro:setup --workspace` | Initialize multi-project workspace |
| `/maestro:newTrack --cross-project` | Create track spanning multiple repos |
| `/maestro:status --all` | View all projects status |

### Orchestration Commands

| Command | Description |
|---------|-------------|
| `/maestro` | Quick task orchestration with auto-routing |
| `/workflow` | Define and execute multi-step agent workflows |
| `/parallel-execute` | Run multiple agents in parallel |
| `/list-subagents` | Browse available agents by category |
| `/agent-info` | Get detailed information about an agent |

## Context-Driven Development

### How It Works

```
Context → Specification & Planning → Implementation with Sub-Agents
```

1. **Setup**: Define your product, tech stack, and workflow methodology
2. **Track**: Create tracked work units with specs and implementation plans
3. **Implement**: Execute plans with automatic sub-agent routing
4. **Monitor**: Track progress with status and checkpoints
5. **Iterate**: Revert cleanly if needed, re-implement with improvements

### CDD Mode (`/maestro:cdd`)

**Always start your session with `/maestro:cdd`** to activate Context-Driven Development mode. This command ensures Claude has full awareness of your project context and will leverage specialized sub-agents for every task.

```bash
/maestro:cdd
```

#### What CDD Mode Activates

| Feature | Description |
|---------|-------------|
| **Context Loading** | Loads product.md, tech-stack.md, workflow.md, and all active tracks |
| **Sub-Agent Orchestration** | Every task routes to appropriate specialist agents |
| **Context Updates** | Discussions and decisions automatically update context files |
| **Workflow Enforcement** | Follows your chosen methodology (TDD/Agile/Minimal) |
| **Track Awareness** | Knows active tracks, current tasks, and progress |

#### Sub-Agent Orchestration

When CDD mode is active, **every task leverages specialized sub-agents**:

**Single Agent Tasks** (simple, focused operations):
```
"Fix CSS bug"           → frontend-developer
"Optimize SQL query"    → sql-pro
"Add API endpoint"      → backend-developer
```

**Multi-Agent Teams** (complex, multi-domain tasks):
```
"Build user authentication" →
  api-designer + backend-developer + security-auditor + qa-expert

"Add payment processing" →
  api-designer + backend-developer + security-auditor +
  sql-pro + frontend-developer + qa-expert

"Set up CI/CD pipeline" →
  devops-engineer + security-auditor + deployment-engineer
```

#### Agent Selection Criteria

Agents are selected based on:

1. **Task Domain**: Frontend, backend, DevOps, security, data, etc.
2. **Project Tech Stack**: Matches specialists to your technologies
3. **Workflow Requirements**: TDD always includes qa-expert
4. **Task Complexity**: Simple tasks get one agent, complex tasks get teams

#### Automatic Context Updates

After every significant discussion in CDD mode, context files are updated:

| Decision Type | Updated File |
|--------------|--------------|
| New requirement | `spec.md` |
| Technical approach | `plan.md`, `tech-stack.md` |
| Guideline change | `product-guidelines.md` |
| Task completion | `plan.md` (mark complete) |
| Blocker encountered | `plan.md` (add note) |
| Scope change | `spec.md`, `plan.md` |

#### CDD Mode Output

When activated, you'll see:

```markdown
## CDD Mode Activated

### Project Context Loaded
- **Product**: My Awesome App
- **Tech Stack**: TypeScript, React, Node.js, PostgreSQL
- **Workflow**: TDD
- **Guidelines**: Security-first, 80% test coverage

### Active Tracks
| ID | Title | Status | Progress |
|----|-------|--------|----------|
| TRACK-001 | User Authentication | active | 60% |

### Available Specialists (based on tech stack)
| Domain | Primary Agents |
|--------|----------------|
| Frontend | frontend-developer, react-specialist |
| Backend | backend-developer, api-designer |
| Database | sql-pro, postgres-pro |
| Quality | qa-expert, test-automator |

Ready for CDD workflow. What would you like to work on?
```

### Project Structure

After running `/maestro:setup`, your project includes:

```
maestro/
├── product.md              # Product definition and vision
├── product-guidelines.md   # Core principles and constraints
├── tech-stack.md          # Technology decisions
├── workflow.md            # Development methodology
├── code-styleguide.md     # Code standards
├── tracks.md              # Track index
└── tracks/
    └── TRACK-001/
        ├── metadata.json  # Track metadata
        ├── spec.md        # Requirements specification
        └── plan.md        # Implementation plan
```

### Workflow Templates

Choose your development methodology:

- **TDD (Test-Driven Development)**: Write tests first, then implement
- **Agile**: Iterative development with flexibility
- **Minimal**: Lightweight tracking for quick tasks

### Track Lifecycle

```
[ ] Pending → [~] In Progress → [x] Complete
```

Each task in a track:
- Gets assigned to appropriate sub-agents
- Follows your chosen workflow
- Records commit SHAs
- Supports phase checkpoints

## Multi-Project Workspaces

### Overview

For projects with multiple repositories, git submodules, or monorepo structures:

```bash
# Initialize as workspace
/maestro:setup --workspace

# Add projects
/maestro:workspace add ./frontend
/maestro:workspace add ./backend --type submodule

# Switch between projects
/maestro:projects switch backend

# Create cross-project track
/maestro:newTrack --cross-project "Add shared authentication"
```

### Workspace Structure

```
workspace-root/
├── maestro/
│   ├── workspace.json          # Workspace configuration
│   ├── product.md              # Umbrella product vision
│   ├── cross-project-tracks.md # Cross-project track index
│   └── projects/               # Project registry
├── frontend/
│   ├── maestro/
│   │   ├── project.json        # Links to workspace
│   │   └── tracks.md           # Project tracks
│   └── src/
├── backend/                    # Git submodule
│   ├── maestro/
│   └── src/
└── .gitmodules
```

### Git Submodule Support

Maestro handles submodules automatically:
- Detects submodules from `.gitmodules`
- Commits to submodule repos first
- Updates parent repository references
- Supports atomic or independent commit strategies

### Cross-Project Tracks

Features spanning multiple repositories:

```bash
# Create cross-project track
/maestro:newTrack --cross-project "Implement shared auth"

# Implement across all projects
/maestro:implement CROSS-001 --all-projects

# Revert with submodule handling
/maestro:revert CROSS-001 --include-submodules
```

## Platform Sync

Synchronize CDD tracks with external project management platforms. Supports both direct API and MCP-based connections.

### Supported Platforms

| Platform | Connection Types | Features |
|----------|-----------------|----------|
| **ClickUp** | API | Tasks, lists, custom fields, priorities |
| **Linear** | API | Issues, projects, cycles, labels |
| **Jira** | API | Issues, epics, sprints, custom fields |
| **Asana** | API | Tasks, projects, sections, tags |
| **Todoist** | API | Tasks, projects, labels, priorities |
| **YouTrack** | API | Issues, tags, custom fields |
| **Notion** | MCP | Database pages, properties |
| **GitHub** | MCP | Issues, projects, milestones |

### Quick Start

```bash
# Initialize sync configuration
/maestro:sync config --init

# Test platform connections
/maestro:sync test

# Push all tracks to configured platforms
/maestro:sync push

# Pull items from external platforms
/maestro:sync pull --platform=linear

# Link existing track to external item
/maestro:sync link TRACK-001 jira:PROJ-123
```

### Configuration

Create `.cdd/sync-config.json` in your project (or use `/maestro:sync config --init`):

```json
{
  "sync": {
    "enabled": true,
    "mode": "bidirectional",
    "conflictResolution": "cdd_wins"
  },
  "platforms": {
    "linear": {
      "enabled": true,
      "connection": {
        "type": "api",
        "apiKey": "${LINEAR_API_KEY}"
      },
      "mapping": {
        "teamId": "your-team-id"
      }
    }
  }
}
```

### Connection Types

**Direct API**: Configure with API keys and tokens
```json
{
  "connection": {
    "type": "api",
    "apiKey": "${LINEAR_API_KEY}"
  }
}
```

**MCP-Based**: Use existing MCP servers
```json
{
  "connection": {
    "type": "mcp",
    "mcp": {
      "server": "notion-mcp-server",
      "toolPrefix": "notion"
    }
  }
}
```

### Sync Commands

| Command | Description |
|---------|-------------|
| `/maestro:sync status` | Show sync status for all platforms |
| `/maestro:sync push` | Push CDD tracks to external platforms |
| `/maestro:sync pull` | Pull items from external platforms |
| `/maestro:sync full` | Bidirectional sync |
| `/maestro:sync test` | Test platform connections |
| `/maestro:sync link` | Link track to external item |
| `/maestro:sync config` | Configure sync settings |

### Environment Variables

```bash
# ClickUp
export CLICKUP_API_KEY="your-api-key"

# Linear
export LINEAR_API_KEY="your-api-key"

# Jira
export JIRA_HOST="https://your-org.atlassian.net"
export JIRA_EMAIL="your-email@example.com"
export JIRA_API_TOKEN="your-api-token"

# Asana
export ASANA_ACCESS_TOKEN="your-token"

# Todoist
export TODOIST_API_TOKEN="your-token"

# YouTrack
export YOUTRACK_HOST="https://your-org.youtrack.cloud"
export YOUTRACK_TOKEN="your-token"
```

## Installation

Choose the installation method that best fits your needs:

### Option 1: Symlink (Recommended for Development)

Best for local development—changes are reflected immediately without reinstalling.

```bash
# Clone the repository
git clone https://github.com/wamoscode/maestro-plugin.git ~/Projects/maestro-plugin

# Create symlink to plugins directory
# macOS:
ln -sf ~/Projects/maestro-plugin ~/.claude/plugins/maestro

# Linux:
ln -sf ~/Projects/maestro-plugin ~/.config/claude-code/plugins/maestro
```

### Option 2: Install Script

Automated installation with dependency setup and configuration.

```bash
# Clone the repository
git clone https://github.com/wamoscode/maestro-plugin.git

# Navigate to the plugin directory
cd maestro

# Run the installation script
./scripts/install.sh
```

The script will:
- Detect your OS and set the correct plugin path
- Copy plugin files to the plugins directory
- Install npm dependencies
- Create default configuration at `~/.maestro/config.json`
- Verify the installation

### Option 3: Direct Copy

Simple copy to the plugins directory.

```bash
# Clone the repository
git clone https://github.com/wamoscode/maestro-plugin.git

# Copy to plugins directory
# macOS:
cp -r maestro ~/.claude/plugins/maestro

# Linux:
cp -r maestro ~/.config/claude-code/plugins/maestro

# Install dependencies (optional, for MCP server)
cd ~/.claude/plugins/maestro
npm install
```

### Option 4: Settings Configuration

Add the plugin path to your Claude Code settings.

1. Edit `~/.claude/settings.json`:

```json
{
  "plugins": {
    "maestro": {
      "path": "/absolute/path/to/maestro-plugin"
    }
  }
}
```

2. Restart Claude Code to load the plugin.

### Post-Installation

After installation, restart Claude Code or reload plugins, then verify:

```bash
# List available agents
/list-subagents

# Get help
/agent-info maestro

# Initialize project (new feature!)
/maestro:setup
```

### Uninstallation

```bash
# Remove the plugin
rm -rf ~/.claude/plugins/maestro

# Remove configuration (optional)
rm -rf ~/.maestro

# If using symlink
rm ~/.claude/plugins/maestro
```

### Troubleshooting

| Issue | Solution |
|-------|----------|
| Plugin not loading | Restart Claude Code; check plugin.json is valid JSON |
| Commands not found | Verify symlink/copy completed; check `~/.claude/plugins/maestro` exists |
| MCP server errors | Run `npm install` in plugin directory; check Node.js 18+ installed |
| Permission denied | Run `chmod +x scripts/*.sh` to make scripts executable |

## Usage Examples

### Initialize a New Project

```bash
/maestro:setup
```

Walks you through:
- Product definition
- Technology stack
- Workflow selection (TDD/Agile/Minimal)
- Code style guide selection

### Create and Implement a Feature

```bash
# Create a track with interactive Q&A
/maestro:newTrack "Add payment processing with Stripe"

# Or with a description
/maestro:newTrack --type feature "Implement user dashboard"

# Start implementation
/maestro:implement TRACK-001

# Check progress
/maestro:status
```

### Quick Orchestration (No Tracking)

```bash
# Simple task
/maestro Build a REST API for user management

# With specific agents
/maestro --agents=backend-developer,security-auditor Add password reset

# Dry run to see plan
/maestro --dry-run Implement OAuth2 authentication
```

### Define Workflows

```bash
# Sequential workflow
/workflow backend-developer:"Build API" -> qa-expert:"Test" -> devops-engineer:"Deploy"

# Parallel groups
/workflow [frontend-developer | backend-developer] -> qa-expert

# From track plan
/workflow --from-track TRACK-001
```

### Browse Agents

```bash
# All agents
/list-subagents

# By category
/list-subagents infrastructure

# Project-relevant agents
/list-subagents --project

# Search
/list-subagents --search security
```

## Agent Categories

| Category | Agents | Focus |
|----------|--------|-------|
| Core Development | 11 | Frontend, backend, API, full-stack |
| Language Specialists | 11 | TypeScript, Python, Go, Rust, Java, etc. |
| Infrastructure | 4 | DevOps, Kubernetes, Terraform, Cloud |
| Quality & Security | 4 | Testing, code review, security audits |
| Data & AI | 3 | ML, data engineering, prompt engineering |
| Developer Experience | 2 | Documentation, refactoring |
| Specialized Domains | 2 | Blockchain, gaming |
| Business & Product | 2 | Product management, technical writing |
| Meta & Orchestration | 2 | Multi-agent coordination |
| Research & Analysis | 1 | Research analyst |

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

**Agent Tools:**
- `list_agents` - List available sub-agents
- `get_agent_info` - Get agent details
- `analyze_task` - Analyze a task and get routing recommendations
- `execute_workflow` - Execute a defined workflow
- `get_execution_status` - Check execution status
- `get_metrics` - Get execution metrics

**Sync Tools:**
- `sync_status` - Get synchronization status for all platforms
- `sync_push` - Push CDD tracks to external platforms
- `sync_pull` - Pull items from external platforms
- `sync_link` - Link a CDD track to an external item
- `sync_test` - Test platform connections
- `sync_config` - Get or update sync configuration

## Directory Structure

```
maestro-plugin/
├── plugin.json              # Plugin metadata
├── commands/                # Slash commands
│   ├── maestro.md          # Main orchestration (track-aware)
│   ├── maestro/            # Context-driven commands
│   │   ├── cdd.md          # CDD mode activation
│   │   ├── setup.md        # Project initialization
│   │   ├── newTrack.md     # Track creation
│   │   ├── status.md       # Progress monitoring
│   │   ├── implement.md    # Track implementation
│   │   ├── revert.md       # Git-aware rollback
│   │   ├── sync.md         # Platform synchronization
│   │   ├── dashboard.md    # Progress dashboard
│   │   ├── impact.md       # Impact analysis
│   │   ├── stash.md        # Track stashing
│   │   └── quick.md        # Quick actions
│   ├── workflow.md         # Workflow orchestration
│   ├── list-subagents.md   # Agent browser
│   ├── agent-info.md       # Agent details
│   └── parallel-execute.md # Parallel execution
├── templates/               # Project templates
│   ├── workflow-tdd.md     # TDD methodology
│   ├── workflow-agile.md   # Agile methodology
│   ├── workflow-minimal.md # Minimal tracking
│   ├── sync-config.json    # Platform sync configuration
│   ├── tracks.md           # Track index template
│   ├── archetypes/         # Track archetypes
│   │   ├── api-endpoint.md
│   │   ├── auth-feature.md
│   │   └── database-migration.md
│   ├── code_styleguides/   # Language style guides
│   │   ├── typescript.md
│   │   ├── python.md
│   │   ├── go.md
│   │   └── rust.md
│   └── track/              # Track templates
│       ├── spec.md
│       ├── plan.md
│       └── metadata.json
├── subagents/              # Agent definitions (42 agents)
│   ├── maestro.md          # Main orchestrator
│   ├── registry.json       # Agent registry
│   └── [10 category folders]
├── hooks/                  # Execution hooks
├── skills/                 # Specialized skills
│   ├── platform-sync/      # Platform sync adapters
│   │   ├── sync-engine.js
│   │   └── adapters/       # Platform-specific adapters
│   ├── context-versioning.js
│   ├── quality-gates.js
│   ├── impact-analysis.js
│   └── knowledge-capture.js
├── scripts/                # Automation scripts
└── mcp/                    # MCP server
```

## Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Credits

- Sub-agent definitions based on [awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents)
- Context-Driven Development inspired by [Conductor](https://github.com/gemini-cli-extensions/conductor)
