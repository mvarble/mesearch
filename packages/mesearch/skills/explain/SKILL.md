---
name: explain
description: Explains whatever the prompt names in a mesearch site (a concept, a document in source/ or elsewhere, a paper, an algorithm, a theorem, a textbook or one of its chapters, a problem, a question) by assessing what the reader already knows and writing textbook-style documents in content/concepts/ and, where there is something to work through, a writeup in content/writeups/. Use when asked to explain, teach, summarise, document or write a companion for anything, or when invoked as /explain <prompt>.
---

# Explain

This procedure produces textbook-style documents that explain a subject. The request that invoked this skill is the prompt, and it may be anything: a concept named or loosely described, a document in `source/` or at some other path or address, an algorithm, a theorem, a textbook or one of its chapters, a problem, a question. If the request names nothing to explain, ask what is meant, listing `source/` if the project has one. Work through the following four phases in order.

The documents live in a [mesearch](https://github.com/mvarble/mesearch) site: one folder per document under `content/`, `content/concepts/<slug>/index.md` for concepts and `content/writeups/<slug>/index.md` for writeups. If the project has an `AGENTS.md`, read it before anything else. Its conventions for this site (layout, frontmatter, links, notation, and any site-specific opinions) take precedence over this procedure wherever the two differ.

# Identify the subject

Work out what the prompt points at, and so what will be written.

- **A single idea**: a concept, a definition, a quantity, a term. It is explained by one or more documents in `content/concepts/` and needs no writeup. Resolve the prompt into one clearly named concept. Then check `content/concepts/*/`: if a document for it already exists, link it, state what it already covers, and treat it as the foundation of this run.
- **Something to work through**: a document, a paper, an algorithm, a theorem and its proof, a chapter, a problem, a topic that draws several ideas together. It is explained by a writeup in `content/writeups/`, together with a document in `content/concepts/` for each concept the writeup needs.

A prompt may be loose, partial, or may point at an idea without naming it. If it is ambiguous, could reasonably mean several distinct things, or leaves it unclear which of the two cases above applies, ask for clarification before going further. Once confident, state what will be explained and which documents that is expected to produce.

A subject too large for one writeup, such as a whole textbook or a long paper, is narrowed first: propose the chapter or part to begin with, or a division into several writeups in reading order, and confirm it before going further.

# Study the material

If the prompt points at material, find it and read it in full before anything else.

- A file is taken from the path given. A document named only by its title is looked for in `source/`, at `source/YYYY-MM-DD-<title>.{md|html|pdf}` or something close to it. If the name does not unambiguously identify a single file, confirm the intended path before going further.
- An address is fetched, if the harness can fetch it.
- A published work that is not in the project, such as a textbook or a paper, is explained from the work itself whenever a copy can be had: ask for one, or for the passage in question. Explaining it from general knowledge is acceptable only for standard material, and then nothing is attributed to the work that is not certain to be in it: no invented theorem numbers, page numbers, quotations or notation.

For any material, consider:

- What is the overall message and the argument it makes?
- What supporting material does the argument rest on?
- What assumptions does it make?
- What knowledge and context does its author assume?

A subject with no material behind it, such as a concept or an algorithm described in the prompt, is studied by laying out what it is, what it rests on, and what a full explanation of it must cover.

# Assess prior knowledge

Do not assume the subject is already known, or that any material has already been read. For the subject itself, and for each concept or piece of context it rests on, ask questions to establish the current level of understanding. If the answers warrant further inquiry, keep asking follow-up questions until that understanding is clear; questions may be grouped into a single message rather than asked one at a time. Before asking about a concept, check `content/concepts/*/`: for any concept documented there, understanding may be assumed to the extent that its document covers, and no questions about that material are needed.

Many concepts rest on others. A missing prerequisite is itself a concept worth explaining, and explaining it may be the best route to the subject originally requested. Keep track of these prerequisites as you go; they determine the documents written next.

# Write the documents

Once both the subject and the current level of knowledge are understood, write the documents.

## Maintain the concept library

Every concept addressed must have its own document in `content/concepts/`. Before writing, list the concepts the explanation requires and check each against `content/concepts/*/`:

- If a concept is already documented there, link to that existing document. Never rewrite, replace, or duplicate an existing concept document.
- If a concept is **new** — it is worth addressing but was not already present in `content/concepts/` — it deserves its own new file. A writeup is not a substitute for it, and the concept must not be folded into an existing concept document. Create `content/concepts/<concept>/index.md` and link to it from the documents that depend on it.

The bar for "worth addressing" is exactly whether a document must explain the concept: any concept that earns a paragraph, section, or explicit definition is worth its own file. A term merely mentioned in passing without being explained need not become a concept document. When in doubt, create the file — a concept essential to this explanation is likely to recur in others.

If a concept is composite — really several ideas standing on one another — write one document per idea, building them in dependency order so that each document relies only on concepts explained before it. A single file must not be overloaded with material that deserves its own. Name each folder after the concept it explains (for example, `content/concepts/net-interest-margin/index.md`) so later runs can discover it.

A concept document must be self-contained, written as paragraph prose, and explain the concept on its own terms rather than only as it appears in the material at hand. Each concept document must stand on its own: it explains the concept for its own sake, with its own motivation, significance, examples, and applications. A concept document is not a stepping stone written to support a writeup or any future document. It may mention concepts that build on it, and it may link forward to them, but it must not frame itself as preparation for those concepts — its reason for existing is the concept itself, not the role it plays in explaining something else.

Wherever a concept is explained — in a concept document or in a writeup — a concrete example is preferred if a suitable one is available: an example from the material at hand when it provides one, and otherwise a simple illustration. A concept is best understood through an example, so an abstract definition alone is not sufficient when an example would make it clearer. If the concept includes anything mathematical, prefer mathematical expressions written in LaTeX markup — inline math where it reads naturally within a sentence, and displayed equations for anything that needs its own line — rather than plain-text notation or a prose description of the formula.

## Write the writeup

If the subject is something to work through, write `content/writeups/<slug>/index.md`: a textbook-style chapter that develops the foundational and contextual knowledge the subject assumes and then works through the subject itself. Name the folder after the subject, in lowercase words joined by hyphens and never dated. For a file in `source/`, the slug is the title taken from its filename, without its date (for `source/2026-09-30-bayes-rule.md`, the slug is `bayes-rule`).

What the writeup does depends on what it is about:

- For a document, a paper or a chapter, it is a companion read alongside the material: an analysis that supplies what the material assumes and clarifies whatever is complex or unclear in what it presents. It follows the material's argument without reproducing its text.
- For an algorithm, it states the problem solved, develops the idea that makes the algorithm work, gives the algorithm itself, traces it on a small example, and argues its correctness and its cost.
- For a theorem, it motivates the statement, states it, and proves it, saying what each step of the proof achieves.
- For a problem or a question, it works to the answer and says why each step is taken.

Begin the writeup by stating what it explains, followed by a list of the concepts discussed, each linked to its document in `content/concepts`. Every entry in that list must resolve to a real document, either an existing concept or one created in the previous step. When the subject is a file in the project, the opening links to it with a markdown link (from `content/writeups/<slug>/index.md`, a file in `source/` is `../../../source/<filename>`); when it is at an address, the opening links to the address; when it is a published work, the opening cites it.

A writeup about someone else's material refers to that material as "the document" (or "the paper", "the chapter") and to its writer as "the author", so that it is evident from the writing alone that it discusses another work.

## Frontmatter and description

Every document begins with YAML frontmatter giving its `title`, its `created` date (today, as `YYYY-MM-DD`), and `depends_on`: the slugs of the documents a reader must understand first. For a writeup these are the concepts it relies on. For a concept they are the prerequisite concepts it builds on, and only those, since they draw the arrows of the site's map and its reading order. When an existing document is revised rather than created, add or update its `updated` date and leave `created` alone. Document-specific KaTeX macros go under `katex_macros`.

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

Write every document in the register of a textbook: impersonal third-person exposition, complete sentences in paragraph prose rather than fragments, and no excessive tables or itemized lists. Never address the reader directly and never write in the first person; these are expositions of a subject, not notes about a conversation. Each document must be self-contained: it must not reference this conversation or session, it must not assume any document has been read other than those explicitly linked as prerequisites, and it must read as though written for any reader approaching the subject for the first time.

When a document builds on another, list it in `depends_on` and also say so near the top with a link, for example "This document builds on [Basis points](../basis-points/).", so the chain of documents is easy to follow. Link to documents with relative paths to their folders: `../../concepts/<concept>/` from a writeup, `../<concept>/` from one concept to another. Backward links to prerequisite concepts are expected and encouraged; forward links from a concept to those that build on it should be placed sparingly (typically at the end) and must never be used to frame the document's purpose or motivation.

Never put a link inside a heading or title. Keep every heading as plain text, and when a section concerns an existing concept document, place the link on its own line directly below the heading, as `See also: [Concept name](../../concepts/concept-name/)`. Use the same `See also:` form for any other link associated with a section, rather than embedding it in the title.
