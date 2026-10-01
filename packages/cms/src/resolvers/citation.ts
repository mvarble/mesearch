import type { Resolver } from '../core/resolver.ts';

export interface CitationAuthor {
    lastname: string;
    fullname: string;
}

export interface Citation {
    key: string;
    kind: string;
    title: string;
    year: string;
    doi?: string;
    publisher?: string;
    issn?: string;
    isbn?: string;
    journal?: string;
    number?: string;
    pages?: string;
    volume?: string;
    institution?: string;
    edition?: string;
    url?: string;
    series?: string;
    authors: CitationAuthor[];
}

export interface CitationTarget {
    key: string;
    label: string;
    url: string;
}

export interface CitationOptions {
    // The collection the bibliography is kept in.
    collection?: string;
    // Where a citation is listed; `/citations#<key>` by default.
    url?(key: string): string;
}

// The label a citation is shown as: the first author's surname, cut to four
// letters, and the year's last two digits --- `[Kall02]`. A citation with no
// authors falls back to its key.
export function citationLabel(citation: Citation): string {
    const lastname = citation.authors[0]?.lastname;
    if (!lastname) return citation.key;
    return `${lastname.slice(0, 4)}${String(citation.year).slice(-2)}`;
}

// `[](cite:key)` renders as `[Label]`, and `[p. 3](cite:key)` as `[Label, p. 3]`,
// linking to the bibliography.
export function citations(options: CitationOptions = {}): Resolver<CitationTarget> {
    const collection = options.collection ?? 'citations';
    const url = options.url ?? ((key) => `/citations#${key}`);
    return {
        name: 'citation',
        matchLink: (href) => (href.startsWith('cite:') ? href.slice('cite:'.length) : undefined),
        resolve(store, _doc, key) {
            const citation = store.collection<Citation>(collection).get(key);
            if (!citation) return undefined;
            return { key, label: citationLabel(citation), url: url(key) };
        },
        unresolved: (_store, doc, key) =>
            `'${key}' does not resolve to a citation in the site (referenced by '${doc.id}').`,
        rewriteLink(node, target) {
            node.url = target.url;
            const [child] = node.children;
            if (node.children.length == 1 && child?.type == 'text') {
                child.value = `[${target.label}, ${child.value}]`;
            } else if (!node.children.length) {
                node.children = [{ type: 'text', value: `[${target.label}]` }];
            }
        },
    };
}
