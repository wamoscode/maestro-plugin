# Track Archetype: Authentication Feature

**Type**: Feature
**Estimated Complexity**: Complex
**Typical Phases**: 4
**Typical Tasks**: 12-18

## Description

Use this archetype for implementing authentication or authorization features. Security-focused with comprehensive testing requirements.

## Specification Template

### Overview
Implement {{AUTH_FEATURE_NAME}} to enable {{AUTH_CAPABILITY}}.

### Requirements

#### Functional Requirements
- [ ] User can {{AUTH_ACTION}}
- [ ] Session/token management implemented
- [ ] Proper credential handling
- [ ] Password policies enforced (if applicable)
- [ ] Multi-factor support (if applicable)
- [ ] Logout/session invalidation works correctly

#### Non-Functional Requirements
- [ ] Passwords hashed with secure algorithm (bcrypt/argon2)
- [ ] Tokens signed and have appropriate expiry
- [ ] Brute force protection implemented
- [ ] Audit logging for auth events
- [ ] OWASP authentication guidelines followed

### Acceptance Criteria
- [ ] Authentication flow works end-to-end
- [ ] Invalid credentials rejected properly
- [ ] Sessions expire correctly
- [ ] Password reset flow works (if applicable)
- [ ] Security audit passed
- [ ] No sensitive data in logs

## Plan Template

### Phase 1: Security Design
- [ ] Task 1.1: Design authentication flow
  - Agent: security-auditor, software-architect
- [ ] Task 1.2: Define token/session strategy
  - Agent: security-auditor
- [ ] Task 1.3: Review against OWASP guidelines
  - Agent: security-auditor

### Phase 2: Backend Implementation
- [ ] Task 2.1: Implement credential storage
  - Agent: backend-developer, security-auditor
- [ ] Task 2.2: Implement token generation/validation
  - Agent: backend-developer
- [ ] Task 2.3: Create authentication middleware
  - Agent: backend-developer
- [ ] Task 2.4: Add rate limiting
  - Agent: backend-developer
- [ ] Task 2.5: Implement audit logging
  - Agent: backend-developer

### Phase 3: Frontend Implementation
- [ ] Task 3.1: Create login UI
  - Agent: frontend-developer
- [ ] Task 3.2: Implement token storage
  - Agent: frontend-developer, security-auditor
- [ ] Task 3.3: Add authentication state management
  - Agent: frontend-developer
- [ ] Task 3.4: Implement protected routes
  - Agent: frontend-developer

### Phase 4: Testing & Security Audit
- [ ] Task 4.1: Write unit tests
  - Agent: qa-expert
- [ ] Task 4.2: Write integration tests
  - Agent: qa-expert
- [ ] Task 4.3: Perform security testing
  - Agent: security-auditor
- [ ] Task 4.4: Penetration testing
  - Agent: security-auditor
- [ ] Task 4.5: Documentation
  - Agent: documentation-engineer

## Suggested Agents

| Role | Agent |
|------|-------|
| Primary | backend-developer |
| Security Lead | security-auditor |
| Frontend | frontend-developer |
| Architecture | software-architect |
| Testing | qa-expert |

## Quality Gates

### Phase Checkpoint
- All tests pass
- No security warnings
- Code reviewed

### Pre-Completion (Strict)
- Security audit passed
- Penetration test passed
- No hardcoded secrets
- Audit logging verified
- Code coverage > 90%

## Security Checklist

- [ ] No plaintext passwords anywhere
- [ ] Secure token generation (crypto-random)
- [ ] Proper token expiry
- [ ] HTTPS enforced
- [ ] XSS protection
- [ ] CSRF protection
- [ ] Rate limiting active
- [ ] Failed attempts logged
- [ ] Sensitive data redacted from logs

## Common Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Credential leak | Critical | Secure storage, encryption |
| Session hijacking | Critical | Secure cookies, token rotation |
| Brute force | High | Rate limiting, lockout |
| Token theft | High | Short expiry, secure storage |

## Related Archetypes
- api-endpoint
- user-management
- password-reset
