---
name: wf-reopen
description: Move the active entry back to an earlier stage so its approved document can be revised, recording why, in {{project}}'s development workflow. Use only when the user invokes /wf-reopen.
disable-model-invocation: true
argument-hint: '<stage> <reason>'
---

# /wf-reopen: go back to an earlier stage

## Steps

1. Work out the stage and the reason from what the user wrote; ask for the reason if there is none.
   It is recorded in the entry's history, so make it one plain sentence about what was wrong.
2. Run `bin/wf reopen <stage> --reason "<reason>"`.
   If it refuses, tell the user what it said and stop.
3. In the reopened stage's document, add (or extend) a `## Revisions` section at its end with a dated paragraph: what is being changed, and why.
   Fill in what actually changed as the revision is made.
4. Commit `workflow.json` and the document ("Reopen the <stage> of <slug>: <reason>").
5. Reply with the reopened stage's skill.
   Every later stage will be approved again on the way forward.
