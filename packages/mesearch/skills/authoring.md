# Authoring in a mesearch site

How documents are written in a mesearch site: where they go, their frontmatter, links and prose, and how plots are written. How mathematics, numbered equations, statements and proofs, and citations are written is in `markup.md`, beside this file, with what is particular to a mesearch site below.

This file and `markup.md` belong to mesearch, and `mesearch init` replaces them with the current version each time it is run, so they are never edited in a project. Whatever a site does differently is written in the project's `AGENTS.md`, which takes precedence over both wherever they differ.

## Layout

```
content/
    description.md                  what the site is about; opens the home page
    concepts/<slug>/index.md        one concept per folder
    concepts/<slug>/description.md  optional one- or two-sentence preview
    writeups/<slug>/index.md        one writeup per folder
    writeups/<slug>/description.md  optional preview
    sequences/<slug>/index.md       an ordered run of writeups
```

- A **concept** explains a single idea on its own terms, at enough length to be worth reading alone. A **writeup** works through something (a source document, a problem, a topic) and explains the concepts it needs along the way.
- The folder name is the slug: lowercase words joined by hyphens, named after the idea (`net-interest-margin`), never dated.
- Documents may be `.md` or `.svx` ([mdsvex](https://mdsvex.pngwn.io/): markdown that can import and use Svelte components). Anything else a document uses, such as images, data and components, goes in its own folder and is referenced relatively, as `![A tree of outcomes](./tree.svg)`.
- Before explaining a concept, search all of `content/` for it, as with `grep -rni 'net interest margin' content/`, and not only `content/concepts/`: a concept may already be explained in a document of its own or in a section of another. If it is, link to that document or section and never rewrite or duplicate it.
- A concept the site does not yet explain is explained in a section of the document that needs it, under a heading that names it. Give it a document of its own in `content/concepts/` only when explaining it takes several sections. A concept document of a few paragraphs, written so that another document can link to it, should have been a section.

## Frontmatter

Every `index` document starts with YAML frontmatter:

```yaml
---
title: Net interest margin
created: 2026-10-01
updated: 2026-10-03 # only when revising; omit on creation
depends_on: [basis-points, writeups/bank-balance-sheets]
katex_macros:
    '\NIM': '\mathrm{NIM}'
---
```

- `title` is required. It may contain inline math (`$\sigma$-algebras`).
- `created` and `updated` are dates. Without them the site falls back to the git history of the document's folder.
- `depends_on` lists what a reader must understand first, by slug. A bare slug names a concept or a writeup; write `concepts/<slug>` or `writeups/<slug>` when both exist. These become the solid arrows of the map, so they should be the real prerequisites (the documents a reader would otherwise be lost without), not everything mentioned.
- `katex_macros` are added to the site-wide macros in `mesearch.config.ts` for this document only.
- A sequence (`content/sequences/<slug>/index.md`) also has `documents:`, the writeups in reading order. Its body introduces the sequence.

A `description.md` has no frontmatter beyond optional `katex_macros`. It is one or two plain sentences saying what the document covers, for the map's preview panel and the index; without one, the document's first paragraph is used.

## Links

- Link to other documents with relative paths, the way the folders sit on disk: `[basis points](../basis-points/)` from one concept to another, `[the writeup](../../writeups/bank-balance-sheets/)` from a concept to a writeup. Links ending in `index.md` also work. The site rewrites them to the right URLs.
- Link to a section by adding its anchor: `[countable additivity](../../writeups/lebesgue-integral/#countable-additivity)` for the section `# Countable additivity`. The anchor is the heading in lowercase, with any `$` removed, every run of characters other than the letters `a` to `z` and the digits turned into a single hyphen, and hyphens at either end dropped. So `# Fubini's theorem` is `#fubini-s-theorem` and `# $\sigma$-algebras` is `#sigma-algebras`, but `# σ-algebras` is only `#algebras`, since a letter outside `a` to `z` counts for nothing. Only headings down to `###` have anchors, and a heading repeated within a document gets `-2`, `-3` and so on after the first.
- The build does not check anchors, and a wrong one silently lands at the top of the page, so work each one out from the heading as it is written in the file.
- A link between two documents that do not depend on each other draws a dashed line on the map, so link generously where it helps the reader.
- Never put a link inside a heading. When a section concerns another document, put `See also: [Name](../name/)` on its own line under the heading.

## Prose

Write in the register of a textbook: impersonal third-person exposition in complete sentences and paragraphs, with tables and bullet lists only where they genuinely help. Never address the reader or write in the first person, and never refer to the conversation or session that produced the document. Prefer a concrete example to an abstract definition alone. Each document must stand on its own for a reader arriving at it first, relying only on what it links as prerequisites.

## Mathematics, statements and citations

`markup.md`, beside this file, says how mathematics, numbered equations, statements and proofs, and citations are written. In a mesearch site:

- The site-wide KaTeX macros are in `mesearch.config.ts`, under `katexMacros`.
- Another document is named by its folder under `content/`: an equation in a concept is `eq:concepts/<slug>/<equation-slug>`, one in a writeup is `eq:writeups/<slug>/<equation-slug>`, and statements are named the same way, as `statement:concepts/<slug>/<statement-slug>`.
- `Statement` and `Proof` are imported from `@mvarble/mesearch/Statement.svelte` and `@mvarble/mesearch/Proof.svelte`.
- Bibliography entries usually go in `content/references.bib`.

## Plots

A plot is a Svelte component in the document's folder, shown by a `.svx` document that imports it, as `import Growth from './Growth.svelte';`. Its colours come from the site's theme, never from fixed values, so that it reads in light and dark alike.

- In markup and styles, use the site's variables: `var(--series-1)` to `var(--series-8)` for series, taken in that order, and `var(--ink)`, `var(--muted)`, `var(--rule)` and `var(--paper-raised)` for text, labels, gridlines and background.
- A plotting library or a canvas takes the same colours as strings from `palette`, and draws in an `$effect`, so that it draws again when the reader switches theme. Read the palette in the effect itself, before anything is awaited:

```svelte
<script>
	import { palette } from '@mvarble/mesearch/palette';

	let { x, y } = $props();
	let plot;

	$effect(() => {
		const data = [{ x, y, type: 'scatter', mode: 'lines', line: { color: palette.series[0] } }];
		const axis = { color: palette.muted, gridcolor: palette.rule };
		const layout = {
			paper_bgcolor: palette.paperRaised,
			plot_bgcolor: palette.paperRaised,
			font: { family: palette.fontUi, color: palette.ink },
			xaxis: axis,
			yaxis: axis,
		};
		import('plotly.js-dist-min').then(({ default: Plotly }) => Plotly.react(plot, data, layout));
	});
</script>

<div bind:this={plot}></div>
```

- Load a plotting library with `import()` inside the effect, as above: it needs a browser, and the page is first rendered without one. Install it in the project if `package.json` does not already list it.
- Text stays in `palette.ink` and `palette.muted`; a series colour marks the series, never its label. With two or more series, give the plot a legend.
