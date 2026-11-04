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
import { markdownPreprocessors } from '@mvarble/mesearch-markdown';

import { notesPreset } from './src/lib/cms/preset.ts';

const cms = createCms({ preset: notesPreset(), virtualId: '$cms' });

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

## Writing a preset

The CMS knows nothing about any one site's folders or frontmatter. A site describes them in a _preset_, kept beside its routes:

- `contentDir` and `include` say which files are content.
- `doctypes` say what each file contributes. A doctype registers documents, pages and anchors in a first pass. It then resolves what those refer to in a second pass, once every document is known, so the result never depends on the order the files are read in. A last `finalize` pass derives whatever needs the whole site.
- `resolvers` say what a link or a piece of math refers to.
- `snapshot` picks the serialisable part of the store.
- `runtime` is the module that turns a snapshot into queries. It exports `bind(snapshot)` and nothing else is required of it: the plugin keeps the queries live while the dev server runs.

Give `runtime` as a path relative to the project root (`'./src/lib/cms/runtime.ts'`), as an absolute path, or as a file URL (`new URL('./runtime.js', import.meta.url)`, for a preset shipped in a package). The runtime is bundled into the server build, so it should import only from `@mvarble/mesearch-cms/runtime`, which holds `live`, `buildOutline`, `citationLabel` and the shared types, and reads no files.

```ts
// src/lib/cms/preset.ts
import {
    bibtexDoctype,
    bibliographies,
    citations,
    docRecord,
    equations,
    fileLinks,
    numberDocument,
    pageLinks,
    statements,
    type Doctype,
    type Preset,
} from '@mvarble/mesearch-cms';

export function notesPreset(): Preset {
    const links = fileLinks({ contentDir: 'content' });
    const note: Doctype = {
        name: 'note',
        claims: (file) => /^content\/notes\/[^/]+\/index\.md$/.test(file.id),
        initialize(store, file) {
            const pathname = file.id.replace(/^content\/|\/index\.md$/g, '');
            const title = String(file.frontmatter.title ?? pathname);
            store.addDoc(docRecord(file.id, 'note'));
            store.addPage({ pathname, doc: file.id, formats: { title, full: title } });
            numberDocument(store, file, {
                page: pathname,
                isComponent: (specifier) => specifier == '$lib/Statement.svelte',
            });
        },
    };
    return {
        name: 'notes',
        contentDir: 'content',
        include: (id) => id.endsWith('.md') || id.endsWith('.bib'),
        doctypes: [note, bibtexDoctype()],
        resolvers: [
            equations({ url: (page, slug) => links.url(page, `#eq:${slug}`) }),
            statements({ url: (page, slug) => links.url(page, `#${slug}`) }),
            citations({ url: (key) => `#cite:${key}` }),
            pageLinks(links),
        ],
        headingDepth: 3,
        runtime: './src/lib/cms/runtime.ts',
        snapshot: (store) => ({
            pages: [...store.pages.keys()],
            bibliography: bibliographies(store),
        }),
    };
}
```

Two complete presets show what a real one looks like:

- mesearch's, in [`@mvarble/mesearch`](../mesearch/src/preset), is concepts, writeups and sequences with a dependency graph.
- [skoro](https://github.com/mvarble/skoro)'s, in `site/src/lib/cms/`, is tracks of pages, math notes, and an archive of entries with their workflow records.

The core's own tests run against the blog's preset, kept in [`test/blog-preset/`](./test/blog-preset).

### The kit

What every layout so far has needed, in the same shape:

| Export                                                                      | What it does                                                                                                                                                                                                 |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `numberDocument(store, file, options)`                                      | Numbers a document's equations and the statements it shows, recursively, in reading order. It counts from one, or carries on with a `next()` you pass in.                                                    |
| `fileLinks({ contentDir, base, folderNames, homeNames })`                   | Takes links written as paths on disk (`../other/`, `../x/index.md`) or as site paths, and finds the page they name. Hand the result to `pageLinks`, or use its `locate` and `url` in a resolver of your own. |
| `bibtexDoctype()`, `bibliographies(store)`                                  | Every `.bib` file adds to one bibliography. `bibliographies` gives, by page, what that page cites.                                                                                                           |
| `gitDates(root, dir)`                                                       | A document folder's created and updated dates, taken from git with file times as the fallback.                                                                                                               |
| `firstHeading`, `plainText`, `referenceText`, `wordCount`, `readingMinutes` | Prose for previews: titles taken from headings, summaries with resolved references, and reading times.                                                                                                       |
| `findSibling(store, folder, name)`                                          | `<folder>/<name>.md` or `.svx`, whichever exists.                                                                                                                                                            |
| `reportProblems(store, fm)`                                                 | Hands a `Frontmatter` reader's problems to the store.                                                                                                                                                        |
| `registerStatement`, `walkDocument`, `parseHeadings`, `Frontmatter`         | The lower-level pieces the helpers above are built from.                                                                                                                                                     |

The BibTeX reader decodes LaTeX accents and drops protective braces. A `cite:` link points at the reference list at the end of its own page.

### From 0.1 and 0.2

0.1 and 0.2 shipped the presets under `@mvarble/mesearch-cms/presets/*`: `blogPreset` in both, and `mesearchPreset` and `skoroPreset` in 0.2. The blog's preset is the same in both releases, so the steps below take a site straight to 0.3:

1. Copy the preset's `index.ts`, `runtime.ts` and `types.ts` into the site, for instance into `src/lib/cms/`. For the blog, the copy is [`test/blog-preset/`](./test/blog-preset).
2. Point their imports at the package.
    - In a copy of the 0.2 sources, the relative `../../core/...`, `../../model/...`, `../../resolvers/...` and `../text.ts` imports become `@mvarble/mesearch-cms`.
    - In a copy of `test/blog-preset/`, the same goes for `../../src/core/...`, `../../src/kit/index.ts`, `../../src/model/...` and `../../src/resolvers/...`.
    - In `runtime.ts` and `types.ts`, `../../src/runtime-kit.ts` and the outline, citation and statement types come from `@mvarble/mesearch-cms/runtime` instead.
3. Set `runtime` to the copy's path from the project root (`'./src/lib/cms/runtime.ts'`), and delete `bindLive` from the runtime if it has one.
4. Point the site's imports of `@mvarble/mesearch-cms/presets/<name>[/runtime]` at the copy, or at `@mvarble/mesearch-cms/runtime` for `citationLabel`, `StatementInjection` and the outline types.

## How changes propagate

Every document has _facts_: everything the markdown plugins and module injection read for it, such as its labels, resolved references, headings and folded macros. When the content changes, the store is rebuilt and the facts compared. Only the documents whose facts changed are recompiled, even when the file that changed was a different one: inserting a statement renumbers every later statement in its scope.
