import type { KatexMacros } from '@mvarble/mesearch-markdown/katex';

import type { Heading } from '../../model/outline.ts';
import type { Citation } from '../../resolvers/citation.ts';

// The four kinds of document a skoro site holds. Pages tell the reader what the
// library *is*, in tracks; math notes are mathematics any number of documents
// lean on; an entry is the record of one piece of development, and its
// documents are what was written on the way (the mathematics, the
// implementation companion, the plan).
export type Kind = 'page' | 'math' | 'entry' | 'entry-document';

interface Common {
    kind: Kind;
    // `<track>/<slug>`, `math/<slug>`, `archive/<slug>` or
    // `archive/<slug>/<name>`: how documents refer to each other, and the
    // pathname.
    key: string;
    title: string;
    filename: string;
    // Plain text: the frontmatter's `summary`, or else the first paragraph.
    summary: string;
    created: Date;
    updated: Date;
    // What this document builds on, by key, as its frontmatter lists it.
    dependsOn: string[];
    readingMinutes: number;
    katexMacros: KatexMacros;
}

export interface SkoroPage extends Common {
    kind: 'page';
    track: string;
    slug: string;
    // Its position within the track.
    order: number;
    // The entries whose `pages` name this one, by key: the development that
    // made the page say what it says. Newest first.
    entries: string[];
}

export interface SkoroMath extends Common {
    kind: 'math';
    slug: string;
}

// Where an entry stands, read from its `workflow.json`.
export type EntryStatus = 'active' | 'done' | 'abandoned';

// An entry's stage record as the workflow tool writes it. Only what the site
// shows is typed; anything else in the file is carried along untouched.
export interface WorkflowRecord {
    kind: string;
    stage: string;
    started?: string;
    finished?: string;
    events: WorkflowEvent[];
    [key: string]: unknown;
}

export interface WorkflowEvent {
    date: string;
    action: string;
    stage?: string;
    reason?: string;
    commit?: string;
    [key: string]: unknown;
}

export interface SkoroEntry extends Common {
    kind: 'entry';
    slug: string;
    status: EntryStatus;
    workflow?: WorkflowRecord;
    // Its documents, by key, in the order `documents` lists their names.
    documents: string[];
    // The pages it changed, by key.
    pages: string[];
    // Earlier entries whose story this one changes, and the later entries that
    // change this one's, by key.
    revises: string[];
    revisedBy: string[];
}

export interface SkoroEntryDocument extends Common {
    kind: 'entry-document';
    // The entry it belongs to, by key, and its name there (`math`, `plan`).
    entry: string;
    name: string;
}

export type SkoroDocument = SkoroPage | SkoroMath | SkoroEntry | SkoroEntryDocument;

export type EdgeStyle = 'solid' | 'dashed';

export interface GraphEdge {
    // A solid edge points from what is needed to what needs it.
    from: string;
    to: string;
    style: EdgeStyle;
    via: 'depends_on' | 'link';
}

export interface Graph {
    // Math notes and entry documents, by key: the network the mathematics is
    // worked out in.
    nodes: string[];
    edges: GraphEdge[];
}

export interface SkoroSnapshot {
    // The home page's prose, by filename.
    landing?: string;
    tracks: string[];
    documents: SkoroDocument[];
    graph: Graph;
    // Each document's headings, by filename.
    headings: Record<string, Heading[]>;
    // What each page cites, by key, in label order.
    bibliography: Record<string, Citation[]>;
}

export type { Heading, OutlineEntry } from '../../model/outline.ts';
export type { Citation, CitationAuthor } from '../../resolvers/citation.ts';
export type { StatementInjection } from '../../core/statements.ts';
