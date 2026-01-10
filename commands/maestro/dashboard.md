---
name: dashboard
description: Display rich interactive project dashboard with progress visualization
usage: /maestro:dashboard [--tracks | --agents | --quality | --all]
aliases: [dash, overview]
---

# /maestro:dashboard Command

Display a comprehensive visual dashboard showing project progress, track status, agent performance, and quality metrics.

## Purpose

Get a quick, at-a-glance view of:
- Project health and progress
- Active and pending tracks
- Agent effectiveness
- Quality gate results
- Recent activity

## Usage

```bash
# Full dashboard
/maestro:dashboard

# Tracks focus
/maestro:dashboard --tracks

# Agent performance
/maestro:dashboard --agents

# Quality metrics
/maestro:dashboard --quality

# All sections expanded
/maestro:dashboard --all
```

## Dashboard Sections

### 1. Project Overview

```
╔══════════════════════════════════════════════════════════════╗
║                    PROJECT DASHBOARD                          ║
║  Project: {{PROJECT_NAME}}                                    ║
║  Workflow: {{WORKFLOW_TYPE}} | Context: Loaded                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  PROGRESS        ████████████████░░░░░░░░░░  65%             ║
║                                                               ║
║  Tracks: 8 total │ 2 active │ 5 completed │ 1 pending        ║
║  Tasks:  45 total │ 32 done │ 8 in progress │ 5 remaining    ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### 2. Active Tracks

```
┌─────────────────────────────────────────────────────────────┐
│ ACTIVE TRACKS                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ▶ TRACK-005: User Authentication                            │
│   ├─ Phase 2/3: Implementation                              │
│   ├─ Progress: ██████████████░░░░░░  70%                    │
│   ├─ Current: Task 2.3 - Implement token validation         │
│   ├─ Agents: backend-developer, security-auditor            │
│   └─ Blockers: None                                         │
│                                                              │
│ ▶ TRACK-007: Payment Integration                            │
│   ├─ Phase 1/4: Research & Design                           │
│   ├─ Progress: ████░░░░░░░░░░░░░░░░  20%                    │
│   ├─ Current: Task 1.2 - API documentation review           │
│   ├─ Agents: api-designer, backend-developer                │
│   └─ Blockers: Waiting for API credentials                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3. Agent Performance (--agents)

```
┌─────────────────────────────────────────────────────────────┐
│ AGENT PERFORMANCE (Last 30 days)                             │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ TOP PERFORMERS                                               │
│ ┌────────────────────┬───────┬─────────┬──────────────────┐ │
│ │ Agent              │ Tasks │ Success │ Effectiveness    │ │
│ ├────────────────────┼───────┼─────────┼──────────────────┤ │
│ │ backend-developer  │ 24    │ 96%     │ ████████████ 92% │ │
│ │ frontend-developer │ 18    │ 94%     │ ███████████░ 88% │ │
│ │ sql-pro            │ 12    │ 100%    │ ████████████ 95% │ │
│ │ qa-expert          │ 15    │ 93%     │ ██████████░░ 85% │ │
│ │ security-auditor   │ 8     │ 100%    │ ████████████ 98% │ │
│ └────────────────────┴───────┴─────────┴──────────────────┘ │
│                                                              │
│ COMBINATION EFFECTIVENESS                                    │
│ • backend + security-auditor: 97% success (12 tasks)        │
│ • frontend + qa-expert: 91% success (8 tasks)               │
│ • fullstack + sql-pro: 94% success (6 tasks)                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4. Quality Metrics (--quality)

```
┌─────────────────────────────────────────────────────────────┐
│ QUALITY METRICS                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ QUALITY GATES                                                │
│ ┌──────────────────────┬────────┬────────┬────────────────┐ │
│ │ Gate                 │ Passed │ Failed │ Pass Rate      │ │
│ ├──────────────────────┼────────┼────────┼────────────────┤ │
│ │ Phase Checkpoint     │ 12     │ 2      │ ████████░░ 86% │ │
│ │ Pre-Completion       │ 5      │ 0      │ ██████████ 100%│ │
│ │ Security Review      │ 3      │ 1      │ ███████░░░ 75% │ │
│ └──────────────────────┴────────┴────────┴────────────────┘ │
│                                                              │
│ CODE METRICS                                                 │
│ • Test Coverage: 84% ████████░░                             │
│ • Type Coverage: 92% █████████░                             │
│ • Lint Score:    98% ██████████                             │
│                                                              │
│ RECENT GATE RESULTS                                          │
│ ✓ TRACK-005 Phase 2 Checkpoint: PASSED (2 hours ago)        │
│ ✓ TRACK-003 Pre-Completion: PASSED (1 day ago)              │
│ ✗ TRACK-007 Phase 1 Checkpoint: FAILED (3 hours ago)        │
│   └─ Reason: Test coverage below threshold (72% < 80%)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5. Recent Activity

