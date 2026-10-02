---
name: explain
description: Explains a source document in a mesearch site by assessing what the reader already knows and writing a textbook-style companion in content/writeups/, along with any concept documents it needs in content/concepts/. Use when asked to explain, summarise or write a companion for a document in source/, or when invoked as /explain <title>.
---

# Explain a source document

This procedure produces a textbook-style companion document for a source document. The request that invoked this skill names the document, usually by its title; that title is written `<title>` below. If the request names no document, list `source/` and ask which one is meant. Work through the following three phases in order.

The documents live in a [mesearch](https://github.com/mvarble/mesearch) site: one folder per document under `content/`, `content/concepts/<slug>/index.md` for concepts and `content/writeups/<slug>/index.md` for writeups. If the project has an `AGENTS.md`, read it before anything else. Its conventions for this site (layout, frontmatter, links, notation, and any site-specific opinions) take precedence over this procedure wherever the two differ.

# Parse the document

Attempt to find the document at `source/YYYY-MM-DD-<title>.{md|html}` or something close to it. If the title does not unambiguously identify a single document, confirm the intended path before going further. Once the document is identified, read it in full and understand its contents. In particular, consider:

- What is the overall message and the argument it makes?
- What supporting material does the argument rest on?
- What assumptions does the document make?
- What knowledge and context does the author assume?

# Assess prior knowledge

Do not assume the document has already been read. For each concept or piece of contextual information the author assumes, ask questions to establish the current level of understanding. If the answers warrant further inquiry, keep asking follow-up questions until that understanding is clear; questions may be grouped into a single message rather than asked one at a time. Before asking about a concept, check `content/concepts/*/`: for any concept documented there, understanding may be assumed to the extent that its document covers, and no questions about that material are needed.

# Write the companion document

Once both the source document and the current level of knowledge are understood, write a document at `content/writeups/<slug>/index.md`, where the slug is the title taken from the source document's filename, without its date (for `source/2026-09-30-bayes-rule.md`, the slug is `bayes-rule`). The companion is an analysis of the source document: a textbook-style chapter, read alongside the source, that develops the foundational and contextual knowledge the source document assumes and clarifies any complex or unclear concepts the source presents.

## Maintain the concept library

Every concept addressed in the companion document must have its own document in `content/concepts/`. Before writing, list the concepts the source document requires and check each against `content/concepts/*/`:

- If a concept is already documented there, link to that existing document. Never rewrite, replace, or duplicate an existing concept document.
- If a concept is **new** — it is worth addressing but was not already present in `content/concepts/` — it deserves its own new file. The companion document is not a substitute for it, and the concept must not be folded into an existing concept document. Create `content/concepts/<concept>/index.md` and link to it from the companion document.

The bar for "worth addressing" is exactly whether the companion document must explain the concept: any concept that earns a paragraph, section, or explicit definition is worth its own file. A term merely mentioned in passing without being explained need not become a concept document. When in doubt, create the file — a concept essential to this document is likely to recur in others.

A concept document must be self-contained, written as paragraph prose, and explain the concept on its own terms rather than only as it appears in the source document. Each concept document must stand on its own: it explains the concept for its own sake, with its own motivation, significance, examples, and applications. A concept document is not a stepping stone written to support the companion document or any future document — its reason for existing is the concept itself, not the role it plays in explaining something else. Name the folder after the concept (for example, `content/concepts/net-interest-margin/index.md`) so later runs can discover it.

Wherever a concept is explained — in a concept document or in the companion — a concrete example is preferred if a suitable one is available: an example from the source document when it provides one, and otherwise a simple illustration. A concept is best understood through an example, so an abstract definition alone is not sufficient when an example would make it clearer. If the concept includes anything mathematical, prefer mathematical expressions written in LaTeX markup — inline math where it reads naturally within a sentence, and displayed equations for anything that needs its own line — rather than plain-text notation or a prose description of the formula.


## Frontmatter and description

Every document begins with YAML frontmatter giving its `title`, its `created` date (today, as `YYYY-MM-DD`), and `depends_on`: the slugs of the documents a reader must understand first. For the companion these are the concepts it relies on. For a new concept they are the prerequisite concepts it builds on, and only those, since they draw the arrows of the site's map and its reading order. When an existing document is revised rather than created, add or update its `updated` date and leave `created` alone. Document-specific KaTeX macros go under `katex_macros`.

```yaml
---
title: Net interest margin
created: 2026-10-01
depends_on: [basis-points, interest-income]
---
```

Beside each new `index.md`, write a `description.md`: one or two plain sentences, with no frontmatter, saying what the document covers. The site shows it as a preview.

## Mathematics, statements and citations

Before writing anything, read `authoring.md`, which sits beside this file, and follow it: it says how mathematics, numbered equations, statements, proofs and citations are written in a mesearch site.

## Structure and prose

Begin the companion document by stating which document is summarized, with a markdown link to the source in `source/` (from `content/writeups/<slug>/index.md` that is `../../../source/<filename>`), followed by a list of the concepts discussed, each linked to its document in `content/concepts`. Every entry in that list must resolve to a real document, either an existing concept or one created in the previous step. Link to documents with relative paths to their folders: `../../concepts/<concept>/` from a writeup, `../<concept>/` from one concept to another.

Never put a link inside a heading or title. Keep every heading as plain text, and when a section concerns an existing concept document, place the link on its own line directly below the heading, as `See also: [Concept name](../../concepts/concept-name/)`. Use the same `See also:` form for any other link associated with a section, rather than embedding it in the title.

Write the document in the register of a textbook: impersonal third-person exposition, complete sentences in paragraph prose rather than fragments, and no excessive tables or itemized lists. Never address the reader directly and never write in the first person; this is an exposition of a subject, not a set of notes about a conversation. Refer to the source as "the document" and its writer as "the author", so that it is evident from the writing alone that it discusses another document. Apart from referencing the source document, the document must be completely self-contained: it must not reference this conversation or session, and it must read as though written for any reader approaching the subject for the first time.
