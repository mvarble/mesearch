import { cms } from '$cms';
import site from '$site';

import { depths, estimateWidth, layout, NODE_HEIGHT } from '$lib/graph-layout';
import { toIndexEntry, toRef } from '$lib/server/refs';
import type { GraphNode } from '$lib/types';

export const load = () => {
    const documents = cms.documents.list().map(toIndexEntry);
    const byKey = new Map(documents.map((doc) => [doc.key, doc]));

    // The graph is laid out here, at build time, so the page arrives with a
    // finished picture whether or not its JavaScript ever runs.
    const graph = cms.graph();
    const depth = depths(graph.nodes, graph.edges);
    const nodes = graph.nodes
        .map((key) => byKey.get(key))
        .filter((doc) => !!doc)
        .map((doc) => ({
            id: doc.key,
            width: estimateWidth(doc.title),
            height: NODE_HEIGHT,
            depth: depth.get(doc.key) ?? 0,
        }));
    const positions = layout(
        nodes,
        graph.edges.map((edge) => ({ source: edge.from, target: edge.to, style: edge.style })),
        site.graph,
    );
    const graphNodes: GraphNode[] = nodes.map((node) => {
        const doc = byKey.get(node.id)!;
        return {
            key: doc.key,
            kind: doc.kind,
            title: doc.title,
            titleHtml: doc.titleHtml,
            x: positions.get(node.id)!.x,
            y: positions.get(node.id)!.y,
            width: node.width,
            depth: node.depth,
            sequenced: doc.sequences.length > 0,
        };
    });

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
        graph: { nodes: graphNodes, links: graph.edges },
    };
};
