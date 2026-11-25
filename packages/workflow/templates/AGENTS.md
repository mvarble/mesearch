# {{name}}

## How to work here

**Conversation is the default.** Answer questions, explain things and sketch ideas in the reply:
none of that needs a workflow, and none of it should start one.

**The development workflow runs only when the user invokes it**, through the `/wf-*` commands
(`.agents/skills/wf-*`). Every change to the code goes through an entry. The procedure is in
`.agents/reference/mesearch/workflow.md`, and `bin/wf kinds` lists the kinds of entry.

Rules that hold whether or not a command was invoked:

- Never start, approve, reopen, abandon or resume an entry on your own judgment, and never run
  `bin/wf start|approve|reopen|abandon|resume` except inside the skill the user invoked for it.
- Never do a stage's work outside its skill. Asked to write code with no entry at the build stage,
  say so and point to the command that would get there.
- `bin/wf guard` runs before every edit in Claude Code (`.claude/settings.json`) and refuses one
  the stage does not allow. Do not work around a refusal; it is telling you which command the
  user would need to give.
- When work at one stage shows an earlier stage wrong, stop and say so; the user may reopen it.

## Managed files

`@mvarble/mesearch-workflow` owns the files `.workflow/managed.json` lists: `bin/wf` and
`.workflow/engine/`, the `wf-*` skills it ships, `.agents/reference/mesearch/`, and the site's
shared routes and components. `bin/wf guard` refuses an edit to one; a change to one is made in
that package, and `pnpm exec mesearch-wf sync` in `site/` brings it here. What this project does
differently goes in this file, in `.agents/reference/authoring.md`, in
`.agents/reference/stages/<stage>.md`, and in skills of its own beside the managed ones.

## Writing documents

Everything in `site/content/` is written as `.agents/reference/mesearch/authoring.md` and
`markup.md` say, with this project's own conventions in `.agents/reference/authoring.md`.

## Checks

```sh
bin/wf check
cd site && pnpm exec mesearch-wf diff && pnpm check && pnpm build
```
