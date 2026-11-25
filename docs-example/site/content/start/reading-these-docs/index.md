---
title: Reading these docs
summary: Two tracks that say what skoro is, notes of the mathematics, and an archive of how it came to be.
order: 90
---

These docs are kept in four parts, and each answers a different question.

## What skoro is

Two tracks say what the library is today, and are rewritten whenever it changes.

- **The [guide](../../guide/) is top-down.** It starts from what a user writes (a model, a
  distribution, a density to evaluate) and reaches into the machinery only as far as an example
  needs. Read it to use skoro.
- **The [concepts](../../concepts/) are bottom-up.** They build the library from its primitive
  objects upward, each idea resting only on the ones before it. Read them to understand why skoro
  works the way it does, or before changing it.

The [reference](../../reference/) holds what is looked up rather than read: the crates, the
glossary, the notation.

## What it rests on

The [mathematics](../../math/) is a library of notes, one idea to a note: a retraction, a tangent
space, the Fisher information. A note says what it builds on, and the map on that page draws the
whole network, together with the archive's writeups that use it.

## How it came to be

The [archive](../../archive/) keeps the record of every piece of development. A feature's entry
holds the mathematics worked out for it, the implementation companion that turned the mathematics
into a design, and the plan it was built by, each kept as it was approved. A decision's entry holds
the argument for it.

The archive is history, and history is not rewritten. Where the concepts track _tells_ you what is,
an entry _discusses_ what might be, as it stood when it was written. When the library later
changes, a new entry revises the old one, and the old one says so at its top. Every page lists the
entries that made it what it is, under "How this came to be", and every entry lists the pages it
changed.

> [!NOTE]
> Every document is also served as Markdown (follow "View as Markdown" at its foot), and
> [llms.txt](../../llms.txt) indexes all of them for language models.
