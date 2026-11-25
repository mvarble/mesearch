# Writing a project's documentation

How the documents in `site/content/` are written in a project documented through
`@mvarble/mesearch-workflow`: what each kind promises, where it goes, its frontmatter, links,
prose, callouts, code and figures. `markup.md`, beside this file, says how mathematics, numbered
equations, statements and citations are written.

This file and `markup.md` belong to the package, and `mesearch-wf sync` replaces them with the
current version, so they are never edited here. The project's own conventions are in
`.agents/reference/authoring.md`: what its site is for, its tracks, its notation, and anything it
does differently. Where the two differ, the project's file wins.

## Three kinds of writing

- **Pages say what is.** They describe the project as it stands, quote the code that exists, and
  only ever describe the current state. They are rewritten whenever the project changes, at an
  entry's `publish` stage, and are grouped in tracks (`TRACKS` in `site/src/lib/site.ts`).
- **Math notes say what is true**, independently of the project: one idea to a note, at enough
  length to be worth reading alone. A note the site already has is linked, never rewritten in
  another document.
- **Archive documents discuss what may be.** They argue, weigh alternatives and leave room for
  doubt, as they stood when approved. Once approved they are frozen: they may drift from the code,
  and that is what they are for.

Before writing about an idea, search for it: `grep -rni '<the idea>' site/content/`. If the site
explains it, link there.

## Where things go

```
site/content/
    landing.md                          the home page's prose
    <track>/<slug>/index.md             a page of a track
    math/<slug>/index.md                a math note
    archive/<slug>/index.md             an entry, opened by `bin/wf start`
    archive/<slug>/<stage>.md           its documents, one per stage that has one
    archive/<slug>/statements/<x>.md    statements its documents show
    references.bib                      the bibliography
```

A document is `.md`, or `.svx` when it imports a component. Anything else a document uses
(images, figure specs, data) goes in its own folder and is referenced relatively.

## Frontmatter

```yaml
---
title: Retractions
summary: Maps from a tangent space back onto the manifold. # one plain sentence
depends_on: [tangent-space, archive/normal/math]
katex_macros:
    '\retr': '\operatorname{R}'
---
```

- `title` may contain inline math. An entry's documents default to their stage's name
  ("Mathematics", "Plan"), which is usually right.
- `summary` is shown in lists, the sidebar, previews and `llms.txt`. Without it, the first
  paragraph stands in, so either write one or make the first paragraph a good summary.
- `depends_on` lists what a reader must understand first: a bare slug is a math note, anything
  else a key (`concepts/graph`, `archive/normal/math`). These are the solid arrows of the map on
  the Mathematics page, so list real prerequisites, not everything mentioned.
- A page also needs `order`, its place in its track. Its `depends_on` names no page of its own
  track at its place or after it.
- Where the mathematics has parts (`MATH_PARTS` in `site/src/lib/site.ts`), a math note needs
  `part` and `order`, its part and its place within it, and its `depends_on` names math notes
  alone, none at its own place or after it. The build refuses a note that breaks either rule.
- A page that moves lists the keys it had under `formerly` (`formerly: [start/old-slug]`), so
  that the entries that name it, frozen once done, still resolve to it.
- An entry's `index.md` lists the `pages` it changed (written at `publish`), the entries it
  `revises` (given to `wf start`), and what it `amends` in entries that are done (`workflow.md`,
  under "Amending a done entry"), with whatever else the project's workflow asks of it.

## Mathematics, statements and citations

As `markup.md` says, with this site's particulars:

- The site-wide KaTeX macros are in `site/katex.config.ts`; notation for one document goes in its
  `katex_macros`.
- A reference into another document names it by its key: `[](eq:math/<slug>/<tag>)`,
  `[%full](statement:archive/<entry>/<document>/<name>)`.
- `Statement` and `Proof` are imported from `$lib/components/Statement.svelte` and
  `$lib/components/Proof.svelte`.
- Bibliography entries go in `site/content/references.bib`.

## Links

- Write links the way the files sit on disk: `[retractions](../../math/retraction/)`,
  `[the plan](plan.md)`, `[the guide](../../guide/)`. The build rewrites them to the site's URLs
  and reports a link to a document that does not exist.
- A section's anchor is its heading in lowercase, with `$` removed and every run of characters
  other than `a`–`z` and digits turned into one hyphen: `## Fubini's theorem` is
  `#fubini-s-theorem`. Anchors are not checked, so work them out from the heading as written.
- Never put a link inside a heading.

## Prose

Write in complete sentences and paragraphs, in the register of a textbook, with tables and lists
only where they genuinely help. Never refer to the conversation that produced a document: it is
read later, by someone who was not there. Prefer a concrete example to an abstract definition
alone. Name things the way the code names them, in backticks; generics such as `Q<B, M>` must be
in backticks anyway, since `<` and `{` are Svelte syntax outside code and math.

## Callouts

GitHub-style blockquotes, with an optional title after the marker:

```
> [!DECISION] Why conditioning belongs to the query
> ...
```

`NOTE`, `TIP`, `WARNING`, `DECISION`, `TODO`. A `[!TODO]` is an open question: `wf approve`
refuses a document that still has one, so a draft carries its open questions as `[!TODO]`s until
they are answered. A page's `[!DECISION]` says briefly why something is the way it is and links
to the archive entry that decided it.

## Code

- **Pages quote real code.** A fence whose only line is `{path}` or `{path:start..end}` is
  replaced by those lines of the file (1-indexed, inclusive), with a caption linking to the
  repository. Paths are relative to the document. Quoting Rust doc comments renders them as
  Markdown.
- **Archive documents never quote with `{path}`.** The quote is re-read at every build, so it
  would change as the code does, and a line range would eventually break the build. Sketch the
  code inline, and when an existing interface matters, paste the lines and name the file and the
  commit they were read at.
- Sketches are compile-plausible, and show signatures and types rather than bodies, unless the
  body is the point.

## Figures

- **A graph** (a model, a factor graph, a timing chain, a wiring diagram) is drawn with
  `<ModelGraph spec={name} />`, from `$lib/components/ModelGraph.svelte`, with the spec in a
  `*.graph.ts` file beside the document, written with `defineGraph` from `$lib/graph/spec`. The
  Markdown export describes it in words.
- **An image** is imported in the document's `<script>` (`import board from './board.jpg'`), so
  the build serves it under the site's base path, and placed with
  `<ImageFigure src={board} alt="…" width={…} height={…}>caption</ImageFigure>`, from
  `$lib/components/ImageFigure.svelte`, which opens it enlarged when clicked. Its alt text says
  what the image shows for a reader who cannot see it, and its caption why it is there.
- **Anything else** is a Svelte component in the document's folder, referenced relatively.
