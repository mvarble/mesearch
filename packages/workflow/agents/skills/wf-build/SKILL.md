---
name: wf-build
description: Build the active entry by working through its approved plan, task by task, with a check and a commit per task, in {{project}}'s development workflow. Use only when the user invokes /wf-build.
disable-model-invocation: true
argument-hint: '[a task to start from, or a limit such as "the first three"]'
---

# /wf-build: the build

Work through `plan.md` in order: do each task, check it, tick its box, commit.

## Before anything

Run `bin/wf status --expect build`. If it fails, stop and tell the user what it said.

Read `.agents/reference/mesearch/workflow.md` once per session, the entry's `plan.md` and the
documents it was distilled from, the rules in `AGENTS.md`, and `.agents/reference/stages/build.md`
if the project has it: how a task is checked here, and what else a build does.

## Each task

1. Do exactly what the task says. Details it leaves open (private helpers, local names, the order
   of statements) are yours to decide.
2. Check it as the task and the project's build steps say. Do not move on with anything failing.
   A task only the user can do (at a bench, say) is done by them, or with them: say what to run
   and what to expect, and do not tick the box until they report the result.
3. Tick the task's box in `plan.md`; change nothing else in the plan, since `wf check` refuses any
   other edit to it.
4. Commit, with a message saying what the task added.

Commit often, push when your environment expects it, and report progress between tasks when the
user asked for only some of them.

## When the plan is wrong

If a task cannot be done as planned (an interface does not allow it, a check shows an earlier
document wrong, the plan misses a step), stop. Tell the user what was found and which stage it
belongs to, and suggest `/wf-reopen <stage> <reason>`. Do not deviate from the plan quietly, and
never edit an approved document.

## At the end

When every box is ticked, run the plan's "Done when" checks and `bin/wf check`, and whatever else
the project's build steps ask at the end. Reply that `/wf-approve` moves on. Never approve
yourself.
