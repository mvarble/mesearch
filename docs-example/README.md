# docs-example

A documentation site built with [`@mvarble/mesearch-workflow`](../packages/workflow), as a project's
`site/` would be: `workflow.config.ts` here is the project's, and `site/` the site. Its content is
a document of every kind (pages in tracks, math notes in parts, a finished entry and one in
progress that revises it, a statement, a citation, a graph and a quotation of code), so that every
route renders something.

```sh
pnpm docs-example:build     # from the workspace root
pnpm --filter mesearch-docs-example check
pnpm --filter mesearch-docs-example test    # with the app's own tests
```

Its route and component wrappers are as `mesearch-wf sync` writes them, which a test of the package
holds them to; its home page, layout, `site.ts`, logo and colours are its own.
