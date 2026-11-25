---
name: wf-start
description: Open a new entry ({{kinds-list}}) on the current branch of {{project}}'s development workflow. Use only when the user invokes /wf-start.
disable-model-invocation: true
argument-hint: '<slug> <{{kinds}}> [what it is about] [revises <slug>]'
---

# /wf-start: open an entry

## Steps

1. Work out the slug (lowercase words joined by hyphens, named after the idea), the kind, a title,
   and any entry it revises from what the user wrote. Ask if the kind is unclear. The kinds, as
   `bin/wf kinds` lists them:

{{kinds-describe}}

2. If the current branch is `main`, make a branch for the entry first (`git switch -c <slug>`),
   unless your environment names the branch to work on.
3. Run `bin/wf start <slug> --kind <kind> --title "<Title>"`, adding `--revises <slug>,...` when
   it changes the story of finished entries. If it refuses, tell the user what it said and stop.
4. Replace the `[!TODO]` in `{{content}}/archive/<slug>/index.md` with a paragraph saying what the
   entry sets out to do and why, from what the user said. Ask for what is missing rather than
   inventing it.
5. Commit the entry folder and `.workflow/active` ("Start <slug>: <title>").
6. Reply with the first stage's skill (`bin/wf status` names it). Do not start that stage until
   the user invokes it.
