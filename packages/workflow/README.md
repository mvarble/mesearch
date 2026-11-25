# @mvarble/mesearch-workflow

Documented development: every change to a project is an **entry** that moves through stages a person approves (a plan, a build, the pages that say what now is), and is kept, as it was approved, in an archive on the project's documentation site. This package is everything that is the same from project to project:

- **the engine**, `bin/wf`, which keeps each entry's record and refuses an edit its stage does not allow, configured by the project's `workflow.config.ts`;
- **the skills** that drive it (`/wf-start`, `/wf-plan`, `/wf-build`, `/wf-publish`, `/wf-approve`, …) and the procedure they follow;
- **the documentation site**: a SvelteKit app whose pages, math notes and archive are the project's `site/content/`, with the content database's preset, the routes, the components and the styles.

What differs between projects (their kinds of entry, their code, their stages' particulars, their tracks, their own components) stays in the project.

```sh
pnpm add -D @mvarble/mesearch-workflow     # in site/
pnpm exec mesearch-wf init                 # workflow.config.ts, AGENTS.md, a site, the guard, then sync
pnpm exec mesearch-wf sync                 # after an update: bring what is the package's up to date
pnpm exec mesearch-wf diff                 # in CI: fail if a managed file is not this version's
```

## A project

```
workflow.config.ts                  the project's kinds, stages and code
AGENTS.md                           the project's own instructions to agents
bin/wf                              managed: runs the engine
.workflow/engine/                   managed: the engine, vendored
.workflow/managed.json              managed: what sync wrote, with each file's hash
.workflow/active                    the entry this branch works on, written by bin/wf
.agents/skills/wf-*/                managed: the workflow's skills (linked into .claude/skills/)
.agents/skills/<own>/               the project's own skills, such as a stage only it has
.agents/reference/mesearch/         managed: workflow.md, authoring.md, markup.md
.agents/reference/authoring.md      the project's own writing conventions
.agents/reference/stages/<stage>.md what a stage asks of this project beyond its skill
.claude/settings.json               runs `bin/wf guard` before every edit
site/                               the documentation site (below)
```

### Managed files

A _managed_ file belongs to this package. `mesearch-wf sync` writes it, `.workflow/managed.json` records its hash, `bin/wf guard` refuses an edit to it (with a message saying where to make the change instead), and `bin/wf check` fails when it has changed, so CI catches an edit made around the guard. A change to one is made here and reaches every project with the next `sync`. A file a newer version no longer ships is removed by `sync`, unless it was changed in the project, in which case it is kept and reported.

The engine is vendored, as plain JavaScript with no dependencies, because the guard runs before every edit, including in a fresh clone where nothing is installed. It loads `workflow.config.ts` with Node's type stripping (Node 22.18 or later), so the config imports nothing but types:

```ts
import type { WorkflowConfig } from '@mvarble/mesearch-workflow';

export default {
    project: 'skoro', // as skills and messages name it: "skoro's development workflow"
    code: [/^crates\//, /^Cargo\.(toml|lock)$/], // what opens at the build
    describe: { code: '`crates/`, `Cargo.*`' }, // how the reference documents name it
    kinds: {
        feature: {
            stages: ['math', 'implementation', 'plan', 'build', 'publish'],
            describe: 'needs mathematics worked out',
        },
        chore: { stages: ['plan', 'build', 'publish'], describe: 'a port or a refactor' },
    },
    stages: {
        math: { document: true, unlocks: ['math'] },
        implementation: { document: true, sections: ['Tests'] },
        plan: { document: true, checklist: true, editableDuring: ['build'] },
        build: { unlocks: ['code'] },
        publish: { unlocks: ['pages'] },
    },
    entryFields: { crates: '[]' }, // more frontmatter for a new entry's index.md
    pagesOptional: ['chore'], // kinds whose publish need not change a page
    checks: { publish: (context) => [] }, // the project's own conditions for approving a stage
} satisfies WorkflowConfig;
```

| field             |                                                                                                                                                                                                                                                                                                                                                           |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kinds`           | Each kind's stages, in order, and a sentence saying when an entry is of that kind.                                                                                                                                                                                                                                                                        |
| `stages`          | `document`: written as `<stage>.md` and frozen once approved. `unlocks`: `math`, `code` or `pages`, open from then on. `sections`: headings it must have. `checklist`: a plan, whose boxes are ticked later without reopening it. `editableDuring`: later stages that may still edit it. `skill`: `/wf-<stage>` by default. `describe`: what it produces. |
| `code`, `free`    | What counts as code, and paths open at every stage (a ledger of facts, say).                                                                                                                                                                                                                                                                              |
| `content`, `math` | `site/content` and `math` by default; `math: false` for a project without math notes.                                                                                                                                                                                                                                                                     |
| `entryFields`     | Frontmatter `bin/wf start` adds to a new entry.                                                                                                                                                                                                                                                                                                           |
| `checks`          | Per stage, a function of the entry (`root`, `slug`, `index`, `text`, `changed`, `list(field)`) returning problems, which `wf approve` reports beside its own.                                                                                                                                                                                             |

`build` and `publish` are stages the engine knows by name: a build is approved only when every checklist box is ticked and the tree is clean, and a publish only when the pages it changed are listed in the entry's `pages` and what it changed in done entries in its `amends`.

### Skills

`sync` writes `wf-start`, `wf-approve`, `wf-reopen`, `wf-abandon`, `wf-resume`, `wf-status` and the stage skills `wf-plan`, `wf-build`, `wf-publish` and `wf-writeup`, filled in with the project's name and kinds. A stage skill holds what every project's stage does, and reads `.agents/reference/stages/<stage>.md` for what this project's does besides (what to read first, the plan's template, how a task is checked, which pages a publish changes). A stage only one project has, such as skoro's `math` or a measurement stage, is that project's own skill, written beside the managed ones; it reads `.agents/reference/mesearch/workflow.md` for the procedure.

## The documentation site

```ts
// site/vite.config.ts
import { docsSite } from '@mvarble/mesearch-workflow/site';
import { defineConfig } from 'vite';

export default defineConfig({ plugins: await docsSite() });
```

`docsSite()` sets up the content database with the docs preset, SvelteKit with mdsvex (KaTeX, callouts, heading anchors, quoted code), and two virtual modules through which the app reads the project:

| `$site`        | from                                                                                                                                                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| structure      | `src/lib/site.ts`: `SITE`, `TRACKS`, `MATH`, `ARCHIVE`, `DOCUMENTS`, and optionally `MATH_PARTS`, `KIND_LABELS`, `STATUS_LABELS`, `NAV` (`mathBefore`), `LLMS` (`about`), `THEME_KEY`                                               |
| logo           | `src/lib/components/Logo.svelte`, as `<Logo variant="icon" \| "lockup" />`                                                                                                                                                          |
| macros         | `katex.config.ts`                                                                                                                                                                                                                   |
| stages         | `../workflow.config.ts`, for the archive's stage rail                                                                                                                                                                               |
| `$site/server` | `src/lib/server/site.ts`, if any: `hooks: SiteHooks`, with `entryChanges` (what an entry's page lists under "What it changed" besides its pages) and `markdown` (rewrites for the Markdown export of a component of the site's own) |

`sync` writes a wrapper of a few lines for every route the app ships (`src/routes/…`, `src/params/…`) and for what documents import by `$lib` path (`Statement`, `Proof`, `ModelGraph`, `ImageFigure`, `TrackCard`, `graph/spec`). The site keeps its home page and layout, built from `Shell` and the app's other components (`@mvarble/mesearch-workflow/app/lib/components/…`), its colours (`src/styles/tokens/colors.css`, beside `@mvarble/mesearch-workflow/styles/index.css`), and any route and component of its own. `src/app.d.ts` takes the virtual modules' types with `/// <reference types="@mvarble/mesearch-workflow/ambient" />`.

The site's `Statement`, `Proof`, `Toc`, `ThemeToggle` and `Icon` share names with [`@mvarble/mesearch-ui`](../ui)'s but not their markup: these are the documentation site's look, which skoro and autonomy-fusion-box had.

## Development

`test/engine/` runs the engine against configs shaped like skoro's and autonomy-fusion-box's, each with the test suite its repository had. `test/preset/` runs the preset against both repositories' fixtures. `test/sync/` sets up throwaway repositories and runs the vendored engine in them with nothing installed. The app itself is built, type-checked and tested by [`docs-example/`](../../docs-example), a site with a document of every kind.
