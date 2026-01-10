---
name: impact
description: Analyze impact and risk of track changes on the codebase
usage: /maestro:impact <track-id> [--detailed | --graph | --test-strategy]
aliases: [blast-radius, risk]
---

# /maestro:impact Command

Analyze the potential impact of a track's changes on the codebase. Shows affected files, dependencies, blast radius, and risk assessment.

## Purpose

Before implementing or during planning:
- Understand what parts of the codebase will be affected
- Identify hidden dependencies
- Assess risk level
- Plan testing strategy
- Visualize change impact

## Usage

```bash
# Basic impact analysis
/maestro:impact TRACK-005

# Detailed analysis with all files
/maestro:impact TRACK-005 --detailed

# Generate dependency graph
/maestro:impact TRACK-005 --graph

# Get testing strategy recommendations
/maestro:impact TRACK-005 --test-strategy

# Analyze before creating track
/maestro:impact --preview "Add user authentication feature"
```

## Output

### Summary View

```
╔══════════════════════════════════════════════════════════════╗
║                    IMPACT ANALYSIS                            ║
║  Track: TRACK-005 - User Authentication                      ║
║  Analyzed: 2024-01-15 14:30                                  ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  RISK LEVEL: ██████████░░ HIGH                               ║
║                                                               ║
║  Summary:                                                     ║
║  • Files directly affected: 12                               ║
║  • Files with dependencies: 28                               ║
║  • Blast radius score: 8.5/10                                ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

### Affected Areas

```
┌─────────────────────────────────────────────────────────────┐
│ AFFECTED AREAS                                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ CORE CHANGES (Direct modifications)                         │
│ ├── src/auth/                                               │
│ │   ├── AuthService.ts         [NEW]                        │
│ │   ├── TokenManager.ts        [NEW]                        │
│ │   └── middleware/            [NEW]                        │
│ ├── src/api/routes/                                         │
│ │   ├── auth.routes.ts         [NEW]                        │
│ │   └── index.ts               [MODIFY]                     │
│ └── src/models/                                             │
│     └── User.ts                [MODIFY]                     │
│                                                              │
│ DIRECT DEPENDENCIES (Import modified files)                 │
│ ├── src/api/routes/users.routes.ts                         │
│ ├── src/api/routes/admin.routes.ts                         │
│ ├── src/services/UserService.ts                            │
│ └── ... +5 more files                                       │
│                                                              │
│ INDIRECT DEPENDENCIES (Second-level)                        │
│ ├── src/controllers/UserController.ts                      │
│ ├── src/pages/Profile.tsx                                  │
│ └── ... +12 more files                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Risk Factors

```
┌─────────────────────────────────────────────────────────────┐
│ RISK FACTORS                                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ ⚠ CRITICAL                                                  │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Security Changes                              Score: 9  │  │
│ │ • 4 security-related files affected                    │  │
│ │ • Auth/permission logic being modified                 │  │
│ │ Mitigation: Security audit required                    │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ⚠ HIGH                                                      │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Core Module Changes                           Score: 6  │  │
│ │ • 3 files in /core directory                           │  │
│ │ • Shared utilities being modified                      │  │
│ │ Mitigation: Comprehensive test coverage                │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ ⚠ MEDIUM                                                    │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ High Dependencies                             Score: 4  │  │
│ │ • 28 files depend on changed code                      │  │
│ │ Mitigation: Regression testing                         │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ TOTAL RISK SCORE: 19 (High)                                 │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Blast Radius Graph (--graph)

```
┌─────────────────────────────────────────────────────────────┐
│ BLAST RADIUS VISUALIZATION                                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│                    ┌─────────────┐                          │
│                    │ AuthService │ ◀── Core Change          │
│                    └──────┬──────┘                          │
│                           │                                  │
│          ┌────────────────┼────────────────┐                │
│          ▼                ▼                ▼                │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│   │ UserRoutes │   │ AdminRoutes│   │ ApiRouter  │         │
│   └──────┬─────┘   └──────┬─────┘   └──────┬─────┘         │
│          │                │                │                │
│          ▼                ▼                ▼                │
│   ┌────────────┐   ┌────────────┐   ┌────────────┐         │
│   │ UserCtrl   │   │ AdminCtrl  │   │ ...+5 more │         │
│   └────────────┘   └────────────┘   └────────────┘         │
│                                                              │
│ Legend: ◀── Core │ ──▶ Direct │ - - ▶ Indirect             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Testing Strategy (--test-strategy)

