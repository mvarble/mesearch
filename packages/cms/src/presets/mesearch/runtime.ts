// The queries a mesearch site's `load` functions call, over the snapshot the
// Vite plugin inlines into the virtual module. Nothing here touches the
// filesystem.
import { buildOutline } from '../../model/outline.ts';
import { citationLabel } from '../../resolvers/citation.ts';
import { live } from '../../runtime.ts';
import type { GraphEdge, MesearchDocument, MesearchSequence, MesearchSnapshot } from './types.ts';

export type * from './types.ts';
export { citationLabel };

export type SortKey = 'updated' | 'created' | 'title';

const sorters: Record<SortKey, (a: MesearchDocument, b: MesearchDocument) => number> = {
    updated: (a, b) => b.updated.valueOf() - a.updated.valueOf(),
    created: (a, b) => b.created.valueOf() - a.created.valueOf(),
    title: (a, b) => a.title.localeCompare(b.title),
};

export function bind(snapshot: MesearchSnapshot) {
    const byKey = new Map<string, MesearchDocument>(
        [...snapshot.documents, ...snapshot.sequences].map((entry) => [entry.key, entry]),
    );
    const sequences = new Map(snapshot.sequences.map((sequence) => [sequence.key, sequence]));
    const edgesInto = (key: string, style: GraphEdge['style']) =>
        snapshot.graph.edges.filter((edge) => edge.to == key && edge.style == style);
    const edgesFrom = (key: string, style: GraphEdge['style']) =>
        snapshot.graph.edges.filter((edge) => edge.from == key && edge.style == style);
    const lookup = (keys: string[]) =>
        keys.map((key) => byKey.get(key)).filter((entry): entry is MesearchDocument => !!entry);

    return {
        // The site's own description, by filename.
        description: () => snapshot.description,
        documents: {
            // Concepts and writeups; most recently updated first by default.
            list: ({ sort = 'updated' }: { sort?: SortKey } = {}) =>
                snapshot.documents.toSorted(sorters[sort]),
            get: (key: string) => byKey.get(key),
        },
        sequences: {
            list: () => snapshot.sequences,
            get: (key: string): MesearchSequence | undefined => sequences.get(key),
            // The sequences a document is part of, with its position in each.
            containing: (key: string) =>
                (byKey.get(key)?.sequences ?? [])
                    .map((sequenceKey) => sequences.get(sequenceKey))
                    .filter((sequence): sequence is MesearchSequence => !!sequence)
                    .map((sequence) => ({
                        sequence,
                        index: sequence.documents.indexOf(key),
                        documents: lookup(sequence.documents),
                    })),
        },
        graph: () => snapshot.graph,
        // What a document builds on, directly: solid edges into it.
        prerequisites: (key: string) => lookup(edgesInto(key, 'solid').map((edge) => edge.from)),
        // What builds on it: solid edges out of it.
        dependents: (key: string) => lookup(edgesFrom(key, 'solid').map((edge) => edge.to)),
        // What it is loosely related to by a link, either way.
        related: (key: string) =>
            lookup([
                ...edgesFrom(key, 'dashed').map((edge) => edge.to),
                ...edgesInto(key, 'dashed').map((edge) => edge.from),
            ]),
        headings: (filename: string) => snapshot.headings[filename] ?? [],
        outline: (filename: string) => buildOutline(snapshot.headings[filename] ?? []),
        // The references a document cites, for the list at its end.
        bibliography: (key: string) => snapshot.bibliography[key] ?? [],
    };
}

export type MesearchCms = ReturnType<typeof bind>;

export const bindLive = (current: () => MesearchSnapshot) => live(bind, current);
