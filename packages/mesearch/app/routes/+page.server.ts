import { layoutGraph } from '@mvarble/mesearch-ui/server';
import { cms } from '$cms';
import site from '$site';

import { toIndexEntry, toRef } from '$lib/server/refs';

export const load = () => {
    const documents = cms.documents.list().map(toIndexEntry);
    const byKey = new Map(documents.map((doc) => [doc.key, doc]));

    // The graph is laid out here, at build time, so the page arrives with a
    // finished picture whether or not its JavaScript ever runs.
    const graph = cms.graph();
    const nodes = layoutGraph(
        graph.nodes
            .map((key) => byKey.get(key))
            .filter((doc) => !!doc)
            .map((doc) => ({ ...doc, sequenced: doc.sequences.length > 0 })),
        graph.edges,
        site.graph,
    );

    const sequences = cms.sequences.list().map((sequence) => ({
        ...toIndexEntry(sequence),
        documents: sequence.documents
            .map((key) => cms.documents.get(key))
            .filter((doc) => !!doc)
            .map(toRef),
    }));

    return {
        description: cms.description(),
        documents,
        sequences,
        graph: { nodes, links: graph.edges },
    };
};
