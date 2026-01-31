---
name: kb-capture
description: Manually capture knowledge (decisions, patterns, entities, TODOs) from conversation
usage: /maestro:kb-capture <type> [options]
aliases: [knowledge-capture, kbcapture, capture]
---

# /maestro:kb-capture Command

Manually capture knowledge from the current conversation into the Knowledge System. Use this to explicitly record important decisions, discovered patterns, tracked entities, or TODO items.

## What It Captures

1. **Decisions** - Architectural and technical decisions with rationale
2. **Patterns** - Reusable solutions to common problems
3. **Entities** - Key components, services, modules, and APIs
4. **TODOs** - Future work items with priority
5. **Blockers** - Issues encountered and their resolutions
6. **Research** - Findings from investigation or exploration

## Usage

```bash
# Capture a decision (interactive)
/maestro:kb-capture decision

# Capture with inline content
/maestro:kb-capture decision "Use PostgreSQL for data storage" \
  --rationale "Better support for JSON and full-text search" \
  --domain database

# Capture a pattern
/maestro:kb-capture pattern "Repository Pattern" \
  --problem "Need to abstract data access" \
  --solution "Implement repository interface with concrete implementations"

# Capture an entity
/maestro:kb-capture entity "UserService" \
  --type service \
  --location "src/services/user/" \
  --description "Handles user CRUD and authentication"

# Capture a TODO
/maestro:kb-capture todo "Add rate limiting to API" \
  --priority high \
  --domain backend

# Capture from conversation context
/maestro:kb-capture decision --from-context
```

## Options

### Common Options

| Option | Description |
|--------|-------------|
| `--domain <domain>` | Knowledge domain (frontend, backend, database, etc.) |
| `--tags <tags>` | Comma-separated tags |
| `--confidence <n>` | Confidence level (0.0-1.0, default: 0.8) |
| `--track <id>` | Associate with a track |
| `--from-context` | Extract from recent conversation |

### Decision Options

| Option | Description |
|--------|-------------|
| `--rationale <text>` | Reason for the decision |
| `--alternatives <list>` | Considered alternatives |
| `--consequences <list>` | Expected consequences |
| `--review-date <date>` | When to review this decision |
| `--review-reason <text>` | Why review is needed |

### Pattern Options

| Option | Description |
|--------|-------------|
| `--problem <text>` | Problem being solved |
| `--solution <text>` | The pattern solution |
| `--use-cases <list>` | When to use this pattern |
| `--tradeoffs <list>` | Trade-offs to consider |
| `--code <snippet>` | Example code |

### Entity Options

| Option | Description |
|--------|-------------|
| `--type <type>` | Entity type: service, component, module, api, database |
| `--location <path>` | File/directory location |
| `--description <text>` | What this entity does |
| `--responsibilities <list>` | Key responsibilities |
| `--dependencies <list>` | What it depends on |

### TODO Options

| Option | Description |
|--------|-------------|
| `--priority <level>` | Priority: high, medium, low |
| `--due-date <date>` | When it's due |
| `--description <text>` | Detailed description |
| `--acceptance <list>` | Acceptance criteria |

## Interactive Mode

When invoked without inline content, enters interactive mode:

```
══════════════════════════════════════════════════════════
  KNOWLEDGE CAPTURE: DECISION
══════════════════════════════════════════════════════════

What decision was made?
> Use JWT tokens for API authentication

What was the rationale?
> Better support for stateless scaling, industry standard,
> good library support in both frontend and backend

What alternatives were considered?
> 1. Session-based auth (rejected: not stateless)
> 2. API keys (rejected: not suitable for user auth)
> 3. OAuth only (rejected: over-complex for our needs)

What domain does this relate to?
> security

Tags (comma-separated)?
> jwt, auth, api, security

Should this decision be reviewed later? (y/n)
> y

Review date (YYYY-MM-DD)?
> 2024-06-01

Review reason?
> Re-evaluate if token refresh approach is working well

──────────────────────────────────────────────────────────
  CAPTURED
──────────────────────────────────────────────────────────

Decision: Use JWT tokens for API authentication
ID: dec_lq8n5_d6g0e5f4
Confidence: 0.85
Domain: security
Tags: jwt, auth, api, security
Review Date: 2024-06-01

✓ Saved to knowledge store
✓ Summary regenerated

══════════════════════════════════════════════════════════
```

## Capture Examples

### Decision with Full Details