```
┌─────────────────────────────────────────────────────────────┐
│ RECOMMENDED TESTING STRATEGY                                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ UNIT TESTS (Required)                                       │
│ Coverage Target: 90%                                         │
│ Focus Areas:                                                 │
│ • src/auth/AuthService.ts                                   │
│ • src/auth/TokenManager.ts                                  │
│ • src/auth/middleware/*                                     │
│                                                              │
│ INTEGRATION TESTS (Required)                                │
│ Focus Areas:                                                 │
│ • Authentication flow end-to-end                            │
│ • Token refresh mechanism                                   │
│ • Session management                                        │
│                                                              │
│ SECURITY TESTS (Required - Critical Risk)                   │
│ Focus Areas:                                                 │
│ • Token validation                                          │
│ • Permission enforcement                                    │
│ • Brute force protection                                    │
│                                                              │
│ E2E TESTS (Recommended)                                     │
│ Focus Areas:                                                 │
│ • Login/logout flow                                         │
│ • Protected route access                                    │
│                                                              │
│ MANUAL TESTS (Suggested)                                    │
│ • Cross-browser testing                                     │
│ • Mobile authentication                                     │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Recommendations

```
┌─────────────────────────────────────────────────────────────┐
│ RECOMMENDATIONS                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│ Priority 1: Risk Mitigation                                 │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. Security audit before deployment                    │  │
│ │ 2. Code review by security-auditor agent               │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Priority 2: Testing                                         │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. Implement comprehensive regression suite            │  │
│ │ 2. Add security-focused test cases                     │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Priority 3: Process                                         │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ 1. Consider phased rollout                             │  │
│ │ 2. Document changes in ADR                             │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Options

| Option | Description |
|--------|-------------|
| `--detailed` | Show all affected files |
| `--graph` | Generate dependency graph (Mermaid) |
| `--test-strategy` | Get testing recommendations |
| `--json` | Output as JSON |
| `--preview <desc>` | Analyze before creating track |

## Related Commands

- `/maestro:newTrack` - Create new track
- `/maestro:implement` - Implement track
- `/maestro:quality` - Run quality gates

---

## Impact Analysis Protocol

When this command is invoked, follow this protocol:

### Step 1: Load Track Data

```
1. Load track metadata from maestro/tracks/{track-id}/metadata.json
2. Load spec.md for affected areas
3. Load plan.md for task details
4. If --preview: Parse description instead
```

### Step 2: Analyze Dependencies

```
1. Extract affected files from spec/plan
2. For each file:
   a. Find files that import it
   b. Find files it imports
   c. Build dependency graph
3. Calculate transitive dependencies
4. Categorize by layer (core, direct, indirect)
```

### Step 3: Assess Risks

```
1. Check for core module changes
2. Check for security-related files
3. Check for API changes
4. Check for database changes
5. Count dependency depth
6. Calculate risk scores
7. Determine overall risk level
```

### Step 4: Calculate Blast Radius

```
1. Count files in each layer
2. Calculate blast radius score:
   score = core * 1 + direct * 0.5 + indirect * 0.25
3. Generate visualization data
```

### Step 5: Generate Recommendations

```
1. For each high/critical risk:
   - Add specific mitigation
2. Based on blast radius:
   - Suggest testing strategy
3. Generate testing focus areas
4. Add process recommendations
```

### Step 6: Render Output

```
1. Display summary
2. Display affected areas
3. Display risk factors
4. If --graph: Display visualization
5. If --test-strategy: Display testing recommendations
6. Display recommendations
```
