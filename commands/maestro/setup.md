---
name: setup
description: Initialize project context for Context-Driven Development
usage: /maestro:setup
aliases: [init, initialize]
---

# /maestro:setup Command

Initialize your project with Context-Driven Development methodology. This command creates the context files that guide all future development work.

## What It Does

1. **Analyzes your project** - Detects if this is a new (Greenfield) or existing (Brownfield) project
2. **Creates context files** - Generates product.md, tech-stack.md, workflow.md, and style guides
3. **Sets up track management** - Prepares the tracks system for feature development
4. **Optionally creates first track** - For new projects, helps define initial work

## Context Directory Structure

After setup, you'll have:

```
maestro/
├── product.md              # Product vision and goals
├── product-guidelines.md   # Core principles and constraints
├── tech-stack.md          # Technology decisions
├── workflow.md            # Development methodology
├── code-styleguide.md     # Selected style guide
├── tracks.md              # Track index (empty initially)
└── setup_state.json       # Setup state for resume
```

## Usage

```
/maestro:setup
```

## Interactive Flow

### Phase 1: Project Assessment

The setup will first determine your project type:

**Greenfield (New Project)**
- No existing source files detected
- Will guide you through complete setup
- Creates initial track for first feature

**Brownfield (Existing Project)**
- Detects existing code, dependencies, git history
- Analyzes current tech stack automatically
- Focuses on documenting existing patterns

### Phase 2: Product Definition

You'll be asked about:
- What does this product do?
- Who are the target users?
- What are the main features/goals?

### Phase 3: Guidelines

Define your project's principles:
- Code quality standards
- Performance requirements
- Security considerations
- Accessibility requirements

### Phase 4: Technology Stack

For Greenfield: Select technologies
For Brownfield: Confirm detected technologies

Includes:
- Programming languages
- Frameworks
- Databases
- External services

### Phase 5: Workflow Selection

Choose your development methodology:
- **TDD** - Test-Driven Development (recommended)
- **Agile** - Iterative development with flexibility
- **Minimal** - Lightweight tracking

### Phase 6: Code Style Guide

Select or customize style guides for your languages:
- TypeScript/JavaScript
- Python
- Go
- Rust
- (or provide custom)

### Phase 7: Initial Track (Greenfield only)

For new projects, optionally create your first track:
- Define initial feature or setup task
- Generate spec and plan
- Ready to start with `/maestro:implement`

## Resume Capability

Setup progress is saved to `maestro/setup_state.json`. If interrupted:

```
/maestro:setup
```

Will detect existing state and offer to resume from where you left off.

## Options

| Option | Description |
|--------|-------------|
| `--reset` | Start fresh, ignore existing setup |
| `--skip-track` | Skip initial track creation |
| `--workflow <type>` | Pre-select workflow (tdd, agile, minimal) |

## Examples

```bash
# Standard setup
/maestro:setup

# Reset and start fresh
/maestro:setup --reset

# Quick setup with TDD workflow
/maestro:setup --workflow tdd --skip-track
```

## After Setup

Once setup is complete, you can:

1. **Create tracks**: `/maestro:newTrack` to define features or bugs
2. **Check status**: `/maestro:status` to see project overview
3. **Implement**: `/maestro:implement` to start working on tracks

## Related Commands

- `/maestro:newTrack` - Create new feature or bug track
- `/maestro:status` - View project and track status
- `/maestro:implement` - Execute track implementation

---

## Setup Protocol

When this command is invoked, follow this protocol:

### Step 1: Check for Existing Setup

```
Read maestro/setup_state.json
If exists and not complete:
  - Offer to resume from last phase
  - Or start fresh with --reset
```

### Step 2: Project Classification

```
Analyze project root:
- Check for package.json, requirements.txt, go.mod, Cargo.toml
- Check for src/, lib/, app/ directories
- Check for .git directory
- Check for existing maestro/ directory

If significant code exists: Brownfield
Else: Greenfield
```

### Step 3: Interactive Questionnaire

Ask questions ONE AT A TIME. Wait for response before continuing.

**Product Questions:**
1. "What is the name of this product/project?"
2. "Describe what this product does in 1-2 sentences."
3. "Who are the primary users of this product?"
4. "What are the 3-5 main goals or features?"

**Guidelines Questions:**
1. "What code quality standards should we enforce?" (options: strict, balanced, minimal)
2. "Are there specific performance requirements?"
3. "What security considerations apply?"

**Tech Stack (Brownfield):**
1. "I detected [languages/frameworks]. Is this accurate?"
2. "Are there any additional technologies to document?"

**Tech Stack (Greenfield):**
1. "What programming language(s) will you use?"
2. "What frameworks or libraries are planned?"
3. "What database will you use?"

**Workflow Selection:**
1. "Choose your development workflow:"
   - TDD (Test-Driven Development) - Recommended
   - Agile (Iterative with flexibility)
   - Minimal (Lightweight tracking)

### Step 4: Generate Context Files

Create each file in `maestro/` directory:
- product.md
- product-guidelines.md
- tech-stack.md
- workflow.md (copy from template)
- code-styleguide.md (based on detected/selected languages)
- tracks.md (empty index)

### Step 5: Initial Track (Greenfield)

If Greenfield and user agrees:
1. Ask for first feature/task description
2. Create track using newTrack protocol
3. Record in tracks.md

### Step 6: Complete

- Update setup_state.json with completed status
- Display summary of created files
- Suggest next steps

### Validation

After EVERY file operation:
- Verify the file was created successfully
- If any operation fails, HALT and report the error
- Save progress to setup_state.json for resume capability
