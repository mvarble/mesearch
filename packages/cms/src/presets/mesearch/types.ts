import type { KatexMacros } from '@mvarble/mesearch-markdown/katex';

import type { Heading } from '../../model/outline.ts';
import type { Citation } from '../../resolvers/citation.ts';

export type Kind = 'concept' | 'writeup' | 'sequence';

// The folder each kind of document lives in under `content/`, which is also the
// first segment of its URL.
export const FOLDERS: Record<Kind, string> = {
    concept: 'concepts',
    writeup: 'writeups',
    sequence: 'sequences',
};

export interface MesearchDocument {
    kind: Kind;
    slug: string;
    // `concepts/<slug>`: how documents refer to each other, and the pathname.
    key: string;
    title: string;
    filename: string;
    descriptionFilename?: string;
    // Plain text: the description's, or else the document's first paragraph.
    summary: string;
    created: Date;
    updated: Date;
    // What this document builds on, by key, as its frontmatter lists it.
    dependsOn: string[];
    // The sequences that include it, by key, in the order they were scanned.
    sequences: string[];
    // An estimate at 230 words a minute, at least one.
    readingMinutes: number;
    katexMacros: KatexMacros;
}

export interface MesearchSequence extends MesearchDocument {
    kind: 'sequence';
    // The documents it orders, by key.
    documents: string[];
}

export type EdgeStyle = 'solid' | 'dashed';

export interface GraphEdge {
    // A solid edge points from what is needed to what needs it, so following
    // the arrows is a reading order.
    from: string;
    to: string;
    style: EdgeStyle;
    // Where the edge came from: a `depends_on`, two neighbours in a sequence,
    // or a link from one document to the other.
    via: 'depends_on' | 'sequence' | 'link';
}

export interface Graph {
    // Concepts and writeups, by key.
    nodes: string[];
    edges: GraphEdge[];
}

export interface MesearchSnapshot {
    // The site's own description document, rendered on the home page.
    description?: string;
    documents: MesearchDocument[];
    sequences: MesearchSequence[];
    graph: Graph;
    // Each document's headings, by filename.
    headings: Record<string, Heading[]>;
    // What each document cites, by key, in label order.
    bibliography: Record<string, Citation[]>;
}

export type { Heading, OutlineEntry } from '../../model/outline.ts';
export type { Citation, CitationAuthor } from '../../resolvers/citation.ts';
export type { StatementInjection } from '../../core/statements.ts';
