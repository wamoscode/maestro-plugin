# Workflow: Agile Development

## Core Principles

1. **The Plan is the Source of Truth**: All work must be tracked in `plan.md`
2. **Working Software Over Documentation**: Prioritize functional code
3. **Iterative Delivery**: Deliver value in small increments
4. **Continuous Feedback**: Verify with stakeholders frequently
5. **Embrace Change**: Adapt plan as requirements evolve
6. **Sustainable Pace**: Maintain consistent progress

## Task Lifecycle

Each task follows these sequential steps:

### Step 1: Selection & Planning

- Select next task from `plan.md` based on priority
- Update status from `[ ]` to `[~]` (in progress)
- Break down into sub-tasks if complex (>2 hours estimated)
- Identify dependencies and blockers

### Step 2: Implementation

- Focus on delivering working functionality
- Write tests alongside code (not strictly before)
- Keep commits small and focused
- Commit frequently with clear messages

### Step 3: Testing

- Write unit tests for new functionality
- Run existing test suite
- Fix any regressions immediately
- Target reasonable coverage (>70%)

### Step 4: Review & Refine

- Self-review code changes
- Refactor obvious improvements
- Ensure code follows project style guide
- Update documentation as needed

### Step 5: Completion

- Run full test suite
- Verify no linting/type errors
- Update task status to `[x]`
- Record commit SHA in `plan.md`

### Step 6: Demo (Optional)

For user-facing features:

- Prepare brief demonstration
- Document how to test the feature
- Note any known limitations

## Sprint Checkpoints

At the end of each phase:

- [ ] All committed tasks complete
- [ ] Tests passing
- [ ] No critical bugs
- [ ] Demo-ready state achieved
- [ ] Retrospective notes added

## Quality Standards

Minimum requirements for task completion:

- [ ] Feature works as specified
- [ ] Tests exist and pass
- [ ] No breaking changes to existing features
- [ ] Code is readable and maintainable

## Commit Message Format

```
<type>: <short description>

- Detail 1
- Detail 2

Closes: #<issue> (if applicable)
```

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `style`, `chore`

## Handling Blockers

When blocked:

1. Document the blocker in plan.md
2. Notify via status update
3. Move to next unblocked task
4. Return when blocker resolved

## Agent Collaboration

- Agents work on tasks matching their expertise
- Hand off between agents at natural boundaries
- Shared context maintained in track files
- Orchestrator coordinates complex multi-agent work
