---
name: wf-approve
description: Record the user's approval of the active entry's current stage and move it to the next, in {{project}}'s development workflow. Use only when the user invokes /wf-approve; never on your own judgment.
disable-model-invocation: true
argument-hint: ''
---

# /wf-approve: approve the current stage

The user has read the stage's work and accepts it.
Their invoking this skill is the approval; it is never given on their behalf.

## Steps

1. Run `bin/wf status` and say which stage of which entry is being approved.
2. If the stage's document, or anything the stage changed, is uncommitted, show the user what is uncommitted and ask whether to commit it as part of the approval.
   Do not commit work the user has not seen.
3. Run `bin/wf approve`.
   If it refuses, report each problem it lists and stop: the stage is not done.
   Do not fix the problems in the same breath; the user decides what happens next.
4. Commit what `wf` changed (`workflow.json`, the `workflow.json` of every entry it amended, and `.workflow/active` when the entry is finished) as "Approve the <stage> of <slug>".
5. Reply with the next stage and its skill.
   When the entry is done, say so, and that the branch can be merged once `bin/wf check --merge` passes.
