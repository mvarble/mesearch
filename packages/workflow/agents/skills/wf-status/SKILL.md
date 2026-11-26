---
name: wf-status
description: Report where the active entry of {{project}}'s development workflow stands and what comes next. Use only when the user invokes /wf-status.
disable-model-invocation: true
argument-hint: ''
---

# /wf-status

1. Run `bin/wf status`, and `bin/wf check` to see whether the branch keeps the rules.
2. Summarize: the entry and its kind, the stage, what has been approved and when (from `workflow.json`), the plan's progress if it has one, any problem `check` found, and the command that comes next.
3. With no active entry, list the entries in the archive with their stages, and say how one is started.
