# Writing for Probability, from the ground up

This repository is a [mesearch](https://github.com/mvarble/mesearch) site: a library of documents written to be read and learned from. `mesearch dev` serves it while you write and `mesearch build` writes the static site to `build/`. Everything about how the site looks is mesearch's; this repository holds only the documents and a little configuration.

This file holds what is particular to this site. How a mesearch site is written in general is kept in two files that belong to mesearch. A project made with `mesearch init` has its own copies in `.agents/skills/explain/`; this example lives beside the package, and reads them where they are kept:

- `../packages/mesearch/skills/authoring.md`: the conventions --- where documents go, their frontmatter, links and prose, and how mathematics, statements, proofs, citations and plots are written. Read it before writing or editing any document here.
- `../packages/mesearch/skills/explain/SKILL.md`: an [agent skill](https://agentskills.io), the procedure for explaining whatever is asked for --- a concept, a document in `source/` or elsewhere, an algorithm, a theorem, a textbook chapter. Follow it when asked to explain something.

Whatever this site does differently is written below, and this file wins wherever it disagrees with them.

## Site-specific opinions

<!-- Opinions particular to this site go here: its subject, the reader's
background, notation conventions, what to emphasise, and anything it does
differently from mesearch's conventions. For example:

- The reader is comfortable with undergraduate real analysis.
- Write probability measures as \PP and expectations as \EE.
-->