```bash
/maestro:kb-capture decision "Adopt TypeScript strict mode" \
  --rationale "Catches more bugs at compile time, improves IDE support" \
  --alternatives "JavaScript with JSDoc, Flow" \
  --consequences "Steeper learning curve, longer initial development" \
  --domain frontend \
  --tags typescript,tooling \
  --review-date 2024-03-01 \
  --review-reason "Evaluate developer experience after 2 months"
```

### Pattern with Code Example

```bash
/maestro:kb-capture pattern "Error Boundary Pattern" \
  --problem "Need to gracefully handle React component errors" \
  --solution "Wrap components in ErrorBoundary with fallback UI" \
  --domain frontend \
  --tags react,error-handling \
  --code "class ErrorBoundary extends React.Component { ... }"
```

### Entity for a Service

```bash
/maestro:kb-capture entity "PaymentService" \
  --type service \
  --location "src/services/payment/" \
  --description "Handles payment processing, refunds, and invoicing" \
  --responsibilities "Process payments,Handle refunds,Generate invoices" \
  --dependencies "StripeAPI,UserService,InvoiceRepository" \
  --domain backend \
  --tags payments,stripe
```

### High-Priority TODO

```bash
/maestro:kb-capture todo "Implement rate limiting for API endpoints" \
  --priority high \
  --due-date 2024-02-15 \
  --description "Add rate limiting to prevent abuse and ensure fair usage" \
  --acceptance "100 req/min per user,Return 429 on exceed,Include retry-after header" \
  --domain backend \
  --tags security,api
```

## Implementation Protocol

### Step 1: Determine Capture Mode

```
If inline content provided:
  - Parse command arguments
  - Validate required fields for type
  - Fill defaults
Else:
  - Enter interactive mode
  - Prompt for required fields
  - Validate input
```

### Step 2: Build Knowledge Entry

```javascript
const KnowledgeCapture = require('./skills/knowledge-capture');
const capture = new KnowledgeCapture({ maestroDir: 'maestro' });

// For decisions
const result = capture.captureDecisionRealtime({
  title: decisionTitle,
  rationale: options.rationale,
  alternatives: parseList(options.alternatives),
  consequences: parseList(options.consequences),
  domain: options.domain,
  tags: parseTags(options.tags),
  confidence: options.confidence || 0.8,
  reviewDate: options.reviewDate,
  reviewReason: options.reviewReason,
  trackId: options.track
});

// For entities
const entityResult = capture.captureEntity({
  name: entityName,
  entityType: options.type,
  location: options.location,
  description: options.description,
  responsibilities: parseList(options.responsibilities),
  dependencies: parseList(options.dependencies),
  domain: options.domain,
  tags: parseTags(options.tags)
});

// For TODOs
const todoResult = capture.captureTodo({
  title: todoTitle,
  priority: options.priority || 'medium',
  description: options.description,
  dueDate: options.dueDate,
  acceptanceCriteria: parseList(options.acceptance),
  domain: options.domain,
  tags: parseTags(options.tags)
});
```

### Step 3: Save to Knowledge Store

```javascript
const KnowledgeStore = require('./skills/knowledge-store');
const store = new KnowledgeStore({ maestroDir: 'maestro' });

const branch = getCurrentGitBranch();
const saveResult = store.save(entry, branch);

// Regenerate summary
if (saveResult.success) {
  store.generateSummary(branch);
}
```

### Step 4: Confirm and Display

```
1. Display captured entry summary
2. Show assigned ID
3. Confirm save success
4. Indicate if summary was regenerated
```

## Related Commands

- `/maestro:kb-status` - View knowledge statistics
- `/maestro:kb-search` - Search knowledge base
- `/maestro:kb-generate` - Generate documentation
- `/maestro:cdd` - Activate CDD mode (auto-capture)

---

## EXECUTION DIRECTIVE

When `/maestro:kb-capture` is invoked:

1. **ALWAYS** validate required fields for the capture type
2. **ALWAYS** assign appropriate IDs and timestamps
3. **ALWAYS** save to the knowledge store
4. **ALWAYS** display confirmation with the entry ID
5. **ALWAYS** regenerate summary after successful capture

### Type Requirements

| Type | Required Fields |
|------|-----------------|
| decision | title, (rationale recommended) |
| pattern | name, problem, solution |
| entity | name, entityType |
| todo | title |
| blocker | issue |
| research | finding |
