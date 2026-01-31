---
name: kb-generate
description: Generate documentation from knowledge (ADR, spec, runbook, guide)
usage: /maestro:kb-generate <type> [options]
aliases: [knowledge-generate, kbgen, generate-docs]
---

# /maestro:kb-generate Command

Generate documentation from captured knowledge. Supports multiple document types including Architecture Decision Records (ADRs), Technical Specifications, Runbooks, and Development Guides.

## Document Types

| Type | Description |
|------|-------------|
| `adr` | Architecture Decision Record |
| `spec` | Technical Specification (RFC-style) |
| `runbook` | Operational procedures with troubleshooting |
| `guide` | Development guide for onboarding |
| `summary` | Regenerate KNOWLEDGE_SUMMARY.md |
| `changelog` | Generate changelog from decisions |

## Usage

```bash
# Generate ADR from a decision
/maestro:kb-generate adr --decision dec_abc123

# Generate ADR from recent conversation
/maestro:kb-generate adr --from-context "API authentication approach"

# Generate technical specification
/maestro:kb-generate spec "Payment Processing System" \
  --entities ent_payment,ent_invoice \
  --decisions dec_stripe

# Generate runbook
/maestro:kb-generate runbook "Deployment" \
  --domain devops

# Generate development guide
/maestro:kb-generate guide "Getting Started with Auth" \
  --patterns pat_jwt,pat_refresh \
  --entities ent_authservice

# Regenerate knowledge summary
/maestro:kb-generate summary

# Generate changelog
/maestro:kb-generate changelog --since 2024-01-01
```

## Options

### Common Options

| Option | Description |
|--------|-------------|
| `--output <path>` | Output file path |
| `--format <fmt>` | Output format: markdown, html, pdf |
| `--include-related` | Include related entries |
| `--verbose` | Include all details |

### ADR Options

| Option | Description |
|--------|-------------|
| `--decision <id>` | Decision ID to generate ADR from |
| `--from-context` | Extract from conversation |
| `--number <n>` | ADR number (auto-assigned if omitted) |
| `--supersedes <id>` | Previous ADR this supersedes |

### Spec Options

| Option | Description |
|--------|-------------|
| `--entities <ids>` | Entity IDs to include |
| `--decisions <ids>` | Decision IDs to reference |
| `--patterns <ids>` | Pattern IDs to reference |
| `--goals <list>` | Non-functional goals |
| `--non-goals <list>` | Explicit non-goals |

### Runbook Options

| Option | Description |
|--------|-------------|
| `--domain <domain>` | Domain to focus on |
| `--blockers` | Include resolved blockers |
| `--procedures <list>` | Specific procedures to document |

### Guide Options

| Option | Description |
|--------|-------------|
| `--patterns <ids>` | Patterns to explain |
| `--entities <ids>` | Entities to document |
| `--audience <level>` | Target: beginner, intermediate, expert |

## Output Formats

### ADR Output

```markdown
# ADR-0015: Use JWT for API Authentication

**Status**: Accepted
**Date**: 2024-01-31
**Decision Makers**: Development Team

## Context

We need to implement authentication for our REST API. The system
must support stateless authentication, be scalable, and work well
with our frontend React application.

## Decision

We will use JWT (JSON Web Tokens) for API authentication with the
following approach:
- Access tokens with 15-minute expiry
- Refresh tokens stored in httpOnly cookies
- Token refresh handled transparently by frontend

## Alternatives Considered

### Session-based Authentication
- **Pros**: Simple, well-understood
- **Cons**: Not stateless, scaling requires session store
- **Rejected**: Doesn't meet stateless requirement

### API Keys Only
- **Pros**: Simple implementation
- **Cons**: Not suitable for user authentication, no expiry
- **Rejected**: Not appropriate for user-facing auth

## Consequences

### Positive
- Stateless authentication enables horizontal scaling
- Industry standard with good library support
- Works well with SPA frontend

### Negative
- Need to handle token refresh logic
- Revocation requires additional infrastructure
- Token size larger than session ID

## Related

- **Patterns**: pat_token_refresh
- **Entities**: ent_authservice
- **Review Date**: 2024-06-01

---
*Generated from Knowledge System*
```

### Technical Specification Output

```markdown
# Technical Specification: Payment Processing System

**Version**: 1.0
**Status**: Draft
**Authors**: Development Team
**Date**: 2024-01-31

## Overview

This document specifies the design and implementation of the
Payment Processing System for handling transactions, refunds,
and invoicing.

## Goals

1. Process payments reliably with retry capability
2. Support multiple payment providers (initial: Stripe)
3. Generate and manage invoices automatically
4. Handle refunds with proper audit trail

## Non-Goals

1. Cryptocurrency payments (future consideration)
2. Subscription billing (separate system)
3. Physical POS integration

## System Design

### Components

#### PaymentService
- **Location**: `src/services/payment/`
- **Responsibilities**:
  - Process payment intents
  - Handle webhooks from Stripe
  - Coordinate with InvoiceService

#### InvoiceService
- **Location**: `src/services/invoice/`
- **Responsibilities**:
  - Generate invoices
  - Track payment status
  - Send invoice emails

### Data Flow

[Diagram would go here]

## Key Decisions

### DEC-012: Use Stripe as Primary Payment Provider
Stripe was chosen for its comprehensive API, excellent
documentation, and built-in fraud protection.

### DEC-013: Implement Idempotency Keys
All payment operations use idempotency keys to prevent
duplicate charges during retries.

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| /payments | POST | Create payment intent |
| /payments/{id} | GET | Get payment status |
| /payments/{id}/refund | POST | Process refund |

## Testing Strategy

- Unit tests for all business logic
- Integration tests with Stripe test mode
- E2E tests for critical payment flows

---
*Generated from Knowledge System*
```

