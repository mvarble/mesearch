# @mvarble/mesearch-ui

The Svelte 5 components and stylesheets that [mesearch](https://github.com/mvarble/mesearch) sites are made of, published so that another SvelteKit site can look and behave the same. [The blog](https://github.com/mvarble/blog) uses it this way.

You get:

- the rail (a dock on phones) with its search palette and theme toggle;
- the force-laid-out map of documents and its detail panel;
- the fuzzy index;
- a three-column article layout with a scroll-spied table of contents and a sequence track;
- the light and dark tokens behind all of it.

Nothing here knows how a site stores content or lays out its URLs. Every component is handed its data, with each link's `url` already worked out.

```sh
pnpm add @mvarble/mesearch-ui
```

## Setting up a site

**Root layout.** Load the styles, then wrap the pages in `Shell`:

```svelte
<script lang="ts">
    import '@mvarble/mesearch-ui/fonts'; // the default typefaces; optional
    import 'katex/dist/katex.min.css';
    import '@mvarble/mesearch-markdown/styles/katex.css';
    import '@mvarble/mesearch-ui/styles/index.css';
    import { goto } from '$app/navigation';
    import { configure, Shell } from '@mvarble/mesearch-ui';

    let { children } = $props();
    configure({ lang: 'en', kinds: { post: 'Post' } });
</script>

<Shell
    title="My site"
    home="/"
    links={[{ url: '/posts/', label: 'Posts', icon: 'pen' }]}
    search="/search.json"
    navigate={goto}
>
    {@render children()}
</Shell>
```

**Theme script.** Paste `THEME_SCRIPT` into a `<script>` in `app.html`'s `<head>`, and give `<html>` the attribute `data-theme="light"`.

- It applies the reader's stored choice, or the system's, before anything paints.
- It adds the `js` class that the controls key on.
- A page read without JavaScript stays light.

**Search.** `search` points at a JSON array of `SearchEntry`, usually a prerendered endpoint. The array is fetched the first time the palette opens. You can pass a function returning the entries instead.

## Components

| component                                | what it is                                                                                                                                                                                       |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Shell`                                  | Rail, palette, skip link, and the margin the rail needs. Starts the theme.                                                                                                                       |
| `Article`                                | A document page. The header, the prose, then `after` and a `footer`. `left` and `right` snippets sit in the margins on wide screens and fold into disclosures under the header otherwise.        |
| `ArticleHeader`                          | Breadcrumbs, title, dates, reading time, and "Builds on" chips.                                                                                                                                  |
| `Toc`                                    | Nested contents with scroll-spy.                                                                                                                                                                 |
| `SequenceTrack`                          | A sequence as a line of stations, with nested stops for sections and the current stop filled.                                                                                                    |
| `Pager`, `Parts`, `Chips`                | Previous and next, a numbered list of parts, and a row of document links.                                                                                                                        |
| `Graph`                                  | The map, with nodes laid out in advance by `layoutGraph`. It is drawn without JavaScript and simulated live with it. Clicking a node opens `GraphPanel` (a drawer, or a bottom sheet on phones). |
| `Index`                                  | Every entry, with fuzzy filtering, sorting by date or title, and kind filters.                                                                                                                   |
| `Rail`, `Palette`, `ThemeToggle`, `Icon` | The pieces `Shell` is made of, if you want to assemble them differently.                                                                                                                         |

## Server helpers

Import these from `@mvarble/mesearch-ui/server` and run them in a `load` function. The page then ships finished HTML instead of KaTeX and d3.

- `inlineHtml(text, macros?)`: a title or summary as HTML, with its `$...$` math rendered over the base macros.
- `layoutGraph(documents, links, tuning?)`: runs the force simulation to rest and returns the nodes for `Graph`.

## Styling

Everything is drawn from CSS variables defined in `styles/tokens.css`: fonts, the paper and ink colours for both themes, the accent, the colour of each kind, sizes, and radii.

- To restyle a site, override any of them after the stylesheet loads. Override dark values under `:root[data-theme='dark']`.
- `styles/index.css` is the tokens, `base.css` and `prose.css` together. Import them separately to leave one out.
- A kind of document gets its colour from a `.kind-<name>` class. Any kind without one of its own takes the accent colour.
