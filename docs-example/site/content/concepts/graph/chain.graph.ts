import { defineGraph } from '$lib/graph/spec';

// Two values, an operation between them, and its output.
export const chain = defineGraph({
    title: 'A chain',
    caption: 'An input and a parameter flow into an operation, whose output is observed.',
    width: 600,
    height: 200,
    nodeKinds: {
        value: { name: 'Value', hue: 'blue' },
        observed: { name: 'Observed value', hue: 'blue', fill: 'shaded' },
    },
    edgeKinds: { flow: { name: 'Flows into' } },
    nodes: [
        { id: 'x', x: 100, y: 140, kind: 'value', label: '$x$' },
        { id: 'theta', x: 100, y: 60, kind: 'value', label: '$\\theta$' },
        { id: 'y', x: 480, y: 100, kind: 'observed', label: '$y$' },
    ],
    edges: [
        { from: 'x', to: 'y', kind: 'flow' },
        { from: 'theta', to: 'y', kind: 'flow' },
    ],
});
