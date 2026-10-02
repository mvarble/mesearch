# Writing for Probability, from the ground up

This repository is a [mesearch](https://github.com/mvarble/mesearch) site: a library of documents written to be read and learned from. `mesearch dev` serves it while you write and `mesearch build` writes the static site to `build/`. Everything about how the site looks is mesearch's; this repository holds only the documents and a little configuration.

These instructions apply to every agent writing here. They sit alongside any procedure you were given for the task (an `/explain` run, say); where the two disagree about this site's layout or conventions, this file wins.

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

- A **concept** explains a single idea on its own terms. A **writeup** works through something --- a source document, a problem, a topic --- using concepts.
- The folder name is the slug: lowercase words joined by hyphens, named after the idea (`net-interest-margin`), never dated.
- Documents may be `.md` or `.svx` ([mdsvex](https://mdsvex.pngwn.io/): markdown that can import and use Svelte components). Anything else a document uses --- images, data, components --- goes in its own folder and is referenced relatively, as `![A tree of outcomes](./tree.svg)`.
- Before creating a concept, check `content/concepts/`: if it exists, link to it and never rewrite or duplicate it. If a concept a document needs is missing, create it.

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
- `depends_on` lists what a reader must understand first, by slug. A bare slug names a concept or a writeup; write `concepts/<slug>` or `writeups/<slug>` when both exist. These become the solid arrows of the map, so they should be the real prerequisites --- the documents a reader would otherwise be lost without --- not everything mentioned.
- `katex_macros` are added to the site-wide macros in `mesearch.config.ts` for this document only. Use single quotes around keys and values.
- A sequence (`content/sequences/<slug>/index.md`) also has `documents:`, the writeups in reading order. Its body introduces the sequence.

A `description.md` has no frontmatter beyond optional `katex_macros`. It is one or two plain sentences saying what the document covers, for the map's preview panel and the index; without one, the document's first paragraph is used.

## Links

- Link to other documents with relative paths, the way the folders sit on disk: `[basis points](../basis-points/)` from one concept to another, `[the writeup](../../writeups/bank-balance-sheets/)` from a concept to a writeup. Links ending in `index.md` also work. The site rewrites them to the right URLs.
- A link between two documents that do not depend on each other draws a dashed line on the map, so link generously where it helps the reader.
- Never put a link inside a heading. When a section concerns another document, put `See also: [Name](../name/)` on its own line under the heading.
- `$$ ... @tag(slug) $$` numbers a display equation; `[](eq:slug)` refers to it as `(n)` from the same document, and `[](eq:concepts/<slug>/<eq-slug>)` from another.

## Math

Use LaTeX for anything mathematical. Inline math uses single dollar signs, as in `$x + y$`. A displayed equation opens with `$$` alone on its line, then the equation indented by one tab (several lines are fine), then a closing `$$` alone on its line:

```
$$
	f(x) = f(0) + \int_0^x f'(y) \, {\rm d}y
$$
```

Never write `$$f(x) = 0$$` on one line, and never use `\[ ... \]`. Shorthand macros such as `\bbR` ($\mathbb{R}$), `\calF` ($\mathcal{F}$), `\bfx` (bold $x$) and `\defeq` are always available.

## Prose

Write in the register of a textbook: impersonal third-person exposition in complete sentences and paragraphs, with tables and bullet lists only where they genuinely help. Never address the reader or write in the first person, and never refer to the conversation or session that produced the document. Prefer a concrete example to an abstract definition alone. Each document must stand on its own for a reader arriving at it first, relying only on what it links as prerequisites.

## Site-specific opinions

<!-- Opinions particular to this site go here: its subject, the reader's
background, notation conventions, what to emphasise. For example:

- The reader is comfortable with undergraduate real analysis.
- Write probability measures as \PP and expectations as \EE.
-->
