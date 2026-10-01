import {
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY,
    type Force,
    type Simulation,
    type SimulationLinkDatum,
    type SimulationNodeDatum,
} from 'd3-force';

// The graph is laid out by forces: every node repels every other, edges pull
// their ends together (solid ones firmly, dashed ones loosely), a weak gravity
// keeps stragglers in view, and each node is drawn towards a band set by how
// deep it sits in the dependency order --- so prerequisites float above what
// builds on them and following the arrows reads downwards.
//
// The same simulation runs twice: to completion at build time, so the page
// ships a finished picture that needs no JavaScript, and again in the browser,
// starting from that picture, so that nodes can be dragged and the rest
// respond.

export interface GraphTuning {
    charge: number;
    linkDistance: number;
    gravity: number;
}

export interface LayoutNode extends SimulationNodeDatum {
    id: string;
    width: number;
    height: number;
    depth: number;
}

export interface LayoutEdge extends SimulationLinkDatum<LayoutNode> {
    source: string | LayoutNode;
    target: string | LayoutNode;
    style: 'solid' | 'dashed';
}

// Vertical distance between dependency bands.
export const BAND = 92;
export const NODE_HEIGHT = 30;

// A label's width before the browser can measure it: an average glyph width
// for the interface font at the graph's size, plus padding.
export const estimateWidth = (label: string) => Math.round(Math.min(label.length, 42) * 6.9 + 28);

// How deep each node sits: the longest chain of solid edges leading into it.
// A cycle --- which the content should not have, but might --- is cut where
// the walk first comes back on itself.
export function depths(ids: string[], edges: Array<{ from: string; to: string; style: string }>) {
    const into = new Map<string, string[]>(ids.map((id) => [id, []]));
    for (const edge of edges) if (edge.style == 'solid') into.get(edge.to)?.push(edge.from);
    const depth = new Map<string, number>();
    const visiting = new Set<string>();
    const visit = (id: string): number => {
        const known = depth.get(id);
        if (known !== undefined) return known;
        if (visiting.has(id)) return 0;
        visiting.add(id);
        const parents = into.get(id) ?? [];
        const value = parents.length ? 1 + Math.max(...parents.map(visit)) : 0;
        visiting.delete(id);
        depth.set(id, value);
        return value;
    };
    ids.forEach(visit);
    return depth;
}

// Keeps labels from overlapping: any two boxes that would touch are pushed
// apart along whichever axis they overlap least.
function forceBoxes(padding = 10): Force<LayoutNode, LayoutEdge> {
    let nodes: LayoutNode[] = [];
    const force = (alpha: number) => {
        for (let i = 0; i < nodes.length; i++) {
            const a = nodes[i]!;
            for (let j = i + 1; j < nodes.length; j++) {
                const b = nodes[j]!;
                const dx = (b.x ?? 0) - (a.x ?? 0);
                const dy = (b.y ?? 0) - (a.y ?? 0);
                const overlapX = (a.width + b.width) / 2 + padding - Math.abs(dx);
                const overlapY = (a.height + b.height) / 2 + padding - Math.abs(dy);
                if (overlapX <= 0 || overlapY <= 0) continue;
                const strength = Math.min(1, alpha * 4);
                if (overlapX < overlapY) {
                    const shift = (overlapX / 2) * strength * (dx < 0 ? -1 : 1);
                    a.x = (a.x ?? 0) - shift;
                    b.x = (b.x ?? 0) + shift;
                } else {
                    const shift = (overlapY / 2) * strength * (dy < 0 ? -1 : 1);
                    a.y = (a.y ?? 0) - shift;
                    b.y = (b.y ?? 0) + shift;
                }
            }
        }
    };
    force.initialize = (given: LayoutNode[]) => (nodes = given);
    return force;
}

export function createSimulation(
    nodes: LayoutNode[],
    edges: LayoutEdge[],
    tuning: GraphTuning,
): Simulation<LayoutNode, LayoutEdge> {
    const deepest = Math.max(0, ...nodes.map((node) => node.depth));
    const bandOf = (node: LayoutNode) => (node.depth - deepest / 2) * BAND;
    return forceSimulation(nodes)
        .force(
            'links',
            forceLink<LayoutNode, LayoutEdge>(edges)
                .id((node) => node.id)
                .distance((edge) =>
                    edge.style == 'solid' ? tuning.linkDistance : tuning.linkDistance * 2.2,
                )
                .strength((edge) => (edge.style == 'solid' ? 0.6 : 0.06)),
        )
        .force('charge', forceManyBody<LayoutNode>().strength(tuning.charge).distanceMax(700))
        .force('bands', forceY<LayoutNode>(bandOf).strength(0.5))
        .force('gravity', forceX<LayoutNode>(0).strength(tuning.gravity))
        .force('gravityY', forceY<LayoutNode>(0).strength(tuning.gravity / 4))
        .force('boxes', forceBoxes());
}

// Runs the simulation to rest and returns where everything ended up.
export function layout(nodes: LayoutNode[], edges: LayoutEdge[], tuning: GraphTuning, ticks = 400) {
    const simulation = createSimulation(nodes, edges, tuning).stop();
    simulation.tick(ticks);
    return new Map(nodes.map((node) => [node.id, { x: node.x ?? 0, y: node.y ?? 0 }]));
}

// The point where the segment from a box's centre towards (x, y) leaves the
// box, so that an edge starts and ends at a label's border.
export function boxExit(
    cx: number,
    cy: number,
    width: number,
    height: number,
    x: number,
    y: number,
    margin = 3,
) {
    const dx = x - cx;
    const dy = y - cy;
    if (dx == 0 && dy == 0) return { x: cx, y: cy };
    const sx = (width / 2 + margin) / Math.abs(dx || 1e-9);
    const sy = (height / 2 + margin) / Math.abs(dy || 1e-9);
    const s = Math.min(sx, sy, 1);
    return { x: cx + dx * s, y: cy + dy * s };
}
