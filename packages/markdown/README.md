# @mvarble/mesearch-markdown

The mdsvex pipeline shared by [mesearch](https://github.com/mvarble/mesearch), [mkdoc](https://github.com/mvarble/mkdoc) and [the blog](https://github.com/mvarble/blog).

```js
import { markdownPreprocessors } from '@mvarble/mesearch-markdown';

// svelte.config.js, or vite-plugin-svelte's `preprocess`
preprocess: markdownPreprocessors({
    katex: { macros: { '\\PP': '\\mathbb{P}' } },
    mathBox: { liftTags: true },
}),
```

- **KaTeX**, rendered at build time by KaTeX itself, with the macros layered: the base table (`\bbR`, `\calF`, `\bfx`, `\rmd`, `\defeq`, … in `baseMacros`), then the site's, then the document's own frontmatter `katex_macros`. `macros` may instead be a function of the document, for a content layer that folds macros down a tree of documents. A formula that does not parse renders in KaTeX's error colour and is reported, and does not fail the build.
- **Display math** wrapped in a scroll container, so a long equation slides sideways rather than overflowing. With `liftTags`, a `\tag` is moved out of the container to stay in view.
- **Shiki** highlighting in a light and a dark theme at once, with grammars loaded on first use. A fence whose whole body is `{./file}` or `{./file:10..20}` is replaced by those lines of the file.
- **Relative assets** --- `![](./figure.png)` --- turned into Vite imports, so they are hashed and emitted with the page.

For documentation sites that quote their own repository, as [`@mvarble/mesearch-workflow`](../workflow)'s do, there are three more exports, which `markdownPreprocessors` does not apply by itself:

- **`quotingHighlighter({ root, repoUrl, branch })`**, a highlighter for mdsvex's `highlight` option that replaces the fenced import above. A fence whose body is `{path}` or `{path:start..end}` is replaced by those lines, **numbered from 1 and inclusive**, as an editor shows them. The excerpt is dedented, a run of Rust doc comments is quoted as Markdown, and the block is captioned with the file and lines, linked to `repoUrl` when one is given. Every fence becomes a `figure.code-block` coloured by Shiki's CSS variables. `resolveFileRef` and `expandFileRefs` do the same for plain-text output, such as an `llms.txt`. The fenced import of `highlight` keeps numbering from 0, so neither kind of document changes under the other.
- **`remarkCallouts`** turns GitHub-style `> [!NOTE]` blockquotes (`NOTE`, `TIP`, `WARNING`, `DECISION`, `TODO`, with an optional title after the marker) into `aside.callout`.
- **`rehypeHeadingAnchors`** gives every `h2` and `h3` with an `id` a trailing `#` link to itself.

`styles/katex.css` styles all of it. It also keeps inline math from breaking across a line.
