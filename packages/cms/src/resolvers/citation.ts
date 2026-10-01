import type { Resolver } from '../core/resolver.ts';
import type { DocRecord, Store } from '../core/store.ts';

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
    // The reference as plain text.
    text: string;
}

export interface CitationOptions {
    // The collection the bibliography is kept in.
    collection?: string;
    // Where a citation is listed, from the document citing it;
    // `/citations#<key>` by default.
    url?(key: string, store: Store, doc: DocRecord): string;
}

// The label a citation is shown as: the first author's surname, cut to four
// letters, and the year's last two digits --- `[Kall02]`. A citation with no
// authors falls back to its key.
export function citationLabel(citation: Citation): string {
    const lastname = citation.authors[0]?.lastname;
    if (!lastname) return citation.key;
    return `${lastname.slice(0, 4)}${String(citation.year).slice(-2)}`;
}

// A citation as one line of plain text, for a link's tooltip: who, what, when.
export function citationText(citation: Citation): string {
    const names = citation.authors.map((author) => author.fullname.trim());
    const who =
        names.length > 3 ? `${names[0]} et al.` : names.join(names.length == 2 ? ' and ' : ', ');
    // Without braces: a link's title is an attribute, where Svelte would read
    // one as the start of an expression.
    const title = citation.title.replace(/\$([^$]+)\$/g, '$1');
    return [who, title, citation.journal ?? citation.publisher, citation.year]
        .filter((part) => part && part.trim())
        .join('. ')
        .concat('.')
        .replace(/[{}]/g, '');
}

// `[](cite:key)` renders as `[Label]`, and `[p. 3](cite:key)` as `[Label, p. 3]`,
// linking to the bibliography. Hovering it shows the reference.
export function citations(options: CitationOptions = {}): Resolver<CitationTarget> {
    const collection = options.collection ?? 'citations';
    const url = options.url ?? ((key: string) => `/citations#${key}`);
    return {
        name: 'citation',
        matchLink: (href) => (href.startsWith('cite:') ? href.slice('cite:'.length) : undefined),
        resolve(store, doc, key) {
            const citation = store.collection<Citation>(collection).get(key);
            if (!citation) return undefined;
            return {
                key,
                label: citationLabel(citation),
                url: url(key, store, doc),
                text: citationText(citation),
            };
        },
        unresolved: (_store, doc, key) =>
            `'${key}' does not resolve to a citation in the site (referenced by '${doc.id}').`,
        rewriteLink(node, target) {
            node.url = target.url;
            node.title = target.text;
            node.data = {
                ...node.data,
                hProperties: { ...node.data?.hProperties, className: ['citation'] },
            };
            const [child] = node.children;
            if (node.children.length == 1 && child?.type == 'text') {
                child.value = `[${target.label}, ${child.value}]`;
            } else if (!node.children.length) {
                node.children = [{ type: 'text', value: `[${target.label}]` }];
            }
        },
    };
}
