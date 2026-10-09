# @mvarble/mesearch-cms

A content database for sites built from markdown and mdsvex documents. It is an in-memory store, rebuilt from the content on every change, holding:

- documents and the pages they are shown on;
- numbered equations and statements, scoped to a post or sequence;
- references between documents, resolved by pluggable resolvers;
- each document's outline;
- KaTeX macros, folded down the tree of documents.

A Vite plugin keeps it current during development and serves it to routes as a server-only virtual module of typed queries.

```js
// vite.config.ts
import { createCms } from '@mvarble/mesearch-cms';
import { blogPreset } from '@mvarble/mesearch-cms/presets/blog';
import { markdownPreprocessors } from '@mvarble/mesearch-markdown';

const cms = createCms({ preset: blogPreset(), virtualId: '$cms' });

export default defineConfig({
    plugins: [
        ...cms.vite(),
        sveltekit({
            preprocess: markdownPreprocessors({
                remarkPlugins: [cms.remark],
                katex: { macros: cms.macrosFor },
            }),
        }),
    ],
});
```

```ts
// +page.server.ts
import { cms } from '$cms';
export const load = () => ({ posts: cms.posts.list({ limit: 3 }) });
```

`$cms/loaders` default-exports a dynamic import of every document's component, keyed by filename, and is safe to use in the browser.

## Presets

- **`mesearchPreset`** --- `content/{concepts,writeups,sequences}/<slug>/index.{md,svx}`. It reads `depends_on` and sequence membership, takes dates from git, resolves links written as paths on disk, and builds the dependency graph. Equations and the statements a document shows share one count per document. Every `.bib` file under `content/` adds to one bibliography.
- In both presets a `cite:` link points at the reference list at the end of its own page, and `cms.bibliography(page)` gives what that list holds: everything the page, its statements and its description cite.
- Both presets share the statement registration (`core/statements.ts`) and the BibTeX reader (`core/bibtex.ts`). The reader decodes LaTeX accents and drops protective braces.
- **`skoroPreset`** --- the documentation of [skoro](https://github.com/mvarble/skoro): `content/<track>/<slug>/index.{md,svx}` pages in the tracks it is given, in `order`; `content/math/<slug>/` notes; and `content/archive/<slug>/` entries, each an `index` beside its documents (`math`, `implementation`, `plan`, `writeup`) and a `workflow.json` stage record. An entry lists the `pages` it changed and the entries it `revises`, and the runtime gives each page the entries that changed it and each entry the ones that revise it. Math notes and entry documents make up the dependency graph. Numbering, statements, citations and links work as in `mesearchPreset`.
- **`blogPreset`** --- the blog's `type: post | sequence | statement` documents and `.bib` bibliographies. Statements and equations share one counter per post or sequence, and the preset provides the `cite:`, `eq:` and `statement:` references and the `%title`, `%label`, `%sequence` and `%full` link text.

A preset is a list of doctypes and resolvers (see `Doctype` and `Resolver`). A doctype registers what a file contributes in a first pass, then resolves what it refers to in a second, once every document is known, so the result never depends on the order the files are read in.

## How changes propagate

Every document has _facts_: everything the markdown plugins and module injection read for it, such as its labels, resolved references, headings and folded macros. When the content changes, the store is rebuilt and the facts compared. Only the documents whose facts changed are recompiled, even when the file that changed was a different one: inserting a statement renumbers every later statement in its scope.