### Runbook Output

```markdown
# Runbook: Deployment Procedures

**Last Updated**: 2024-01-31
**Domain**: DevOps

## Procedures

### Deploy to Production

#### Prerequisites
- [ ] All tests passing
- [ ] Code review approved
- [ ] Staging deployment verified

#### Steps

1. **Create release branch**
   ```bash
   git checkout main
   git pull origin main
   git checkout -b release/v1.2.3
   ```

2. **Run deployment**
   ```bash
   ./deploy.sh production
   ```

3. **Verify deployment**
   - Check health endpoint: `curl https://api.example.com/health`
   - Monitor error rates in dashboard
   - Verify key user flows

### Rollback Procedure

If issues are detected post-deployment:

1. **Immediate rollback**
   ```bash
   ./rollback.sh production
   ```

2. **Notify team** via #incidents channel

3. **Create incident report**

## Troubleshooting

### Issue: High Error Rate After Deploy

**Symptoms**: 5xx errors spike after deployment

**Resolution**:
1. Check application logs for stack traces
2. Verify database migrations completed
3. Check environment variables are set
4. Rollback if not resolved in 15 minutes

*From blocker blk_abc123: Resolved 2024-01-15*

### Issue: Database Connection Failures

**Symptoms**: "Connection refused" errors

**Resolution**:
1. Check database pod status
2. Verify connection string
3. Check connection pool settings
4. Restart application pods if needed

*From blocker blk_def456: Resolved 2024-01-20*

---
*Generated from Knowledge System*
```

## Implementation Protocol

### Step 1: Determine Document Type

```
1. Parse document type from arguments
2. Validate required options for that type
3. Set output path and format
```

### Step 2: Gather Knowledge

```javascript
const KnowledgeStore = require('./skills/knowledge-store');
const store = new KnowledgeStore({ maestroDir: 'maestro' });
const branch = getCurrentGitBranch();

// For ADR
const decision = store.get(options.decision, branch);
const relatedPatterns = store.query({
  type: 'pattern',
  tags: decision.tags
}, branch);

// For Spec
const entities = options.entities.split(',').map(id =>
  store.get(id, branch)
);
const decisions = options.decisions.split(',').map(id =>
  store.get(id, branch)
);

// For Runbook
const blockers = store.query({
  type: 'blocker',
  domain: options.domain,
  fullEntries: true
}, branch);
```

### Step 3: Generate Document

```javascript
const KnowledgeCapture = require('./skills/knowledge-capture');
const capture = new KnowledgeCapture({ maestroDir: 'maestro' });

// Use appropriate formatter
switch (type) {
  case 'adr':
    content = capture.formatADRMarkdown(decision);
    break;
  case 'spec':
    content = generateSpecMarkdown(entities, decisions, options);
    break;
  case 'runbook':
    content = generateRunbookMarkdown(blockers, options);
    break;
  case 'guide':
    content = generateGuideMarkdown(patterns, entities, options);
    break;
  case 'summary':
    return store.generateSummary(branch);
}
```

### Step 4: Write Output

```
1. Determine output path (provided or auto-generate)
2. Write content to file
3. Display confirmation with path
4. Offer to open in editor
```

## Related Commands

- `/maestro:kb-status` - View knowledge statistics
- `/maestro:kb-search` - Search knowledge base
- `/maestro:kb-capture` - Capture knowledge
- `/maestro:cdd` - Activate CDD mode

---

## EXECUTION DIRECTIVE

When `/maestro:kb-generate` is invoked:

1. **ALWAYS** validate that referenced knowledge entries exist
2. **ALWAYS** generate complete, well-formatted documents
3. **ALWAYS** include metadata and generation timestamps
4. **ALWAYS** save output to appropriate location
5. **ALWAYS** display file path after generation

### Quick Reference

| Command | Output |
|---------|--------|
| `kb-generate adr --decision dec_xxx` | `docs/decisions/ADR-NNNN.md` |
| `kb-generate spec "Title"` | `docs/specs/title.md` |
| `kb-generate runbook "Title"` | `docs/runbooks/title.md` |
| `kb-generate guide "Title"` | `docs/guides/title.md` |
| `kb-generate summary` | `maestro/knowledge/KNOWLEDGE_SUMMARY.md` |