```
┌─────────────────────────────────────────────────────────────┐
│ RECENT ACTIVITY                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Today                                                        │
│ • 14:32 - TRACK-005: Completed Task 2.2 (backend-developer) │
│ • 13:15 - TRACK-007: Phase checkpoint failed                │
│ • 11:45 - TRACK-005: Started Task 2.3                       │
│ • 10:20 - Context updated: tech-stack.md                    │
│                                                              │
│ Yesterday                                                    │
│ • TRACK-003: Completed and closed                           │
│ • TRACK-006: Created new track                              │
│ • ADR-0003: Decision recorded                               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 6. Quick Actions

```
┌─────────────────────────────────────────────────────────────┐
│ QUICK ACTIONS                                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ [1] Continue TRACK-005 Task 2.3                             │
│ [2] View TRACK-007 blockers                                 │
│ [3] Run quality gate for TRACK-005                          │
│ [4] Create new track                                        │
│ [5] View full status                                        │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Options

| Option | Description |
|--------|-------------|
| `--tracks` | Focus on track details |
| `--agents` | Show agent performance metrics |
| `--quality` | Show quality gate results and metrics |
| `--all` | Show all sections expanded |
| `--json` | Output as JSON for tooling |

## Related Commands

- `/maestro:status` - Detailed status view
- `/maestro:implement` - Continue implementation
- `/maestro:quality` - Run quality gates

---

## Dashboard Protocol

When this command is invoked, follow this protocol:

### Step 1: Load Context

```
1. Check for maestro/ directory
2. Load project configuration
3. Load all track metadata
4. Load agent metrics (if available)
5. Load quality gate results (if available)
```

### Step 2: Calculate Metrics

```
1. Calculate overall progress:
   - Total tasks across all tracks
   - Completed tasks
   - Progress percentage

2. Aggregate agent metrics:
   - Tasks per agent
   - Success rates
   - Effectiveness scores

3. Summarize quality gates:
   - Pass/fail counts
   - Recent results
   - Trends
```

### Step 3: Render Dashboard

```
1. Render project overview header
2. Render active tracks section
3. If --agents: Render agent performance
4. If --quality: Render quality metrics
5. Render recent activity
6. Render quick actions
```

### Step 4: Handle Interactions

```
If user selects a quick action:
  - [1-3]: Execute corresponding command
  - [4]: Invoke /maestro:newTrack
  - [5]: Invoke /maestro:status
```

## ASCII Art Templates

### Progress Bar (20 chars)
```
0%:   ░░░░░░░░░░░░░░░░░░░░
25%:  █████░░░░░░░░░░░░░░░
50%:  ██████████░░░░░░░░░░
75%:  ███████████████░░░░░
100%: ████████████████████
```

### Status Icons
```
✓ - Passed/Complete
✗ - Failed
▶ - Active/In Progress
◯ - Pending
⚠ - Warning
◉ - Current focus
```

### Box Drawing
```
Single: ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
Double: ═ ║ ╔ ╗ ╚ ╝ ╠ ╣ ╦ ╩ ╬
```
