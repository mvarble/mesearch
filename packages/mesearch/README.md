<p align="center">
  <img src="https://raw.githubusercontent.com/mvarble/mesearch/main/logo.svg" alt="mesearch logo; man on toilet looking at phone" width="512">
</p>

# mesearch

An opinionated static site for a library of notes --- the kind an agent writes for you while you learn something. You keep documents in a fixed layout under `content/`; mesearch turns them into a site that reads like a textbook, with the math rendered, a map of how the documents depend on one another, an index, and sequences to read in order.

```sh
npm install @mvarble/mesearch
npx mesearch init            # content/, config, stylesheet, AGENTS.md, agent skills, CI, lint config
npm install                  # the lint and format tools init added to package.json
npm run dev                  # live site while you write
npm run build                # static site in build/
```

The commands here are npm's, since it comes with Node, but nothing depends on it: pnpm and yarn work the same way (`pnpm add`, `pnpm exec mesearch init`, `pnpm install`, `pnpm dev`). The one exception is Yarn's Plug'n'Play, which mesearch does not build under: with Yarn 2 or later, set `nodeLinker: node-modules` in `.yarnrc.yml`.

Where [mkdoc](https://github.com/mvarble/mkdoc) renders one document without a project around it, mesearch is installed in a `package.json` and builds a whole site. Where [the blog](https://github.com/mvarble/blog) is a SvelteKit app you maintain, mesearch is the SvelteKit app: a project holds only documents and a little configuration, and everything about how the site looks and works ships in this package.

## A project

```
project/
    package.json            depends on @mvarble/mesearch
    AGENTS.md               how agents should write for this site
    .agents/skills/         the procedure agents write with: explain
    .claude/skills/         a link to the same skill, for Claude Code
    .github/workflows/      builds the site on GitHub
    .gitlab-ci.yml          builds the site on GitLab
    mesearch.config.ts      title, base path, KaTeX macros
    mesearch.css            optional: overrides for any of the site's variables
    content/
        description.md                  what the site is about; opens the home page
        concepts/<slug>/index.md        one concept per folder
        concepts/<slug>/description.md  optional preview, for the map and the index
        writeups/<slug>/index.md        one writeup per folder
        writeups/<slug>/description.md
        sequences/<slug>/index.md       writeups to be read in order
```

Documents are `.md` or `.svx` ([mdsvex](https://mdsvex.pngwn.io/), which can import and render Svelte components). A document's folder holds whatever else it uses --- images, data, components --- referenced relatively. Packages a document imports (`three`, say) are installed in the project like any other dependency.

### Frontmatter

```yaml
---
title: Net interest margin
created: 2026-10-01
updated: 2026-10-03
depends_on: [basis-points, writeups/bank-balance-sheets]
katex_macros:
    '\NIM': '\mathrm{NIM}'
---
```

- `title` is required, and may contain inline math.
- `created` and `updated` default to the first and last commits that touched the document's folder, then to file times.
- `depends_on` names what a reader needs first, by slug: a bare slug when it is unambiguous between concepts and writeups, `concepts/<slug>` or `writeups/<slug>` otherwise.
- `katex_macros` are added, for this document, to mesearch's own macros (`\bbR`, `\calF`, `\bfx`, `\defeq`, …) and the site's.
- A sequence lists its writeups in reading order under `documents:`.

### Links, equations and the map

Link documents the way their folders sit on disk --- `[basis points](../basis-points/)`, `[the writeup](../../writeups/x/index.md#section)` --- and mesearch rewrites the links to site URLs. A link to a document that does not exist is reported when the site builds.

`$$ ... @tag(slug) $$` numbers a display equation and `[](eq:slug)` refers to it as `(1)`. From another document the reference is `eq:concepts/<slug>/<eq-slug>`.

A theorem, definition or remark is a small document with `type: statement` and a `kind`, shown with `<Statement {...theorem} />` (from `@mvarble/mesearch/Statement.svelte`). Statements count along with the document's equations, and `[%full](statement:slug)` refers to one as "Theorem 2". `@mvarble/mesearch/Proof.svelte` frames a proof.

Bibliography entries go in `.bib` files anywhere under `content/`. `[](cite:key)` renders as `[Foll99]` and `[Theorem 1.8](cite:key)` as `[Foll99, Theorem 1.8]`. Hovering a citation shows the reference. Following it jumps to a short list of references at the end of the page, which holds only what that page cites. There is no site-wide bibliography page.

The map on the home page is drawn from all of this:

- Every concept and writeup is a node.
- A solid arrow runs from each `depends_on` entry to the document that lists it. Neighbours in a sequence are joined the same way, so following the arrows is a reading order.
- A dashed line joins two documents when one links to the other and neither depends on the other.

## What the site does

**The home page** opens with the site's description. Below it is the map, laid out by a force simulation in which nodes repel each other, edges pull, and each node is drawn towards a band set by its depth in the dependency order. The layout is computed when the site builds, so the map works without JavaScript. With JavaScript, nodes can be dragged, the map pans and zooms (Ctrl/⌘ + scroll, or pinch), and clicking a node opens a preview with its description and its neighbours. The preview is a drawer beside the map on wide screens and a sheet from the bottom on narrow ones. Then come the sequences, and the index, which can be filtered and sorted by date updated, date created or title.

**Each document** has a header with its kind, title, dates, reading time and what it builds on, and its sequence position when it has one. On wide screens two sidebars flank the text: on the left, the sequence it belongs to, drawn as a line of stations; on the right, its headings, with the section being read marked as you scroll. On narrower screens both fold into the header. The footer links what it leads to, what it relates to, and the previous and next parts of its sequence.

**Everywhere**, a slim rail down the left edge (a floating dock at the bottom of a phone) holds search, the map, the index and the theme. Search (`/` or Ctrl/⌘-K) looks through titles, summaries and headings. The theme follows the device until you choose light or dark, and a page read without JavaScript is light.

Text is justified and hyphenated, and inline math never breaks across a line. Display math scrolls sideways when it is too wide, with its equation number kept in view.

## Configuration

```ts
// mesearch.config.ts
import { defineConfig } from '@mvarble/mesearch';

export default defineConfig({
    title: 'Probability, from the ground up',
    author: 'Ada',
    base: '/probability', // when served from a subdirectory, as on GitHub Pages
    katexMacros: { '\\PP': '\\mathbb{P}' },
    graph: { charge: -900, linkDistance: 80, gravity: 0.02 },
});
```

## Styling

Every colour, font, size and spacing is a CSS variable. `mesearch init` writes a `mesearch.css` listing them all, commented out at their defaults, for both the light and the dark theme. Uncomment one to change it. The file loads after mesearch's own styles, so any other rule in it applies as well, and it can `@import` a font from Google Fonts or from npm.

## Commands

```
mesearch init [dir]     scaffold a project (never overwrites without --force)
mesearch dev            serve the site, updating as documents change
    -p, --port <n>  --host [addr]  --open
mesearch build          write the static site
    -o, --out <dir>     (default: build)
    --base <path>       URL prefix, overriding the config
    --force             overwrite an output directory mesearch did not write
```

The site in `build/` is plain files: serve it from anywhere.

## Continuous integration

`mesearch init` writes a GitHub Actions workflow (`.github/workflows/build.yml`) and a GitLab CI configuration (`.gitlab-ci.yml`). Each installs the project's dependencies and runs `mesearch build`, so the site is built with whichever version of `@mvarble/mesearch` the project's `package.json` and lockfile name, and each keeps `build/` as an artifact. GitHub runs it on every push and pull request, GitLab in every pipeline. Delete whichever you do not use; running `mesearch init` again writes it back, as it does anything else it finds missing, and lists what it wrote.

Both install with the package manager whose lockfile is committed (`pnpm-lock.yaml`, `yarn.lock` or `package-lock.json`), and fail if it does not match `package.json`, so commit the lockfile, after the install that follows `init`, to have CI build with exactly the versions you do. Both also fetch the whole git history, since a document without `created` and `updated` takes its dates from it.

## Writing with agents

`mesearch init` sets a project up to be written by an agent, in whichever harness you use. It writes two things.

`AGENTS.md` describes the layout, the frontmatter, the link conventions and the prose register for any agent writing in the project, and ends with a section for opinions particular to the site.

`.agents/skills/` holds an [agent skill](https://agentskills.io), `explain`: the procedure an agent follows to write documents. It takes any prompt, works out what the prompt points at, asks what you already know of the subject and of what it rests on, and then writes.

| the prompt is                                                                                 | what gets written                                                                                       |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| a single idea: a concept, a definition, a term                                                | One or more documents in `content/concepts/` that teach it, prerequisites first.                        |
| something to work through: a document, a paper, an algorithm, a theorem, a chapter, a problem | A writeup in `content/writeups/`, with a document in `content/concepts/` for each new concept it needs. |

A document can be a file you have saved in `source/`, named by its title or its path, a file anywhere else, or an address. A textbook or a long paper is taken a chapter or a part at a time.

The skill is a folder with a `SKILL.md` and an `authoring.md`, which covers how to write the mathematics, numbered equations, statements, proofs and citations. Both are plain markdown and yours to edit, and they defer to `AGENTS.md` on anything particular to the site.

A harness that follows the Agent Skills convention, such as pi, finds the skill in `.agents/skills/`. Claude Code reads only `.claude/skills/`, so `init` links it there as well (or copies it, where links cannot be made). Ask for it in plain words, or by name:

```
/explain covered interest parity                Claude Code
/explain bayes-rule
/explain source/2026-09-30-bayes-rule.md
/explain how Dijkstra's algorithm finds shortest paths
/explain chapter 2 of Folland's Real Analysis

/skill:explain covered interest parity          pi
```

In a harness without skills, `AGENTS.md` points the agent at the same files, so asking it to explain `source/2026-09-30-bayes-rule.md` works there too.

`mesearch init` never overwrites a skill that is already there, so a project made before the skills existed gets them by running it again. To take the skills of a newer mesearch, delete `.agents/skills/` and run `mesearch init`: the link in `.claude/skills/` is kept and points at the new copy. Where `init` had to copy instead of link, delete `.claude/skills/explain` as well. Avoid `--force` for this, since it rewrites everything `init` writes, `AGENTS.md` and `mesearch.config.ts` included.

Before 0.2.1 there were two skills, `explain` for a document in `source/` and `explain-concept` for a concept. `explain` now does both, so a project made with an earlier version should also delete `.claude/skills/explain-concept`, which `init` no longer writes and which would otherwise be left pointing at nothing.

## How it works

mesearch is a SvelteKit app shipped as source in this package. On every run the CLI writes a small `.mesearch/` folder into the project, holding a `svelte.config.js` and a `vite.config.js` that each call into this package, and runs SvelteKit from there with its routes pointed at the app here. The project needs no SvelteKit of its own; Svelte and SvelteKit always resolve to mesearch's copies, so a project cannot end up with two of them.

The content goes through [`@mvarble/mesearch-cms`](https://github.com/mvarble/mesearch/tree/main/packages/cms) and [`@mvarble/mesearch-markdown`](https://github.com/mvarble/mesearch/tree/main/packages/markdown). The pages are built from [`@mvarble/mesearch-ui`](https://github.com/mvarble/mesearch/tree/main/packages/ui). The blog shares all three.
