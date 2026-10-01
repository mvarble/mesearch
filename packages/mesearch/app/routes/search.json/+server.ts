import { json } from '@sveltejs/kit';
import { cms } from '$cms';

import { href, plain } from '$lib/format';
import { inlineHtml } from '$lib/server/refs';
import type { SearchEntry } from '$lib/types';

export const prerender = true;
export const trailingSlash = 'never';

// What the search palette searches: titles, summaries and the headings within
// each document. One file, fetched the first time the palette opens, rather
// than a copy inside every page.
export const GET = () => {
    const entries: SearchEntry[] = [...cms.documents.list(), ...cms.sequences.list()].map(
        (doc) => ({
            key: doc.key,
            kind: doc.kind,
            url: href(doc.key),
            title: plain(doc.title),
            summary: plain(doc.summary),
            summaryHtml: inlineHtml(doc, doc.summary),
            headings: cms.headings(doc.filename).map((heading) => ({
                title: plain(heading.title),
                slug: heading.slug,
            })),
        }),
    );
    return json(entries);
};
