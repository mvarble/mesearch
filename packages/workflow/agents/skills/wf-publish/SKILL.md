---
name: wf-publish
description: Bring {{project}}'s documentation pages up to date with what the active entry built or decided, and link the entry to them; the last stage of {{project}}'s development workflow. Use only when the user invokes /wf-publish.
disable-model-invocation: true
argument-hint: '[pages to start with, or what to change]'
---

# /wf-publish: the pages

The entry is built (or, for a decision, argued).
Now the pages that say what {{project}} _is_ must say it.
The archive discussed what might be; the pages tell what is.

## Before anything

Run `bin/wf status --expect publish`.
If it fails, stop and tell the user what it said.

Read `.agents/reference/mesearch/authoring.md` and `.agents/reference/authoring.md` once per session, the entry's documents, and the code it added, and `.agents/reference/stages/publish.md` if the project has it: which pages an entry of each kind changes, and what else the publish lists.
Read the pages that are affected (the tracks under `{{content}}/`, the landing page) before changing them.

## Writing

- **The pages.**
  Add or rewrite the pages that describe what now exists, quoting the real code with `{path:start..end}` fences, and linking the math notes for the mathematics.
  A choice a reader would wonder about gets a short `> [!DECISION]` linking the entry that made it.
- **Drop what is no longer true.**
  A page describes only what now is.
  What a revised entry built and this one replaced disappears from the pages; it stays in the archive.
- **The entry's `index.md`.**
  Replace its opening paragraph with what the entry did, for a reader of the archive, and list every page it changed under `pages`, with whatever else the project's publish lists.
  `wf approve` refuses a changed page that is not listed, and a listed one the branch did not change.
- **What it amends.**
  Where the entry moved or removed something a done entry's document refers to (a math note's equation, a page, a heading), change that reference in the done entry's document, and list it under `amends` in the entry's `index.md` (`workflow.md`, under "Amending a done entry").
  Change nothing else there.

Build the site (`cd site && pnpm build`) and fix every warning and broken link.
Commit as you go.

When the pages are right, run `bin/wf check` and reply that `/wf-approve` finishes the entry, after which the branch is ready to merge.
Never approve yourself.
