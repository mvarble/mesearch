---
name: wf-abandon
description: Set the active entry aside, keeping its documents in the archive, in {{project}}'s development workflow. Use only when the user invokes /wf-abandon.
disable-model-invocation: true
argument-hint: '<reason>'
---

# /wf-abandon: set an entry aside

## Steps

1. Get the reason from the user if they gave none: it is shown in the archive.
2. Commit any work on the entry's documents the user wants kept; uncommitted drafts of code
   should be discarded or committed only if the user says so.
3. Run `bin/wf abandon --reason "<reason>"`.
4. Commit what it changed ("Set <slug> aside: <reason>").
5. Reply that the entry's documents stay in the archive, and that `/wf-resume <slug>` takes it up
   again on any branch.
