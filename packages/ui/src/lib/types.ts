// The shapes the components are handed. Every one carries its own `url`, so
// the components never need to know how a site lays out its pages.

// What kind of document something is: `concept`, `writeup`, `sequence` and
// `post` have colours of their own; any other kind takes the accent colour.
export type Kind = string;

// A document as a link to it: enough to show a chip or a card.
export interface DocumentRef {
    key: string;
    kind: Kind;
    url: string;
    title: string;
    // The title as HTML, with any inline math rendered.
    titleHtml: string;
}

export interface IndexEntry extends DocumentRef {
    summary: string;
    summaryHtml: string;
    created: Date;
    updated: Date;
    readingMinutes?: number;
}

export interface SearchEntry {
    key: string;
    kind: Kind;
    url: string;
    title: string;
    summary: string;
    summaryHtml?: string;
    // Sections within the document, which are results of their own.
    headings: Array<{ title: string; slug: string }>;
}

export interface GraphNode extends DocumentRef {
    x: number;
    y: number;
    width: number;
    depth: number;
    // Drawn with a small mark: the document is part of a sequence.
    sequenced: boolean;
}

export interface GraphLink {
    from: string;
    to: string;
    style: 'solid' | 'dashed';
}

export interface TocEntry {
    slug: string;
    titleHtml: string;
    depth: number;
    children: TocEntry[];
}

// A stop on a sequence's track. Nested stops are sections of a chapter.
export interface TrackItem {
    key: string;
    url: string;
    titleHtml: string;
    // Shown in the station instead of its position, as `1.2` or `A`.
    label?: string;
    children?: TrackItem[];
}

export interface RailLink {
    url: string;
    label: string;
    icon: IconName;
}

export type IconName =
    | 'search'
    | 'graph'
    | 'list'
    | 'sun'
    | 'moon'
    | 'auto'
    | 'plus'
    | 'minus'
    | 'reset'
    | 'close'
    | 'arrow-right'
    | 'arrow-left'
    | 'home'
    | 'pen'
    | 'book'
    | 'quote';

// One entry in a page's list of references, its HTML already made.
export interface Reference {
    // The `id` a citation on the page links to.
    id: string;
    // `Foll99`, shown as `[Foll99]`.
    label: string;
    html: string;
}

// What a statement's module tells the component framing it.
export interface StatementInfo {
    // `theorem`, `definition`, `remark`, ...
    kind: string;
    label: string;
    slug: string;
    // Its own name, as in "Theorem 3 (Heine--Borel)".
    title?: string;
    // The `id` it is rendered with; its slug by default.
    id?: string;
}
