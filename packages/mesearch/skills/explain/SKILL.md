---
name: explain
description: Explains whatever the prompt names in a mesearch site (a concept, a document in source/ or elsewhere, a paper, an algorithm, a theorem, a textbook or one of its chapters, a problem, a question) by assessing what the reader already knows and writing one textbook-style document: a concept in content/concepts/ or, where there is something to work through, a writeup in content/writeups/. The concepts it needs are explained in its own sections unless the site already explains them or they are large enough to need a document of their own. Use when asked to explain, teach, summarise, document or write a companion for anything, or when invoked as /explain <prompt>.
---

# Explain

This procedure produces textbook-style documents that explain a subject. The request that invoked this skill is the prompt, and it may be anything: a concept named or loosely described, a document in `source/` or at some other path or address, an algorithm, a theorem, a textbook or one of its chapters, a problem, a question. If the request names nothing to explain, ask what is meant, listing `source/` if the project has one. Work through the following five phases in order.

The documents live in a [mesearch](https://github.com/mvarble/mesearch) site: one folder per document under `content/`, `content/concepts/<slug>/index.md` for concepts and `content/writeups/<slug>/index.md` for writeups. If the project has an `AGENTS.md`, read it before anything else. It holds what is particular to the site (its subject, its reader, its notation, whatever it does differently), and it takes precedence over this procedure and over `authoring.md` wherever they differ. This file and `authoring.md` belong to mesearch and are replaced whenever `mesearch init` is run, so a change meant to last is made in `AGENTS.md`, never here.

A run normally writes **one** document. The concepts that document needs are explained in sections of it, not in small documents of their own. A concept is kept out of the document in only two cases: the site already explains it, in which case it is linked, or explaining it takes several sections, in which case it gets a document of its own. [Place each concept](#place-each-concept) gives the rule in full.

# Survey the site

Before deciding anything, find out what the site already explains. A concept may have been introduced in any of three places: a document of its own in `content/concepts/`, a section of some other document, or a statement in a `statements/` folder. Listing `content/concepts/` finds only the first of these, so search the text itself:

```sh
grep -rnE '^(title|kind):|^#+ ' content/ --include='*.md' --include='*.svx'
```

This prints the title of every document and statement and the heading of every section: a map of what has been introduced and where. Keep it at hand for the rest of the run.

From then on, whenever a concept comes up (the subject itself, something the material assumes, a prerequisite uncovered while assessing), search for it by name before deciding anything about it, ignoring case and trying each name and spelling it goes by:

```sh
grep -rniE 'sigma.algebra|sigma.field|\\sigma\$-algebra|σ.algebra' content/
```

Read what the search finds. A passage introduces a concept only if it explains it: defines it, motivates it, or gives it a section or a statement. A term that is merely used or mentioned has not been introduced.

# Identify the subject

Work out what the prompt points at, and so what will be written.

- **A single idea**: a concept, a definition, a quantity, a term. It is explained by a document in `content/concepts/` and needs no writeup. Resolve the prompt into one clearly named concept. Then check the survey: if a document for it already exists, link it, state what it already covers, and treat it as the foundation of this run. If it is so far explained only in a section of another document, the run writes the fuller concept document, which links back to that section and does not repeat it.
- **Something to work through**: a document, a paper, an algorithm, a theorem and its proof, a chapter, a problem, a topic that draws several ideas together. It is explained by a writeup in `content/writeups/`, which introduces the concepts it needs in sections of its own.

A prompt may be loose, partial, or may point at an idea without naming it. If it is ambiguous, could reasonably mean several distinct things, or leaves it unclear which of the two cases above applies, ask for clarification before going further. Once confident, state what will be explained and the document that is expected to produce.

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

Do not assume the subject is already known, or that any material has already been read. For the subject itself, and for each concept or piece of context it rests on, ask questions to establish the current level of understanding. If the answers warrant further inquiry, keep asking follow-up questions until that understanding is clear; questions may be grouped into a single message rather than asked one at a time. Before asking about a concept, search the site for it as in the survey: for any concept the site already explains, in a document of its own or in a section of another, understanding may be assumed to the extent that the document or section covers, and no questions about that material are needed.

Many concepts rest on others. A missing prerequisite is itself a concept worth explaining, and explaining it may be the best route to the subject originally requested. Keep track of these prerequisites as you go; they determine what the document must explain before it reaches its subject.

# Write the documents

Once both the subject and the current level of knowledge are understood, write the document identified at the start: the concept document or the writeup.

## Place each concept

Before writing, list the concepts the explanation requires: every idea that must be explained, and not merely mentioned, for the subject to be understood. Search the site for each one, as in the survey. The document the run was asked for is written whatever its size; the rule below governs the other concepts it needs. Each of them goes in exactly one place, decided by the first of these that applies:

1. **The site already explains it: link to it.** This holds whether the explanation is a document of its own or a section of another document. Link to the document, or to the section by its anchor, or refer to the statement that defines it as `authoring.md` describes, and do not explain the concept again; a sentence recalling what it is, so that the prose reads without the link being followed, is enough. If the existing explanation stops short of what this document needs, link to it and add only what is missing. Never rewrite, replace, or duplicate what an existing document says.
2. **Explaining it takes several sections: give it a document of its own.** Create `content/concepts/<concept>/index.md` only for a concept that a single section cannot hold, because a proper account of it has several parts that are each a section in their own right: its definition and motivation, say, then its properties with their proofs, then worked examples. Name the folder after the concept it explains (for example, `content/concepts/net-interest-margin/index.md`), and link to the document from the one that depends on it.
3. **Otherwise: a section of the document being written.** This is the default, and where most concepts go. Give the concept a section whose heading is its plain name, so that later searches find it, and place the section before the material that relies on it. This applies equally when the document being written is itself a concept document: a prerequisite the site does not yet explain becomes a section of that document.

The test in the second case is the size of the explanation, not the importance of the concept. A concept that is central to the subject, formally defined, or likely to recur elsewhere still belongs in a section if a section holds it: a later run that needs it will find the section by searching and link to it there. A concept document of a few paragraphs, or one that holds a definition and an example and exists so that another document can link to it, is the outcome to avoid. When in doubt, write the section.

A subject that is composite (really several ideas standing on one another) is still one document. Order its sections so that each relies only on what was explained before it.

A section that introduces a concept explains the concept itself: what it is, why it matters, and an example. It may be motivated by the document it sits in, but it states the concept generally enough that another document can link to it.

A concept document, when one is written, must be self-contained, written as paragraph prose, and explain the concept on its own terms rather than only as it appears in the material at hand. It must stand on its own: it explains the concept for its own sake, with its own motivation, significance, examples, and applications. A concept document is not a stepping stone written to support a writeup or any future document. It may mention concepts that build on it, and it may link forward to them, but it must not frame itself as preparation for those concepts — its reason for existing is the concept itself, not the role it plays in explaining something else. A concept that cannot carry a document on those terms belongs in a section instead.

Wherever a concept is explained — in a concept document or in a section of another document — a concrete example is preferred if a suitable one is available: an example from the material at hand when it provides one, and otherwise a simple illustration. A concept is best understood through an example, so an abstract definition alone is not sufficient when an example would make it clearer. If the concept includes anything mathematical, prefer mathematical expressions written in LaTeX markup — inline math where it reads naturally within a sentence, and displayed equations for anything that needs its own line — rather than plain-text notation or a prose description of the formula.

## Write the writeup

If the subject is something to work through, write `content/writeups/<slug>/index.md`: a textbook-style chapter that develops the foundational and contextual knowledge the subject assumes and then works through the subject itself. Name the folder after the subject, in lowercase words joined by hyphens and never dated. For a file in `source/`, the slug is the title taken from its filename, without its date (for `source/2026-09-30-bayes-rule.md`, the slug is `bayes-rule`).

What the writeup does depends on what it is about:

- For a document, a paper or a chapter, it is a companion read alongside the material: an analysis that supplies what the material assumes and clarifies whatever is complex or unclear in what it presents. It follows the material's argument without reproducing its text.
- For an algorithm, it states the problem solved, develops the idea that makes the algorithm work, gives the algorithm itself, traces it on a small example, and argues its correctness and its cost.
- For a theorem, it motivates the statement, states it, and proves it, saying what each step of the proof achieves.
- For a problem or a question, it works to the answer and says why each step is taken.

Begin the writeup by stating what it explains, followed by the concepts it relies on that are explained elsewhere in the site, each linked to the document or section that explains it. Every such link must resolve to a real document, either one that already existed or one created in the previous step. The concepts the writeup introduces in its own sections need no such list: the table of contents beside the page shows them. When the subject is a file in the project, the opening links to it with a markdown link (from `content/writeups/<slug>/index.md`, a file in `source/` is `../../../source/<filename>`); when it is at an address, the opening links to the address; when it is a published work, the opening cites it.

A writeup about someone else's material refers to that material as "the document" (or "the paper", "the chapter") and to its writer as "the author", so that it is evident from the writing alone that it discusses another work.

## Frontmatter and description

Every document begins with YAML frontmatter giving its `title`, its `created` date (today, as `YYYY-MM-DD`), and `depends_on`: the slugs of the documents a reader must understand first. For a writeup these are the documents it relies on. For a concept they are the prerequisite documents it builds on, and only those, since they draw the arrows of the site's map and its reading order. A concept explained in a section of the document itself is not a dependency and is never listed. A concept explained in a section of another document is listed, as that document, only when a reader would be lost without it; otherwise the link in the text is enough. When an existing document is revised rather than created, add or update its `updated` date and leave `created` alone. Document-specific KaTeX macros go under `katex_macros`.

```yaml
---
title: Net interest margin
created: 2026-10-01
depends_on: [basis-points, interest-income]
---
```

Beside each new `index.md`, write a `description.md`: one or two plain sentences, with no frontmatter, saying what the document covers. The site shows it as a preview.

## Conventions

Before writing anything, read `authoring.md`, which sits beside this file, and follow it: it says where documents go and how their frontmatter, links, prose, mathematics, numbered equations, statements, proofs, citations and plots are written in a mesearch site.

## Structure and prose

Write every document in the register of a textbook: impersonal third-person exposition, complete sentences in paragraph prose rather than fragments, and no excessive tables or itemized lists. Never address the reader directly and never write in the first person; these are expositions of a subject, not notes about a conversation. Each document must be self-contained: it must not reference this conversation or session, it must not assume any document has been read other than those explicitly linked as prerequisites, and it must read as though written for any reader approaching the subject for the first time.

When a document builds on another, list it in `depends_on` and also say so near the top with a link, for example "This document builds on [Basis points](../basis-points/).", so the chain of documents is easy to follow. Link to documents with relative paths to their folders: `../../concepts/<concept>/` from a writeup, `../<concept>/` from one concept to another. Link to a section of another document by adding its anchor, as in `../lebesgue-integral/#countable-additivity`; `authoring.md` gives the rule that turns a heading into its anchor. Since that rule keeps only unaccented letters and digits, name a concept in its heading in plain words or LaTeX, not in symbols typed directly. Backward links to prerequisite concepts are expected and encouraged; forward links from a concept to those that build on it should be placed sparingly (typically at the end) and must never be used to frame the document's purpose or motivation.

Never put a link inside a heading or title. Keep every heading as plain text, and when a section concerns a concept explained in another document, place the link on its own line directly below the heading, as `See also: [Concept name](../../concepts/concept-name/)`. Use the same `See also:` form for any other link associated with a section, rather than embedding it in the title.
