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

// A bibliography entry, as `.bib` files give it.
export interface ReferenceSource {
    kind: string;
    title: string;
    year: string;
    authors: Array<{ fullname: string }>;
    journal?: string;
    volume?: string;
    number?: string;
    pages?: string;
    series?: string;
    edition?: string;
    publisher?: string;
    institution?: string;
    doi?: string;
    url?: string;
}

const BOOKISH = /^(book|thesis|phdthesis|mastersthesis|manual|booklet|proceedings)$/i;

// A reference as one short paragraph of HTML: who, what, where, when, and a
// link when there is one. Braces protecting capitals in BibTeX are dropped,
// and inline math in a title is rendered.
export function referenceHtml(source: ReferenceSource, macros: KatexMacros = {}): string {
    // Without the braces that protect capitals, except within math.
    const clean = (text: string | undefined) =>
        (text ?? '')
            .split(/(\$[^$]*\$)/g)
            .map((part, i) => (i % 2 ? part : part.replace(/[{}]/g, '')))
            .join('')
            .trim();
    const names = source.authors.map((author) => escapeHtml(clean(author.fullname)));
    const who =
        names.length <= 2
            ? names.join(' and ')
            : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
    const title = inlineHtml(clean(source.title), macros);
    const journal = clean(source.journal);

    const parts: string[] = [];
    if (who) parts.push(who);
    if (journal) {
        parts.push(title);
        let venue = `<i>${escapeHtml(journal)}</i>`;
        if (source.volume) venue += ` ${escapeHtml(clean(source.volume))}`;
        if (source.number) venue += `(${escapeHtml(clean(source.number))})`;
        if (source.pages) venue += `, ${escapeHtml(clean(source.pages).replace(/-+/g, '–'))}`;
        parts.push(venue);
    } else {
        parts.push(BOOKISH.test(source.kind) || !source.kind ? `<i>${title}</i>` : title);
        const series = clean(source.series);
        if (series) {
            const volume = clean(source.volume);
            parts.push(escapeHtml(volume ? `${series} ${volume}` : series));
        }
        const edition = clean(source.edition);
        if (edition)
            parts.push(escapeHtml(/edition/i.test(edition) ? edition : `${edition} edition`));
    }
    const house = clean(source.publisher) || clean(source.institution);
    const year = clean(source.year);
    if (house || year) parts.push(escapeHtml([house, year].filter(Boolean).join(', ')));

    let html = parts.join('. ') + '.';
    const doi = clean(source.doi);
    const url = clean(source.url);
    if (doi) {
        const href = `https://doi.org/${encodeURI(doi)}`;
        html += ` <a href="${escapeHtml(href)}">doi:${escapeHtml(doi)}</a>`;
    } else if (/^https?:\/\//.test(url)) {
        html += ` <a href="${escapeHtml(url)}">${escapeHtml(new URL(url).host)}</a>`;
    }
    return html;
}
