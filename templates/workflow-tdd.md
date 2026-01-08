# Workflow: Test-Driven Development (TDD)

## Core Principles

1. **The Plan is the Source of Truth**: All work must be tracked in `plan.md`
2. **Red-Green-Refactor**: Write failing tests before implementation
3. **Small Iterations**: Complete one task fully before moving to the next
4. **Continuous Verification**: Run tests after every change
5. **Documentation as Code**: Keep docs updated with implementation
6. **Deliberate Technology Decisions**: Document all tech choices in `tech-stack.md`

## Task Lifecycle

Each task follows these sequential steps:

### Step 1: Selection & Status

- Select the next incomplete task from `plan.md`
- Update status from `[ ]` to `[~]` (in progress)
- Read related specification from `spec.md`

### Step 2: Write Failing Tests (Red Phase)

- Create test file if it doesn't exist
- Write tests that define expected behavior
- Run tests to confirm they fail
- Commit: `test: add failing tests for <task>`

### Step 3: Implementation (Green Phase)

- Write minimum code to pass tests
- Focus on functionality, not perfection
- Run tests frequently
- Commit: `feat: implement <task>`

### Step 4: Refactoring

- Improve code quality while keeping tests green
- Remove duplication
- Improve naming and structure
- Commit: `refactor: clean up <task>`

### Step 5: Coverage Verification

- Target: >80% code coverage
- Run coverage report
- Add tests for uncovered paths if needed

### Step 6: Documentation

- Update inline comments where logic is complex
- Update API documentation if applicable
- Update README if user-facing changes

### Step 7: Commit & Record

- Stage all changes
- Create descriptive commit message
- Record commit SHA in `plan.md`
- Update task status to `[x]` (complete)

### Step 8: Phase Checkpoint (if applicable)

When completing a phase, verify:

- [ ] All phase tasks marked complete
- [ ] All tests passing
- [ ] Coverage target met
- [ ] No linting errors
- [ ] Documentation updated
- [ ] Commit message includes phase summary

## Quality Gates

Before marking any task complete:

- [ ] Tests pass
- [ ] Coverage >= 80%
- [ ] No linting errors
- [ ] No type errors
- [ ] Code reviewed (self or peer)

## Commit Message Format

```
<type>: <description>

[optional body]

Task: <task-id>
Track: <track-id>
```

Types: `feat`, `fix`, `test`, `refactor`, `docs`, `chore`

## Agent Collaboration

When a task requires multiple agents:

1. Primary agent leads implementation
2. Secondary agents provide specialized input
3. qa-expert validates at completion
4. code-reviewer performs final review
