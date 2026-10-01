import type { Kind } from '@mvarble/mesearch-cms/presets/mesearch';

// A document as a link to it: enough to show a chip or a card.
export interface DocumentRef {
    key: string;
    kind: Kind;
    title: string;
    // The title as HTML, with any inline math rendered.
    titleHtml: string;
}

export interface IndexEntry extends DocumentRef {
    summaryHtml: string;
    summary: string;
    created: Date;
    updated: Date;
    readingMinutes: number;
    sequences: string[];
    descriptionFilename?: string;
}

export interface SearchEntry {
    key: string;
    kind: Kind;
    title: string;
    summary: string;
    summaryHtml: string;
    headings: Array<{ title: string; slug: string }>;
}

export interface GraphNode extends DocumentRef {
    x: number;
    y: number;
    width: number;
    depth: number;
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

export type { Kind };
