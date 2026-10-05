# Authoring in a mesearch site

How documents are written in a mesearch site: mathematics, numbered equations, statements and proofs, and citations.

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

Refer to it as `[](eq:additivity)`, which renders as its number, as in "(2)". From another document, write `[](eq:concepts/<slug>/<equation-slug>)`. Number only the equations that are referred to.

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
- Refer to a statement as `[%full](statement:heine-borel)`, which renders as "Theorem 1". `%kind` and `%label` give "Theorem" and "1" alone, as in `[%kind %label (Heine–Borel)](statement:heine-borel)`. From another document, write `statement:concepts/<slug>/<statement-slug>`.
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
