---
name: wf-plan
description: Write or revise the plan of the active entry, a checklist the build works through in order, in {{project}}'s development workflow. Use only when the user invokes /wf-plan.
disable-model-invocation: true
argument-hint: '[what to change]'
---

# /wf-plan: the plan

What will be done, in order, and how anyone will know it worked: a checklist that the build works
through task by task. Whatever the plan rests on is already decided, in an earlier stage or in a
decision entry; a choice that is expensive to reverse does not belong buried in a task.

## Before anything

Run `bin/wf status --expect plan`. If it fails, stop and tell the user what it said.

Read `.agents/reference/mesearch/workflow.md` once per session, the entry's `index.md`, and
`.agents/reference/stages/plan.md` if the project has it: what this project's plan is distilled
from, what else to read first, and the plan's template. If writing the plan shows a hole in an
earlier stage, stop and suggest `/wf-reopen <stage> <reason>` rather than deciding it here.

## Writing

`{{content}}/archive/<slug>/plan.md`, in groups of tasks, each a box:

```markdown
---
summary: <one sentence>
---

## <Group>

- [ ] <One task, small enough for one commit, and how to know it is done.>
- [ ] ...

## Done when

<The checks that must pass at the end.>
```

The project's template, where it has one, says what else the plan holds and how a task names its
check.

- Order the tasks so that each builds on finished ones, and what is built works after each.
- A task says what to do, not how: the how is decided in an earlier stage or in the build.

Commit each revision. When the plan is right, reply that `/wf-approve` starts the build. Never
approve yourself.
