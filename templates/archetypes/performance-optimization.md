# Track Archetype: Performance Optimization

**Type**: Refactor
**Estimated Complexity**: Moderate to Complex
**Typical Phases**: 4
**Typical Tasks**: 8-12

## Description

Use this archetype for performance improvements, including database query optimization, caching implementation, and code profiling.

## Specification Template

### Overview
Optimize {{TARGET_AREA}} to improve {{PERFORMANCE_METRIC}} from {{CURRENT_VALUE}} to {{TARGET_VALUE}}.

### Requirements

#### Performance Goals
- [ ] {{METRIC_1}}: Current {{CURRENT_1}} → Target {{TARGET_1}}
- [ ] {{METRIC_2}}: Current {{CURRENT_2}} → Target {{TARGET_2}}
- [ ] No regression in other metrics
- [ ] Memory usage acceptable

#### Scope
- [ ] {{OPTIMIZATION_AREA_1}}
- [ ] {{OPTIMIZATION_AREA_2}}
- [ ] {{OPTIMIZATION_AREA_3}}

### Acceptance Criteria
- [ ] Performance targets met
- [ ] No functional regressions
- [ ] No increase in error rates
- [ ] Memory usage within bounds
- [ ] Improvements documented

## Plan Template

### Phase 1: Profiling & Analysis
- [ ] Task 1.1: Set up profiling tools
  - Agent: backend-developer
- [ ] Task 1.2: Establish baseline metrics
  - Agent: qa-expert
- [ ] Task 1.3: Identify bottlenecks
  - Agent: backend-developer
- [ ] Task 1.4: Prioritize optimizations
  - Agent: software-architect

### Phase 2: Database Optimization (if applicable)
- [ ] Task 2.1: Analyze slow queries
  - Agent: sql-pro
- [ ] Task 2.2: Add/optimize indexes
  - Agent: sql-pro
- [ ] Task 2.3: Refactor N+1 queries
  - Agent: sql-pro, backend-developer
- [ ] Task 2.4: Implement query caching
  - Agent: backend-developer

### Phase 3: Application Optimization
- [ ] Task 3.1: Implement caching layer
  - Agent: backend-developer
- [ ] Task 3.2: Optimize hot paths
  - Agent: backend-developer
- [ ] Task 3.3: Add lazy loading
  - Agent: backend-developer, frontend-developer
- [ ] Task 3.4: Optimize bundle size (frontend)
  - Agent: frontend-developer

### Phase 4: Validation & Monitoring
- [ ] Task 4.1: Load testing
  - Agent: qa-expert
- [ ] Task 4.2: Compare before/after metrics
  - Agent: qa-expert
- [ ] Task 4.3: Set up performance monitoring
  - Agent: devops-engineer
- [ ] Task 4.4: Document optimizations
  - Agent: documentation-engineer

## Suggested Agents

| Role | Agent |
|------|-------|
| Backend | backend-developer |
| Database | sql-pro |
| Frontend | frontend-developer |
| Testing | qa-expert |
| DevOps | devops-engineer |
| Architecture | software-architect |

## Quality Gates

### Phase Checkpoint
- Profiling complete
- Bottlenecks identified
- Optimizations applied

### Pre-Completion
- Performance targets met
- No regressions
- Load tests pass
- Monitoring in place

## Optimization Strategies

### Database
- [ ] Add indexes for slow queries
- [ ] Use query explain plans
- [ ] Implement connection pooling
- [ ] Consider read replicas
- [ ] Denormalization (if justified)

### Application
- [ ] Implement caching (Redis, in-memory)
- [ ] Use async/parallel processing
- [ ] Optimize serialization
- [ ] Reduce memory allocations
- [ ] Use connection pooling

### Frontend
- [ ] Code splitting
- [ ] Lazy loading
- [ ] Image optimization
- [ ] Bundle analysis
- [ ] Service worker caching

## Metrics to Track

| Metric | Tool |
|--------|------|
| Response time (p50, p95, p99) | APM |
| Database query time | Slow query log |
| Memory usage | Profiler |
| CPU usage | Profiler |
| Cache hit rate | Cache metrics |
| Bundle size | Webpack analyzer |

## Load Testing Scenarios

1. **Baseline**: Normal expected load
2. **Peak**: 2x normal load
3. **Stress**: Find breaking point
4. **Soak**: Sustained load over time

## Common Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Regression | High | Comprehensive testing |
| Over-optimization | Medium | Measure before optimizing |
| Cache invalidation bugs | Medium | Thorough cache testing |
| Memory leaks | High | Long-running tests |

## Documentation Template

### Performance Improvement Report

**Target**: {{TARGET_AREA}}
**Date**: {{DATE}}

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| P95 Response Time | X ms | Y ms | Z% |
| Queries/Request | X | Y | Z% |
| Memory Usage | X MB | Y MB | Z% |

**Optimizations Applied**:
1. {{OPTIMIZATION_1}}
2. {{OPTIMIZATION_2}}

**Trade-offs**:
- {{TRADEOFF_1}}

## Related Archetypes
- database-migration
- caching-implementation
- infrastructure-scaling
