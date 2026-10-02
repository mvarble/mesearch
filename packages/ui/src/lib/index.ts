// The pieces mesearch sites are made of, for any Svelte site to use. Data and
// URLs are always passed in, so nothing here knows how a site stores its
// content or lays out its pages.
//
// Styles: import '@mvarble/mesearch-ui/styles/index.css' once, from a root
// layout, along with KaTeX's stylesheet and, for the default typefaces,
// '@mvarble/mesearch-ui/fonts'.

export { default as Article } from './components/Article.svelte';
export { default as ArticleHeader } from './components/ArticleHeader.svelte';
export { default as Chips } from './components/Chips.svelte';
export { default as Graph, MESEARCH_LEGEND } from './components/Graph.svelte';
export { default as GraphPanel } from './components/GraphPanel.svelte';
export { default as Icon } from './components/Icon.svelte';
export { default as Index } from './components/Index.svelte';
export { default as Pager } from './components/Pager.svelte';
export { default as Proof } from './components/Proof.svelte';
export { default as References } from './components/References.svelte';
export { default as Palette } from './components/Palette.svelte';
export { default as Parts } from './components/Parts.svelte';
export { default as Rail } from './components/Rail.svelte';
export { default as SequenceTrack } from './components/SequenceTrack.svelte';
export { default as Shell } from './components/Shell.svelte';
export { default as Statement } from './components/Statement.svelte';
export { default as ThemeToggle } from './components/ThemeToggle.svelte';
export { default as Toc } from './components/Toc.svelte';

export { configure, formatDate, isoDate, kindLabel, plain, settings } from './settings.js';
export { theme, THEME_SCRIPT, type ThemeChoice } from './theme.svelte.js';
export { reading } from './reading.svelte.js';
export { bestMatch, fuzzy, highlight } from './fuzzy.js';
export { DEFAULT_TUNING, type GraphTuning } from './graph-layout.js';
export type * from './types.js';
