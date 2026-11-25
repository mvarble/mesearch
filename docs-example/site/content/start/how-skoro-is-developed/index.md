---
title: How skoro is developed
summary: Mathematics first, then the design, a plan, the code, and last the pages that say what is.
order: 91
---

Every change to skoro is an entry in the [archive](../../archive/), worked on in a branch of its
own and moved through a fixed series of stages. Each stage ends when a person approves what it
produced; nothing moves on by itself.

## Features

A feature (an algorithm, a distribution, an example) goes through five stages.

1. **Mathematics.** A writeup of the mathematics at play, revised until it is right. Ideas that
   stand on their own become [math notes](../../math/), which later writeups build on.
2. **Implementation.** A companion that turns the mathematics into a design: the types and traits,
   sketched in code, where the neighbouring interfaces constrain them, and the tests that will show
   the design works. It is meant to be complete enough that someone who knows Rust, the mathematics
   and those interfaces could build it without designing anything of their own.
3. **Plan.** The implementation's prose distilled into a checklist of tasks, each with its tests.
4. **Build.** The code, committed as the plan's boxes are ticked.
5. **Publish.** The pages of the guide and the concepts are brought up to date, quoting the code
   that now exists, and the entry is linked to the pages it changed.

A **decision** (a position the library takes) is written up and published. A **chore** (a port, a
refactor) is planned, built and published.

## What the stages guarantee

The stages are kept by a small tool, `bin/wf`, and checked on every pull request:

- A branch works on one entry at a time.
- An approved document is frozen. Changing it means reopening its stage, which is recorded, with
  its reason, in the entry's history. A design is allowed to change its story; it is not allowed to
  forget it.
- Code changes only once a plan is approved, and the pages that say what skoro is change only at
  the end, when there is code to quote.
- An entry is finished, or explicitly set aside, before its branch merges.

The procedure itself, written for the agents that help with it, is in the repository's
[`AGENTS.md`](https://github.com/mvarble/skoro/blob/main/AGENTS.md).
