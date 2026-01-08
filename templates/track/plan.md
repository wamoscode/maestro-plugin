# Plan: {{TITLE}}

**Track ID**: {{TRACK_ID}}
**Specification**: [spec.md](./spec.md)
**Workflow**: {{WORKFLOW_TYPE}}
**Status**: Not Started
**Created**: {{CREATED_DATE}}
**Updated**: {{UPDATED_DATE}}

---

## Summary

- **Total Phases**: {{PHASE_COUNT}}
- **Total Tasks**: {{TASK_COUNT}}
- **Estimated Complexity**: {{COMPLEXITY}}

---

## Phase 1: {{PHASE_1_NAME}}

### Overview

{{PHASE_1_DESCRIPTION}}

### Tasks

- [ ] **Task 1.1**: {{TASK_1_1_DESCRIPTION}}
  - **Agent**: {{AGENT_1_1}}
  - **Depends**: none
  - **Commit**: (pending)
  - **Notes**: {{NOTES_1_1}}

- [ ] **Task 1.2**: {{TASK_1_2_DESCRIPTION}}
  - **Agent**: {{AGENT_1_2}}
  - **Depends**: 1.1
  - **Commit**: (pending)

- [ ] **Task 1.3**: {{TASK_1_3_DESCRIPTION}}
  - **Agent**: {{AGENT_1_3}}
  - **Depends**: 1.1
  - **Commit**: (pending)

### Phase 1 Checkpoint

- [ ] All Phase 1 tasks complete
- [ ] Tests passing
- [ ] Code reviewed
- [ ] Ready for Phase 2

---

## Phase 2: {{PHASE_2_NAME}}

### Overview

{{PHASE_2_DESCRIPTION}}

### Tasks

- [ ] **Task 2.1**: {{TASK_2_1_DESCRIPTION}}
  - **Agent**: {{AGENT_2_1}}
  - **Depends**: Phase 1
  - **Commit**: (pending)

- [ ] **Task 2.2**: {{TASK_2_2_DESCRIPTION}}
  - **Agent**: {{AGENT_2_2}}
  - **Depends**: 2.1
  - **Commit**: (pending)

- [ ] **Task 2.3**: {{TASK_2_3_DESCRIPTION}}
  - **Agent**: {{AGENT_2_3}}, {{AGENT_2_3_SECONDARY}}
  - **Depends**: 2.1, 2.2
  - **Parallel**: true
  - **Commit**: (pending)

### Phase 2 Checkpoint

- [ ] All Phase 2 tasks complete
- [ ] Integration tests passing
- [ ] Security review complete (if applicable)
- [ ] Ready for Phase 3

---

## Phase 3: {{PHASE_3_NAME}}

### Overview

{{PHASE_3_DESCRIPTION}}

### Tasks

- [ ] **Task 3.1**: {{TASK_3_1_DESCRIPTION}}
  - **Agent**: {{AGENT_3_1}}
  - **Depends**: Phase 2
  - **Commit**: (pending)

- [ ] **Task 3.2**: {{TASK_3_2_DESCRIPTION}}
  - **Agent**: {{AGENT_3_2}}
  - **Depends**: 3.1
  - **Commit**: (pending)

### Phase 3 Checkpoint

- [ ] All Phase 3 tasks complete
- [ ] End-to-end tests passing
- [ ] Documentation updated

---

## Completion Checklist

Before marking this track complete:

- [ ] All tasks marked [x]
- [ ] All tests passing
- [ ] Code coverage meets target ({{COVERAGE_TARGET}}%)
- [ ] No linting errors
- [ ] No type errors
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Security considerations addressed
- [ ] Ready for deployment

---

## Progress Log

| Date | Task | Status | Notes |
|------|------|--------|-------|
| {{DATE}} | Track created | Started | Initial plan generated |

---

## Agent Assignments Summary

| Agent | Tasks |
|-------|-------|
| {{AGENT_1}} | 1.1, 2.1 |
| {{AGENT_2}} | 1.2, 2.2 |
| {{AGENT_3}} | 1.3, 2.3, 3.1 |

---

## Notes

{{ADDITIONAL_NOTES}}
