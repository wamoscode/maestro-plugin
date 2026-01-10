# Track Archetype: Third-Party Integration

**Type**: Feature
**Estimated Complexity**: Complex
**Typical Phases**: 4
**Typical Tasks**: 10-15

## Description

Use this archetype when integrating with external services, APIs, or third-party systems. Emphasizes error handling, resilience, and abstraction.

## Specification Template

### Overview
Integrate with {{SERVICE_NAME}} to enable {{INTEGRATION_PURPOSE}}.

### Requirements

#### Functional Requirements
- [ ] Connect to {{SERVICE_NAME}} API
- [ ] Authenticate with service
- [ ] Implement {{OPERATION_1}}
- [ ] Implement {{OPERATION_2}}
- [ ] Handle webhooks (if applicable)
- [ ] Data synchronization (if applicable)

#### Non-Functional Requirements
- [ ] Retry logic for transient failures
- [ ] Circuit breaker pattern implemented
- [ ] Rate limiting respected
- [ ] Credentials stored securely
- [ ] Audit logging for external calls
- [ ] Timeout handling

### Acceptance Criteria
- [ ] All required operations work correctly
- [ ] Error handling covers all failure modes
- [ ] Retries work as expected
- [ ] Circuit breaker triggers appropriately
- [ ] Integration tests pass against sandbox
- [ ] Documentation complete

## Plan Template

### Phase 1: Research & Design
- [ ] Task 1.1: Review API documentation
  - Agent: api-designer
- [ ] Task 1.2: Design integration architecture
  - Agent: software-architect
- [ ] Task 1.3: Define abstraction layer
  - Agent: software-architect
- [ ] Task 1.4: Obtain API credentials
  - Agent: devops-engineer

### Phase 2: Core Implementation
- [ ] Task 2.1: Implement API client
  - Agent: backend-developer
- [ ] Task 2.2: Add authentication
  - Agent: backend-developer
- [ ] Task 2.3: Implement core operations
  - Agent: backend-developer
- [ ] Task 2.4: Add error handling
  - Agent: backend-developer
- [ ] Task 2.5: Implement retry logic
  - Agent: backend-developer

### Phase 3: Resilience & Monitoring
- [ ] Task 3.1: Add circuit breaker
  - Agent: backend-developer
- [ ] Task 3.2: Implement rate limiting
  - Agent: backend-developer
- [ ] Task 3.3: Add logging and metrics
  - Agent: backend-developer
- [ ] Task 3.4: Set up monitoring alerts
  - Agent: devops-engineer

### Phase 4: Testing & Documentation
- [ ] Task 4.1: Unit tests with mocks
  - Agent: qa-expert
- [ ] Task 4.2: Integration tests (sandbox)
  - Agent: qa-expert
- [ ] Task 4.3: Failure mode testing
  - Agent: qa-expert
- [ ] Task 4.4: Documentation
  - Agent: documentation-engineer

## Suggested Agents

| Role | Agent |
|------|-------|
| Primary | backend-developer |
| Architecture | software-architect |
| API Design | api-designer |
| DevOps | devops-engineer |
| Testing | qa-expert |

## Quality Gates

### Phase Checkpoint
- Core operations work
- Error handling implemented
- Tests pass

### Pre-Completion
- All operations tested
- Resilience patterns verified
- Monitoring in place
- Documentation complete

## Integration Patterns

### HTTP Client Pattern
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Your Code  │────▶│   Client    │────▶│  External   │
│             │     │   Wrapper   │     │    API      │
└─────────────┘     └─────────────┘     └─────────────┘
                         │
                    ┌────┴────┐
                    │ Retry   │
                    │ Circuit │
                    │ Logging │
                    └─────────┘
```

### Abstraction Layer
- Interface for integration operations
- Allows swapping implementations
- Facilitates testing with mocks

## Resilience Checklist

- [ ] Timeouts configured
- [ ] Retry with exponential backoff
- [ ] Circuit breaker implemented
- [ ] Fallback behavior defined
- [ ] Rate limiting handled
- [ ] Graceful degradation

## Common Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| API changes | High | Abstract behind interface |
| Rate limiting | Medium | Implement backoff |
| Downtime | Medium | Circuit breaker, fallbacks |
| Credential leak | Critical | Secure storage, rotation |
| Data inconsistency | High | Idempotency, reconciliation |

## Monitoring & Alerting

### Key Metrics
- Request latency
- Error rate
- Circuit breaker state
- Rate limit remaining

### Alerts
- Error rate > threshold
- Circuit breaker open
- Latency degradation
- Rate limit approaching

## Related Archetypes
- api-endpoint
- webhook-handler
- data-sync
