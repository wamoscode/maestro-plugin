# Workflow: Minimal

## Core Principles

1. **Track Progress**: Update `plan.md` as you work
2. **Keep It Simple**: Do what's needed, nothing more
3. **Ship Fast**: Prioritize working code over perfection
4. **Fix Forward**: Address issues as they arise

## Task Lifecycle

### Step 1: Start Task

- Pick next task from `plan.md`
- Mark as `[~]` in progress

### Step 2: Implement

- Write the code
- Test manually or with basic tests
- Commit when working

### Step 3: Complete

- Mark as `[x]` complete
- Note commit SHA
- Move to next task

## Quality Basics

Before completing a task:

- [ ] It works
- [ ] It doesn't break existing features
- [ ] Code is reasonably clean

## Commit Format

```
<type>: <what you did>
```

Types: `feat`, `fix`, `docs`, `chore`

## Notes

- Add tests when time permits
- Refactor when code becomes hard to work with
- Document complex logic inline
