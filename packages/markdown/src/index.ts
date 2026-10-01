import { mdsvex, type MdsvexOptions } from 'mdsvex';
import type { PreprocessorGroup } from 'svelte/compiler';
import remarkMath from 'remark-math';
import remarkFrontmatter from 'remark-frontmatter';

import { rehypeKatex, type RehypeKatexOptions } from './katex.ts';
import { rehypeAssets, hoistAssetImports } from './assets.ts';
import { rehypeMathBox, type MathBoxOptions } from './mathbox.ts';
import { highlight } from './highlight.ts';

export {
    baseMacros,
    documentMacros,
    frontmatterMacros,
    rehypeKatex,
    renderMath,
    type KatexMacros,
    type RehypeKatexOptions,
    type RenderOptions,
} from './katex.ts';
export { rehypeMathBox, type MathBoxOptions } from './mathbox.ts';
export { rehypeAssets, hoistAssetImports } from './assets.ts';
export { highlight } from './highlight.ts';

export const DOCUMENT_EXTENSIONS = ['.svx', '.md'];

// A unified plugin as mdsvex accepts it: on its own, or with its options.
// mdsvex runs an older unified than the one these types come from, so the
// entries are kept loose rather than pretending the two line up.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PluginEntry = any;

export interface PreprocessorOptions {
    extensions?: string[];
    /** Run after frontmatter and math are parsed. */
    remarkPlugins?: PluginEntry[];
    /** Run before the math is rendered, so they see the TeX source. */
    rehypePlugins?: PluginEntry[];
    katex?: RehypeKatexOptions;
    mathBox?: MathBoxOptions;
    /** Hoist relative `src`s into Vite imports. On by default. */
    assets?: boolean;
    /** Set while a dev server is running: diagnostics repeat on every rebuild. */
    watch?: boolean;
}

// One parser configuration, shared by everything that renders these documents.
// Order matters: `rehypeAssets` has to see the tree after KaTeX has run, so that
// nothing it rewrote is mistaken for an asset.
export function markdownPreprocessors(options: PreprocessorOptions = {}): PreprocessorGroup[] {
    const extensions = options.extensions ?? DOCUMENT_EXTENSIONS;
    const assets = options.assets ?? true;
    return [
        mdsvex({
            extensions,
            remarkPlugins: [remarkFrontmatter, remarkMath, ...(options.remarkPlugins ?? [])],
            rehypePlugins: [
                ...(options.rehypePlugins ?? []),
                [rehypeKatex, { watch: options.watch, ...options.katex }],
                [rehypeMathBox, options.mathBox ?? {}],
                ...(assets ? [rehypeAssets] : []),
            ],
            highlight: { highlighter: highlight },
        } as MdsvexOptions) as PreprocessorGroup,
        ...(assets ? [hoistAssetImports] : []),
    ];
}
