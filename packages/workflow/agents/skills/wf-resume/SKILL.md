---
name: wf-resume
description: Take up an abandoned entry again at the stage it was left, in {{project}}'s development workflow. Use only when the user invokes /wf-resume.
disable-model-invocation: true
argument-hint: '<slug>'
---

# /wf-resume: take an entry up again

## Steps

1. If the current branch is `main`, make a branch first (`git switch -c <slug>`), unless your
   environment names the branch to work on.
2. Run `bin/wf resume <slug>`. If it refuses, tell the user what it said and stop.
3. Commit `workflow.json` and `.workflow/active` ("Resume <slug>").
4. Read the entry's documents, then reply with where it stands and the stage's skill.
