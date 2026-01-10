# Track Archetype: Database Migration

**Type**: Chore / Feature
**Estimated Complexity**: Moderate to Complex
**Typical Phases**: 3
**Typical Tasks**: 6-10

## Description

Use this archetype for database schema changes, data migrations, or database refactoring. Emphasizes reversibility, data integrity, and zero-downtime deployment.

## Specification Template

### Overview
Migrate database to {{MIGRATION_GOAL}} to support {{FEATURE_REASON}}.

### Requirements

#### Schema Changes
- [ ] {{TABLE_CHANGE_1}}
- [ ] {{TABLE_CHANGE_2}}
- [ ] {{INDEX_CHANGES}}
- [ ] {{CONSTRAINT_CHANGES}}

#### Data Migration
- [ ] Existing data preserved
- [ ] Data transformation logic defined
- [ ] Orphaned data handled
- [ ] Default values for new columns specified

#### Non-Functional Requirements
- [ ] Migration reversible
- [ ] Zero-downtime deployment possible
- [ ] Performance impact assessed
- [ ] Backup strategy defined

### Acceptance Criteria
- [ ] Migration runs successfully on test data
- [ ] Rollback tested and works
- [ ] Application works with new schema
- [ ] No data loss
- [ ] Performance acceptable

## Plan Template

### Phase 1: Design & Planning
- [ ] Task 1.1: Design new schema
  - Agent: sql-pro
- [ ] Task 1.2: Plan migration steps
  - Agent: sql-pro
- [ ] Task 1.3: Create rollback plan
  - Agent: sql-pro
- [ ] Task 1.4: Assess performance impact
  - Agent: sql-pro

### Phase 2: Implementation
- [ ] Task 2.1: Write forward migration
  - Agent: sql-pro
- [ ] Task 2.2: Write rollback migration
  - Agent: sql-pro
- [ ] Task 2.3: Write data transformation scripts
  - Agent: sql-pro
- [ ] Task 2.4: Update ORM models
  - Agent: backend-developer

### Phase 3: Testing & Deployment
- [ ] Task 3.1: Test on development database
  - Agent: sql-pro
- [ ] Task 3.2: Test on staging with production-like data
  - Agent: sql-pro, qa-expert
- [ ] Task 3.3: Test rollback
  - Agent: sql-pro
- [ ] Task 3.4: Performance testing
  - Agent: sql-pro
- [ ] Task 3.5: Deploy to production
  - Agent: sql-pro, devops-engineer

## Suggested Agents

| Role | Agent |
|------|-------|
| Primary | sql-pro |
| Backend | backend-developer |
| DevOps | devops-engineer |
| Testing | qa-expert |

## Quality Gates

### Phase Checkpoint
- Migration script syntax valid
- Rollback script tested
- ORM models updated

### Pre-Completion
- Migration tested on production-like data
- Rollback verified
- Performance acceptable
- Backup taken before production deploy

## Migration Checklist

### Before Migration
- [ ] Full database backup taken
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Maintenance window scheduled (if needed)

### During Migration
- [ ] Monitor for errors
- [ ] Track progress
- [ ] Validate intermediate states

### After Migration
- [ ] Verify data integrity
- [ ] Run application tests
- [ ] Monitor performance
- [ ] Confirm rollback still possible

## Common Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss | Critical | Backup, test thoroughly |
| Downtime | High | Use online schema change tools |
| Performance degradation | Medium | Test with production data size |
| Lock contention | Medium | Batch large changes |

## Zero-Downtime Patterns

### Add Column
1. Add nullable column
2. Deploy code that writes to new column
3. Backfill data
4. Add NOT NULL constraint (if needed)

### Remove Column
1. Deploy code that stops using column
2. Remove column

### Rename Column
1. Add new column
2. Deploy code that writes to both
3. Migrate data
4. Deploy code that reads from new
5. Remove old column

## Related Archetypes
- api-endpoint
- data-import
- performance-optimization
