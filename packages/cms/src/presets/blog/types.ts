import type { KatexMacros } from '@mvarble/mesearch-markdown/katex';

import type { Heading } from '../../model/outline.ts';
import type { Citation } from '../../resolvers/citation.ts';

// What a listing shows of a post or a sequence.
export interface PostInfo {
    title: string;
    created: Date;
    edited: Date;
    pathname: string;
    descriptionFilename?: string;
    imageFilename?: string;
    tags: string[];
}

export interface Post extends PostInfo {
    slug: string;
    filename: string;
    katexMacros: KatexMacros;
}

export interface SequenceChild {
    title: string;
    slug: string;
    pathname: string;
    filename: string;
    katexMacros: KatexMacros;
    // Only when the sequence is enumerated.
    label?: string;
    appendix: boolean;
    children: SequenceChild[];
}

export interface Sequence extends Post {
    enumerate: boolean;
    // A sequence's root is never labelled; the field is here so a root and its
    // pages can be handled alike.
    label?: string;
    children: SequenceChild[];
}

// What a statement's compiled module exports as `cms`.
export interface StatementInjection {
    kind: string;
    label: string;
    slug: string;
    pathname: string;
    filename: string;
}

export interface BlogSnapshot {
    posts: Post[];
    sequences: Sequence[];
    // The document behind each page, by pathname.
    pages: Record<string, string>;
    // Each document's headings, by filename.
    headings: Record<string, Heading[]>;
    citations: Citation[];
}

export type { Citation, CitationAuthor } from '../../resolvers/citation.ts';
export type { Heading, OutlineEntry } from '../../model/outline.ts';
