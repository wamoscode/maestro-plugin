# Track Archetype: API Endpoint

**Type**: Feature
**Estimated Complexity**: Moderate
**Typical Phases**: 3
**Typical Tasks**: 6-10

## Description

Use this archetype when implementing new REST or GraphQL API endpoints. Includes proper validation, authentication, error handling, and documentation.

## Specification Template

### Overview
Implement a new API endpoint for {{RESOURCE_NAME}} that supports {{OPERATIONS}}.

### Requirements

#### Functional Requirements
- [ ] Endpoint accepts {{HTTP_METHOD}} requests at {{ENDPOINT_PATH}}
- [ ] Request validation for all input parameters
- [ ] Proper authentication/authorization checks
- [ ] Response follows API conventions
- [ ] Pagination support (if list endpoint)
- [ ] Filtering/sorting support (if applicable)

#### Non-Functional Requirements
- [ ] Response time < 200ms for typical requests
- [ ] Rate limiting configured appropriately
- [ ] Proper error codes and messages
- [ ] API versioning considered

### Acceptance Criteria
- [ ] Endpoint responds correctly for valid requests
- [ ] Invalid requests return appropriate 4xx errors
- [ ] Unauthorized requests return 401/403
- [ ] API documentation updated
- [ ] Integration tests pass

## Plan Template

### Phase 1: Design & Setup
- [ ] Task 1.1: Design request/response schemas
  - Agent: api-designer
- [ ] Task 1.2: Create database migrations (if needed)
  - Agent: sql-pro
- [ ] Task 1.3: Set up route configuration
  - Agent: backend-developer

### Phase 2: Implementation
- [ ] Task 2.1: Implement endpoint logic
  - Agent: backend-developer
- [ ] Task 2.2: Add validation middleware
  - Agent: backend-developer
- [ ] Task 2.3: Implement authentication checks
  - Agent: backend-developer, security-auditor
- [ ] Task 2.4: Add error handling
  - Agent: backend-developer

### Phase 3: Testing & Documentation
- [ ] Task 3.1: Write unit tests
  - Agent: qa-expert
- [ ] Task 3.2: Write integration tests
  - Agent: qa-expert
- [ ] Task 3.3: Update API documentation
  - Agent: documentation-engineer
- [ ] Task 3.4: Security review
  - Agent: security-auditor

## Suggested Agents

| Role | Agent |
|------|-------|
| Primary | backend-developer |
| Design | api-designer |
| Database | sql-pro |
| Security | security-auditor |
| Testing | qa-expert |
| Docs | documentation-engineer |

## Quality Gates

### Phase Checkpoint
- Linting passes
- Type checks pass
- Unit tests pass

### Pre-Completion
- Integration tests pass
- Security scan passes
- API documentation complete
- Code coverage > 80%

## Common Risks

| Risk | Mitigation |
|------|------------|
| Breaking changes | Version the API |
| Performance issues | Load test before release |
| Security vulnerabilities | Security audit |
| Missing edge cases | Thorough test coverage |

## Related Archetypes
- database-migration
- authentication-feature
- api-integration
