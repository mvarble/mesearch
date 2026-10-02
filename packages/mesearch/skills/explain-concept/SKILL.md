---
name: explain-concept
description: Teaches a concept in a mesearch site by assessing what the reader already knows about it and its prerequisites, then writing one or more textbook-style documents in content/concepts/. Use when asked to explain, teach or document a concept or idea that is not tied to a particular source document, or when invoked as /explain-concept <description>.
---

# Explain a concept

This procedure produces a textbook-style document (or set of documents) explaining a concept. The request that invoked this skill describes the concept. If it describes none, ask which concept is meant. Work through the following three phases in order.

The documents live in a [mesearch](https://github.com/mvarble/mesearch) site: one folder per document under `content/`, so a concept is `content/concepts/<slug>/index.md`. If the project has an `AGENTS.md`, read it before anything else. Its conventions for this site (layout, frontmatter, links, notation, and any site-specific opinions) take precedence over this procedure wherever the two differ.

# Identify the concept

Resolve the description into one clearly named concept. The description may be loose, partial, or may point at an idea without naming it; if it is ambiguous, or could reasonably mean several distinct concepts, ask for clarification before going further. Once confident, state the concept that will be explained.

Then check `content/concepts/*/`:

- If a document for this concept already exists, link it and state what it already covers. Treat that existing document as the foundation of this run — it must not be rewritten, replaced, or duplicated.
- If it does not exist, this run will create it.

# Assess prior knowledge

Do not assume the concept is already known. Ask about it, and about the concepts it builds on, and keep asking follow-up questions until the current level of understanding is clear. Before asking about a concept, check `content/concepts/*/`: for any concept documented there, understanding may be assumed to the extent that its document covers, and no questions about that material are needed.

Many concepts rest on others. A missing prerequisite is itself a concept worth explaining, and explaining it may be the best route to the concept originally requested. Keep track of these prerequisites as you go; they determine the documents written next.

# Write the document (or several)

Write documents under `content/concepts/` that explain the concept and everything it depends on.

- If the concept is one idea a single document can carry, write `content/concepts/<concept>/index.md`.
- If it is composite — really several ideas standing on one another — write one document per idea, building them in dependency order so that each document relies only on concepts explained before it. A single file must not be overloaded with material that deserves its own.

Name each folder after the concept it explains (for example, `content/concepts/net-interest-margin/index.md`) so later runs can discover it.

## Maintain the concept library

Every concept addressed must have its own document in `content/concepts/`. Before writing, list the concepts the explanation requires and check each against `content/concepts/*/`:

- If a concept is already documented there, link to that existing document. Never rewrite, replace, or duplicate an existing concept document.
- If a concept is **new** — it is worth addressing but was not already present in `content/concepts/` — it deserves its own file. Create `content/concepts/<concept>/index.md` and link to it from the documents that depend on it.

The bar for "worth addressing" is exactly whether a document must explain the concept: any concept that earns a paragraph, section, or explicit definition is worth its own file. A term merely mentioned in passing without being explained need not become a concept document. When in doubt, create the file — a concept essential to this one is likely to recur in others.

A concept document must be self-contained, written as paragraph prose, and explain the concept on its own terms rather than only as it appears in some other document. Each document must stand on its own: it explains the concept for its own sake, with its own motivation, significance, examples, and applications. A concept document is not a stepping stone written to support a future document. It may mention concepts that build on it, and it may link forward to them, but it must not frame itself as preparation for those concepts — its reason for existing is the concept itself, not the role it plays in explaining something else.

Wherever a concept is explained, a concrete example is preferred if a suitable one is available: an example from the material at hand when it provides one, and otherwise a simple illustration. A concept is best understood through an example, so an abstract definition alone is not sufficient when an example would make it clearer. If the concept includes anything mathematical, prefer mathematical expressions written in LaTeX markup — inline math where it reads naturally within a sentence, and displayed equations for anything that needs its own line — rather than plain-text notation or a prose description of the formula.


## Frontmatter and description

Every document begins with YAML frontmatter giving its `title`, its `created` date (today, as `YYYY-MM-DD`), and `depends_on`: the slugs of the prerequisite concepts it builds on, and only those, since they draw the arrows of the site's map and its reading order. When an existing document is revised rather than created, add or update its `updated` date and leave `created` alone. Document-specific KaTeX macros go under `katex_macros`.

```yaml
---
title: Net interest margin
created: 2026-10-01
depends_on: [basis-points]
---
```

Beside each new `index.md`, write a `description.md`: one or two plain sentences, with no frontmatter, saying what the concept is. The site shows it as a preview.

## Mathematics, statements and citations

Before writing anything, read `authoring.md`, which sits beside this file, and follow it: it says how mathematics, numbered equations, statements, proofs and citations are written in a mesearch site.

## Structure and prose

Write each document in the register of a textbook: impersonal third-person exposition in paragraph prose, complete sentences rather than fragments, and no excessive tables or itemized lists. Never address the reader directly and never write in the first person; these are expositions of a subject, not notes about a conversation. Each document must be self-contained: it must not reference this conversation or session, and it must not assume any document has been read other than those explicitly linked as prerequisites. When a document builds on another, list it in `depends_on` and also say so near the top with a link, for example "This document builds on [Basis points](../basis-points/).", so the chain of documents is easy to follow. Link to other concepts with relative paths to their folders, as `../<concept>/`. Backward links to prerequisite concepts are expected and encouraged; forward links to concepts that build on the current one should be placed sparingly (typically at the end) and must never be used to frame the document's purpose or motivation.

Never put a link inside a heading or title. Keep every heading as plain text, and when a section concerns an existing concept document, place the link on its own line directly below the heading, as `See also: [Concept name](../concept-name/)`. Use the same `See also:` form for any other link associated with a section, rather than embedding it in the title.
