import { defineConfig } from '@mvarble/mesearch';

export default defineConfig({
    // The site's name, shown on the home page and in every tab.
    title: '{{title}}',
    // author: 'Your name',
    // lang: 'en',

    // The URL prefix the site is served from, if not the root of its domain,
    // as in GitHub Pages' '/<repository>'.
    // base: '/notes',

    // KaTeX macros every document can use. A document adds its own in its
    // frontmatter, under `katex_macros`.
    katexMacros: {
        // '\\PP': '\\mathbb{P}',
        // '\\EE': '\\mathbb{E}',
    },

    // How the map lays itself out.
    // graph: { charge: -900, linkDistance: 80, gravity: 0.02 },
});
