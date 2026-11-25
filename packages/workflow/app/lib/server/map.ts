import { cms } from '$cms';
import { katex } from '$site';
import { inlineHtml, layoutGraph } from '@mvarble/mesearch-ui/server';
import type { GraphLink, GraphNode, IndexEntry } from '@mvarble/mesearch-ui';

import { hrefOf } from '../documents';
import { MAP_TUNING } from '../map';
import { qualifiedTitle } from './title';

export interface DocumentMapData {
    nodes: GraphNode[];
    links: GraphLink[];
    entries: Record<string, IndexEntry>;
}

// The map of the math notes and the archive's documents, linked by what each builds on and links
// to. It is laid out here, at build time, so it is drawn before any script runs. An archive
// document is named by its entry and its own title ("The core: Mathematics").
export function documentMap(): DocumentMapData {
    const macros = katex.macros as Record<string, string>;
    const graph = cms.graph();
    const entries: Record<string, IndexEntry> = {};
    for (const key of graph.nodes) {
        const doc = cms.get(key)!;
        const title = qualifiedTitle(doc);
        entries[key] = {
            key,
            kind: doc.kind,
            url: hrefOf(key),
            title,
            titleHtml: inlineHtml(title, macros),
            summary: doc.summary,
            summaryHtml: inlineHtml(doc.summary, macros),
            created: doc.created,
            updated: doc.updated,
            readingMinutes: doc.readingMinutes,
        };
    }
    const links = graph.edges.map(({ from, to, style }) => ({ from, to, style }));
    return { nodes: layoutGraph(Object.values(entries), links, MAP_TUNING), links, entries };
}
