# @mvarble/mesearch-ui

The Svelte 5 components and stylesheets that [mesearch](https://github.com/mvarble/mesearch) sites are made of, published so that another SvelteKit site can look and behave the same. [The blog](https://github.com/mvarble/blog) uses it this way.

You get:

- the rail (a dock on phones) with its search palette and theme toggle;
- the force-laid-out map of documents and its detail panel;
- the fuzzy index;
- a three-column article layout with a scroll-spied table of contents and a sequence track;
- the light and dark tokens behind all of it, and `palette`, the same colours for plots drawn by script.

Nothing here knows how a site stores content or lays out its URLs. Every component is handed its data, with each link's `url` already worked out.

```sh
npm install @mvarble/mesearch-ui
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
| `Shell`                                  | Rail, palette, skip link, and the margin the rail needs. Starts the theme. A `logo` snippet replaces the title's initials on the rail.                                                           |
| `Article`                                | A document page. The header, the prose, then `after` and a `footer`. `left` and `right` snippets sit in the margins on wide screens and fold into disclosures under the header otherwise.        |
| `ArticleHeader`                          | Breadcrumbs, title, dates, reading time, and "Builds on" chips.                                                                                                                                  |
| `Toc`                                    | Nested contents with scroll-spy.                                                                                                                                                                 |
| `SequenceTrack`                          | A sequence as a line of stations, with nested stops for sections and the current stop filled.                                                                                                    |
| `Pager`, `Parts`, `Chips`                | Previous and next, a numbered list of parts, and a row of document links.                                                                                                                        |
| `Statement`, `Proof`                     | A theorem, definition or remark spread in from its own document, with its heading running into its first line and claims set in italics; and a proof ending in ∎.                                |
| `References`                             | A page's own short reference list, at its end. Each entry is the target of the citations to it and is highlighted on arrival.                                                                    |
| `Graph`                                  | The map, with nodes laid out in advance by `layoutGraph`. It is drawn without JavaScript and simulated live with it. Clicking a node opens `GraphPanel` (a drawer, or a bottom sheet on phones). |
| `Index`                                  | Every entry, with fuzzy filtering, sorting by date or title, and kind filters.                                                                                                                   |
| `Rail`, `Palette`, `ThemeToggle`, `Icon` | The pieces `Shell` is made of, if you want to assemble them differently.                                                                                                                         |

## Server helpers

Import these from `@mvarble/mesearch-ui/server` and run them in a `load` function. The page then ships finished HTML instead of KaTeX and d3.

- `inlineHtml(text, macros?)`: a title or summary as HTML, with its `$...$` math rendered over the base macros.
- `layoutGraph(documents, links, tuning?)`: runs the force simulation to rest and returns the nodes for `Graph`.
- `referenceHtml(entry, macros?)`: a bibliography entry as one short paragraph of HTML, for `References`.

## Styling

Everything is drawn from CSS variables defined in `styles/tokens.css`: fonts, the paper and ink colours for both themes, the accent, the colour of each kind, sizes, and radii.

- To restyle a site, override any of them after the stylesheet loads. Override dark values under `:root[data-theme='dark']`.
- `styles/index.css` is the tokens, `base.css` and `prose.css` together. Import them separately to leave one out.
- A kind of document gets its colour from a `.kind-<name>` class. Any kind without one of its own takes the accent colour.
- `--series-1` to `--series-8` colour the series of a chart, in that order. They are chosen so that each can be told from its neighbours with any colour vision, and are stepped separately for each theme.

## Colours for plots

A chart drawn in markup can use the variables directly (`fill="var(--series-1)"`) and follows the theme by itself. A plotting library such as [Plotly](https://plotly.com/javascript/), a canvas or WebGL needs the colours as strings instead. `palette` holds them:

```ts
import { palette } from '@mvarble/mesearch-ui';

palette.theme; // 'light' or 'dark'
palette.series; // ['#2a78d6', '#eb6834', ...], from --series-1 to --series-8
palette.ink; // text
palette.paperRaised; // a surface to draw on
```

It is reactive state that follows `data-theme` on `<html>` and is read from the page's computed styles, so a site's own overrides of the variables come through. Draw in an `$effect` that reads it, and the plot is drawn again when the reader switches theme:

```svelte
<script>
    import { palette } from '@mvarble/mesearch-ui';

    let { x, y } = $props();
    let plot;

    $effect(() => {
        const data = [
            { x, y, type: 'scatter', mode: 'lines', line: { color: palette.series[0], width: 2 } },
        ];
        const axis = {
            color: palette.muted,
            gridcolor: palette.rule,
            zerolinecolor: palette.ruleStrong,
        };
        const layout = {
            paper_bgcolor: palette.paperRaised,
            plot_bgcolor: palette.paperRaised,
            font: { family: palette.fontUi, color: palette.ink },
            xaxis: axis,
            yaxis: axis,
            margin: { t: 16, r: 16, b: 40, l: 48 },
        };
        // Plotly needs a browser, so it is loaded only in one. `react`
        // updates the plot in place when the effect runs again.
        import('plotly.js-dist-min').then(({ default: Plotly }) =>
            Plotly.react(plot, data, layout),
        );
    });
</script>

<div bind:this={plot}></div>
```

The effect reads the palette synchronously, before anything is awaited; a colour first read inside the `then` would not be tracked.

| field                                 | variable                                      |
| ------------------------------------- | --------------------------------------------- |
| `paper`, `paperRaised`, `paperSunken` | `--paper`, `--paper-raised`, `--paper-sunken` |
| `ink`, `inkSoft`, `muted`, `faint`    | `--ink`, `--ink-soft`, `--muted`, `--faint`   |
| `rule`, `ruleStrong`                  | `--rule`, `--rule-strong` (gridlines, axes)   |
| `accent`, `accentSoft`                | `--accent`, `--accent-soft`                   |
| `concept`, `writeup`, `sequence`      | the colour of each kind of document           |
| `series`                              | `--series-1` to `--series-8`                  |
| `fontBody`, `fontUi`, `fontMono`      | `--font-body`, `--font-ui`, `--font-mono`     |

- On the server, `palette` holds the light theme's defaults from `tokens.css`, as a page read without JavaScript shows. In the browser, a variable the stylesheets have not set yet keeps its default for the theme in use. `DEFAULT_PALETTES.light` and `DEFAULT_PALETTES.dark` are those defaults.
- Only `data-theme`, `class` and `style` on `<html>` are watched. After changing a variable some other way from a script, call `refreshPalette()`.
- The palette follows `data-theme` whoever sets it, so it works on a site with a theme switch of its own as well as with `Shell`.
- Its type is `ThemePalette` (`Palette` is the search component).
