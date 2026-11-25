# The development workflow

Every change to {{project}}'s code is an **entry** in the archive (`{{content}}/archive/<slug>/`),
worked on in a branch of its own and moved through **stages**. A person approves each stage;
nothing advances by itself. `bin/wf` keeps the record and enforces the rules; the `wf-*` skills
do the work of each stage.

This file is the procedure. `AGENTS.md` says when it applies (only when the user invokes one of
its commands). `authoring.md` and `markup.md` beside this file say how to write the documents,
`.agents/reference/authoring.md` what this project writes differently, and
`.agents/reference/stages/` what this project's stages ask beyond what their skills say.

This file belongs to `@mvarble/mesearch-workflow`, which writes it from `workflow.config.ts`
whenever `mesearch-wf sync` runs. Never edit it here: say what the project does differently in
`AGENTS.md`, or change the workflow upstream.

## Kinds and stages

{{kinds-table}}

Each stage, what it produces, and the skill that works on it:

{{stages-table}}

And the commands that move an entry, all of them the user's to give:

| command                           | `bin/wf`                                   |
| --------------------------------- | ------------------------------------------ |
| `/wf-start <slug> <kind> [about]` | `wf start <slug> --kind <kind> --title ...` |
| `/wf-approve`                     | `wf approve`                               |
| `/wf-reopen <stage> <reason>`     | `wf reopen <stage> --reason ...`           |
| `/wf-abandon <reason>`            | `wf abandon --reason ...`                  |
| `/wf-resume <slug>`               | `wf resume <slug>`                         |
| `/wf-status`                      | `wf status`                                |

`bin/wf kinds` lists the kinds as `workflow.config.ts` defines them.

## What the stages guarantee

`bin/wf check` verifies these on every pull request; `bin/wf guard`, a Claude Code hook in
`.claude/settings.json`, refuses an edit that breaks one before it is made.

1. **One entry per branch.** `.workflow/active` names it. A branch changes the files of one entry
   only, and merges into `main` only once that entry is done or abandoned. What the entry
   [amends](#amending-a-done-entry) in entries that are done is the one exception.
2. **An approved document is frozen.** Its hash is recorded when it is approved, and it may change
   again only after its stage is reopened. A checklist is the exception that proves the rule: its
   boxes are ticked at a later stage, and nothing else in it changes. Once its entry is done, a
   document changes only by an [amendment](#amending-a-done-entry).
3. **Documents come in order.** A stage's document is not written before the stage.
4. **Areas open as the entry advances.** {{areas}}
5. **Approval is a gate, not a formality.** `wf approve` refuses {{gates}}

Anything outside these areas (the workflow's tool, the skills, the site's own code) is not gated.

## Managed files

`mesearch-wf sync` writes the files that belong to `@mvarble/mesearch-workflow` rather than to the
project: `bin/wf` and the engine in `.workflow/engine/`, the skills it ships, this file and the
others in `.agents/reference/mesearch/`, and the documentation site's shared routes and
components. `.workflow/managed.json` lists them with their hashes. `bin/wf guard` refuses an edit
to one, and `bin/wf check` fails when one has changed. A change to one is made upstream, in
`@mvarble/mesearch-workflow`, and comes back with the next `sync`.

## Going back

A stage's work sometimes shows that an earlier stage was wrong. Do not work around it: stop and
tell the user what was found. If they agree, they ask for `/wf-reopen <stage> <reason>`, which
moves the entry back, marks every approval from that stage on as needing renewal, and records the
reason in the entry's history. The reopened document gets a `## Revisions` section saying what
changed and why; each later stage is approved again on the way forward (unchanged, if nothing in
it had to change).

The story is allowed to change. It is not allowed to forget: the history shows every reopening,
and git keeps every draft.

## A finished entry

When `publish` is approved the entry is done, `.workflow/active` is removed, and the branch is
ready to merge. A done entry's argument is never edited again. When {{project}} later changes what
an entry built, a new entry says so with `--revises <slug>`; the site then marks the old entry as
revised, and the pages show both under "How this came to be".

An entry set aside with `/wf-abandon` keeps its documents, approved or not, and can be taken up
again with `/wf-resume`.

## Amending a done entry

The archive's documents refer to what changes after them: math notes and their equations and
statements, pages and their headings, anything else the project keeps current. A reference is
kept true: it follows what moves, and where what it cited is gone, the document says in a few
words what it was. That is the one change a done entry admits. What it claimed, measured and
weighed stays as it was approved.

- Only at its `publish` stage may an entry change another's files, and only a done entry's stage
  documents ({{documents}}) and statements. `bin/wf guard` refuses anything else.
- The entry lists what it changed under `amends` in its `index.md`: a document as
  `archive/<slug>/<stage>`, a statement as `archive/<slug>/statements/<name>`.
- `wf approve` refuses the publish if a done entry's file changed and is not listed, or is listed
  and did not change. On approval it writes the amended document's new hash into the amended
  entry's `workflow.json`, with an `amend` event naming the amending entry. The commit of the
  document's own approval stays in the record, and is where its text before the amendment is.
  Commit every `workflow.json` it names.
- Nothing mechanical limits an amendment to references: the person who approves the publish reads
  the diff. Never use an amendment to change what a document argues or measured; that is what a
  new entry with `--revises` is for.

## Revisions within a stage

A stage is a conversation. Each time the user asks a question or a change, the document is
revised, and each revision is committed: the archive keeps the final draft, and git keeps the
back-and-forth. The archive itself does not record the drafts, only the final text and any
reopenings.

## Before pushing

Run `bin/wf check`, which checks the rules above against `origin/main`, and the project's own
checks, which `AGENTS.md` lists.
