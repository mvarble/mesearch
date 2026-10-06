# Authoring in a mesearch site

How documents are written in a mesearch site: where they go, their frontmatter, links and prose, and how mathematics, numbered equations, statements and proofs, citations, and plots are written.

This file belongs to mesearch, and `mesearch init` replaces it with the current version each time it is run, so it is never edited in a project. Whatever a site does differently is written in the project's `AGENTS.md`, which takes precedence over this file wherever the two differ.

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

## Mathematics

Format mathematical expressions as follows. Inline math uses single dollar signs, as in `$x + y$`. A displayed equation opens with `$$` alone at the beginning of a line, followed by a line break, the equation indented by one tab (multiple lines are allowed), a line break, and a closing `$$` alone on its own line. Every displayed equation follows this shape:

$$
	f(x) = f(0) + \int_0^x f'(y) {\rm d}y
$$

$$
	\begin{aligned}
		f(x) &= x^2 \\
		g(x) &= x - 1
	\end{aligned}
$$

Never write a displayed equation on the same line as its delimiters, as in `$$f(x) = 0$$`, and never use `\[ ... \]` for displayed math, as in `\[ p(x) = 0 \]`.

Shorthand macros such as `\bbR` ($\mathbb{R}$), `\calF` ($\mathcal{F}$), `\bfx` (bold $x$) and `\defeq` are always available, along with any the site defines in `mesearch.config.ts`. Notation used throughout one document belongs in its frontmatter as `katex_macros`, with single quotes around keys and values:

```yaml
katex_macros:
    '\NIM': '\mathrm{NIM}'
```

A displayed equation that the text refers back to gets a number with `@tag(slug)` at the end of its last line:

$$
	\mu\Big(\bigcup_n A_n\Big) = \sum_n \mu(A_n). @tag(additivity)
$$

Refer to it as `[](eq:additivity)`, which renders as its number, as in "(2)". From another document, write `[](eq:concepts/<slug>/<equation-slug>)`, or `eq:writeups/<slug>/<equation-slug>` for an equation in a writeup. Number only the equations that are referred to.

## Statements and proofs

A definition, theorem, lemma, proposition, corollary, remark or example that the text states formally and refers back to is a **statement**: a short document of its own in a `statements/` folder beside the document that shows it, such as `content/concepts/compactness/statements/heine-borel.md`.

```yaml
---
type: statement
kind: theorem # lemma, proposition, corollary, definition, remark, example, ...
title: Heine–Borel # optional: a name of its own
slug: heine-borel # optional: the filename without its extension
---
```

The body is the statement alone, in the same markdown as any document, with no heading and no proof. The document imports it and shows it where it belongs, and puts its proof, if it gives one, directly after it:

```svelte
<script>
	import Statement from '@mvarble/mesearch/Statement.svelte';
	import Proof from '@mvarble/mesearch/Proof.svelte';
	import * as heineBorel from './statements/heine-borel.md';
</script>

<Statement {...heineBorel} />

<Proof>

Take an open cover of $[a, b]$ ...

</Proof>
```

- The `<script>` block goes directly after the frontmatter, with one import per statement shown.
- Leave a blank line after `<Proof>` and before `</Proof>`, so that what is between them is read as markdown.
- Statements and equations share one count within a document: Theorem 1, equation (2), Lemma 3.
- Refer to a statement as `[%full](statement:heine-borel)`, which renders as "Theorem 1". `%kind` and `%label` give "Theorem" and "1" alone, as in `[%kind %label (Heine–Borel)](statement:heine-borel)`. From another document, write `statement:concepts/<slug>/<statement-slug>`, or `statement:writeups/<slug>/<statement-slug>` for a statement in a writeup.
- Claims (theorems, lemmas, propositions, corollaries) are set in italics and definitions, remarks and examples are not. Never italicise or bold a statement's text yourself, and never write "Theorem 1." by hand.
- Use statements for what the exposition genuinely states and returns to. An idea explained in flowing prose does not need to become a definition, and a document should not read as a list of statements.

## Citations

Bibliography entries go in BibTeX files anywhere under `content/`, usually `content/references.bib`. Keys are shared across the site, so check whether an entry already exists before adding one, and name new keys `<surname><year>`, as `folland1999`. Give each entry its `author`, `title`, `year`, and whichever of `journal`, `volume`, `number`, `pages`, `publisher`, `edition` and `doi` apply.

```bibtex
@book{folland1999,
    author = {Folland, Gerald B.},
    title = {Real Analysis: Modern Techniques and Their Applications},
    edition = {Second},
    publisher = {Wiley},
    year = {1999},
}
```

- `[](cite:folland1999)` cites an entry as `[Foll99]`, and `[Theorem 1.8](cite:folland1999)` as `[Foll99, Theorem 1.8]`. Point at the exact theorem, section or page whenever possible.
- Each document ends with a list of exactly what it cites, and each citation jumps to its entry there. Cite in the sentence that relies on the source; never write a reference list or a "Further reading" section of your own.
- Cite only sources you are certain of, with their real titles, authors, years and DOIs. Never invent or guess a reference: leave the citation out rather than risk a wrong one.
- A file or an address a writeup is about is linked, not cited. A published work it is about, such as a textbook or a paper, is cited.

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
