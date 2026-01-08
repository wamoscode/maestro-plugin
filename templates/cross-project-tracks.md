# Cross-Project Tracks

Tracks that span multiple projects within this workspace.

---

## Active Cross-Project Tracks

| ID | Title | Projects | Status | Progress | Updated |
|----|-------|----------|--------|----------|---------|
<!-- Active cross-project tracks will be listed here -->

---

## Completed Cross-Project Tracks

| ID | Title | Projects | Completed | Commits |
|----|-------|----------|-----------|---------|
<!-- Completed cross-project tracks will be listed here -->

---

## Project Participation

Summary of project involvement in cross-project tracks:

| Project | Active | Completed | Total Tasks |
|---------|--------|-----------|-------------|
<!-- Project participation stats will be listed here -->

---

## Quick Reference

### Cross-Project Track Workflow

1. **Create**: `/maestro:newTrack --cross-project "Feature description"`
2. **Assign Projects**: Select which projects are involved
3. **Plan**: Tasks are organized per-project in the plan
4. **Implement**: `/maestro:implement CROSS-XXX --all-projects`
5. **Monitor**: `/maestro:status --cross-project`

### Commit Strategy

Cross-project tracks use the workspace commit strategy:
- **Atomic**: Single coordinated commit across repos
- **Independent**: Separate commits per project
- **Synchronized**: Linked commit messages with cross-references

### Commands

- `/maestro:newTrack --cross-project` - Create cross-project track
- `/maestro:status --cross-project` - View cross-project track status
- `/maestro:implement --all-projects` - Execute across all involved projects
- `/maestro:revert --all-projects` - Revert across all involved projects
