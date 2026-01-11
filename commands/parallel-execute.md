---
name: parallel-execute
description: Execute multiple sub-agents in parallel for independent tasks
usage: /parallel-execute <agent1>:<task1> <agent2>:<task2> ...
aliases: [parallel, pexec]
---

# /parallel-execute Command

Execute multiple sub-agents simultaneously for independent, non-conflicting tasks.

## CRITICAL: Parallel Task Tool Invocation Required

**ALL parallel executions MUST use multiple concurrent Task tool calls.**

When executing this command:

1. **EVERY agent** specified must be invoked via separate Task tool call
2. **ALL Task calls** must be made in a SINGLE message (true parallel execution)
3. **NEVER** execute agents sequentially when parallel is requested
4. **ALWAYS** use `subagent_type` parameter for each Task call

```text
/parallel-execute frontend-developer:"Build UI" backend-developer:"Build API"

Execution (SINGLE message with multiple Task tool calls):
- Task tool → subagent_type="frontend-developer", prompt="Build UI"
- Task tool → subagent_type="backend-developer", prompt="Build API"
```

## Invocation

```
/parallel-execute <agent1>:<task1> <agent2>:<task2> [<agent3>:<task3> ...]
```

## Examples

```bash
# Run frontend and backend development in parallel
/parallel-execute \
  frontend-developer:"Build React components for user dashboard" \
  backend-developer:"Create API endpoints for user data"

# Run multiple quality checks simultaneously
/parallel-execute \
  security-auditor:"Scan for vulnerabilities" \
  code-reviewer:"Review code quality" \
  qa-expert:"Analyze test coverage"

# Research and implementation in parallel
/parallel-execute \
  research-analyst:"Research best practices for authentication" \
  documentation-engineer:"Draft API documentation template"
```

## Behavior

1. **Validation**
   - Verify all specified agents exist
   - Check for resource conflicts
   - Validate task assignments

2. **Isolation**
   - Create isolated execution contexts
   - Prevent cross-contamination of state
   - Manage shared resources safely

3. **Execution**
   - Launch all agents simultaneously
   - Monitor progress independently
   - Handle failures individually

4. **Aggregation**
   - Collect results from all agents
   - Merge outputs coherently
   - Report individual and overall status

## Options

| Option | Description | Default |
|--------|-------------|---------|
| `--max-concurrent` | Maximum parallel agents | 5 |
| `--timeout` | Per-agent timeout (ms) | 300000 |
| `--fail-fast` | Stop all on first failure | false |
| `--merge-results` | Combine outputs | true |
| `--verbose` | Show detailed progress | false |

## Output Format

```markdown
## Parallel Execution Results

### Execution Summary
| Agent | Task | Status | Duration |
|-------|------|--------|----------|
| frontend-developer | Build React components | ✓ Complete | 45s |
| backend-developer | Create API endpoints | ✓ Complete | 38s |

### Individual Results

#### frontend-developer
[Output from frontend agent]

#### backend-developer
[Output from backend agent]

### Merged Output
[Combined, coherent results if applicable]
```

## Conflict Detection

The system automatically detects potential conflicts:

- **File conflicts**: Multiple agents writing to same file
- **Resource conflicts**: Competing for same external resources
- **Logical conflicts**: Contradictory changes

When conflicts are detected:
```
⚠️ Conflict Warning: Both agents may modify src/api/users.ts
   - Switch to sequential execution
   - Or specify conflict resolution strategy
```

## Best Practices

1. **Independent tasks only**: Ensure tasks don't depend on each other
2. **Different files**: Prefer tasks that touch different parts of codebase
3. **Clear boundaries**: Define precise scope for each agent
4. **Monitor resources**: Don't overload with too many parallel agents

## Related Commands

- `/conduct` - Automatic orchestration with dependency detection
- `/workflow` - Define multi-step workflows
- `/agent-info` - Get agent capabilities
