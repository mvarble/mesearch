// For a site's server code: what is best done once, at build time, so that a
// page ships finished HTML rather than the libraries that made it.
import katex from 'katex';
import { baseMacros, type KatexMacros } from '@mvarble/mesearch-markdown/katex';

import {
    DEFAULT_TUNING,
    depths,
    estimateWidth,
    layout,
    NODE_HEIGHT,
    type GraphTuning,
} from './graph-layout.js';
import type { DocumentRef, GraphLink, GraphNode } from './types.js';

const escapeHtml = (text: string) =>
    text.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );

// A short piece of text --- a title, a heading, a summary --- as HTML, with its
// inline `$...$` math rendered. `macros` are layered over the base table.
export function inlineHtml(text: string, macros: KatexMacros = {}): string {
    const all = { ...baseMacros, ...macros };
    return text
        .split(/(\$[^$]+\$)/g)
        .map((part) =>
            part.length > 2 && part.startsWith('$') && part.endsWith('$')
                ? katex.renderToString(part.slice(1, -1), {
                      macros: { ...all },
                      throwOnError: false,
                      output: 'html',
                  })
                : escapeHtml(part),
        )
        .join('');
}

// The graph's nodes, laid out by running the force simulation to rest, for
// `<Graph>` to draw as it is --- with or without JavaScript.
export function layoutGraph(
    documents: Array<DocumentRef & { sequenced?: boolean }>,
    links: GraphLink[],
    tuning: GraphTuning = DEFAULT_TUNING,
): GraphNode[] {
    const keys = documents.map((doc) => doc.key);
    const depth = depths(keys, links);
    const nodes = documents.map((doc) => ({
        id: doc.key,
        width: estimateWidth(doc.title),
        height: NODE_HEIGHT,
        depth: depth.get(doc.key) ?? 0,
    }));
    const known = new Set(keys);
    const positions = layout(
        nodes,
        links
            .filter((link) => known.has(link.from) && known.has(link.to))
            .map((link) => ({ source: link.from, target: link.to, style: link.style })),
        tuning,
    );
    return documents.map((doc, i) => ({
        key: doc.key,
        kind: doc.kind,
        url: doc.url,
        title: doc.title,
        titleHtml: doc.titleHtml,
        x: positions.get(doc.key)!.x,
        y: positions.get(doc.key)!.y,
        width: nodes[i]!.width,
        depth: nodes[i]!.depth,
        sequenced: doc.sequenced ?? false,
    }));
}
