<p align="center">
  <img src="https://raw.githubusercontent.com/mvarble/mesearch/main/logo.svg" alt="mesearch logo; man on toilet looking at phone" width="128">
</p>

# mesearch

An opinionated static site for a library of notes: concepts, writeups and sequences under `content/`, rendered as a textbook with KaTeX, a dependency map and an index. See [packages/mesearch](./packages/mesearch/README.md) for what it does and how to use it.

```sh
pnpm add @mvarble/mesearch && pnpm exec mesearch init && pnpm dev
```

This repository is a pnpm workspace of the packages mesearch is built from, which [mkdoc](https://github.com/mvarble/mkdoc) and [the blog](https://github.com/mvarble/blog) use too:

| package                                             |                                                                                                                                                                                                                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [`@mvarble/mesearch`](./packages/mesearch)          | The CLI (`init`, `dev`, `build`) and the SvelteKit app every site is built with.                                                                                                                                                                                      |
| [`@mvarble/mesearch-cms`](./packages/cms)           | The content database: documents, pages, numbered equations and statements, references, outlines, folded KaTeX macros. It is kept current by a Vite plugin and queried through a virtual module, and comes with a preset for mesearch's layout and one for the blog's. |
| [`@mvarble/mesearch-ui`](./packages/ui)             | The Svelte components and styles the app is made of (rail, map, index, contents, sequences, light and dark tokens), usable from any SvelteKit site.                                                                                                                   |
| [`@mvarble/mesearch-markdown`](./packages/markdown) | The mdsvex pipeline: KaTeX with layered macros, scrollable display math, Shiki highlighting with fenced file imports, relative assets.                                                                                                                                |

[`example/`](./example) is a small site built with the workspace's own packages.

## Development

```sh
pnpm install
pnpm build              # every package, with tsc (svelte-package for the UI)
pnpm test               # unit tests, and an end-to-end build of example/
pnpm lint               # prettier and eslint
pnpm example:dev        # the example site, live
pnpm example:build
```

The packages are written in TypeScript that Node can run directly (type stripping), so their tests import the sources and need no build first. The exceptions are the end-to-end test, which runs the built CLI, and the UI package's tests, which package the library first.

### Publishing

The packages depend on one another through `workspace:^`, which pnpm replaces with real versions on publish:

```sh
pnpm -r publish --access public
```

mkdoc and the blog depend on the published `@mvarble/mesearch-markdown`, `@mvarble/mesearch-cms` and (the blog) `@mvarble/mesearch-ui`, so their lockfiles can be refreshed only once these are on npm.
