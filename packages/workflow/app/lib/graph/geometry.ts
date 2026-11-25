import type { EdgeSpec, GraphSpec, NodeSpec, Point } from './spec';

// Turns a `GraphSpec` into SVG-ready geometry. Everything here is computed in the spec's
// mathematical coordinates (+Y up); `flip` converts to SVG coordinates (+Y down) only when a
// coordinate is written out.

export interface NodeLayout {
    spec: NodeSpec;
    shape: 'circle' | 'square';
    r: number;
    /** Center, in SVG coordinates. */
    cx: number;
    cy: number;
    annotation?: TextLayout;
}

/**
 * Where a piece of text goes, in SVG coordinates. `anchor` says which part of the text's box sits
 * on (x, y) horizontally, and `baseline` vertically: `auto` puts the box above the point, `hanging`
 * below it.
 */
export interface TextLayout {
    x: number;
    y: number;
    anchor: 'start' | 'middle' | 'end';
    baseline: 'auto' | 'middle' | 'hanging';
}

export interface EdgeLayout {
    spec: EdgeSpec;
    /** The SVG path data of the edge's line, stopping short of any arrowhead. */
    d: string;
    /** The SVG `points` of each arrowhead polygon. */
    arrows: string[];
    label?: { x: number; y: number };
}

export interface GraphLayout {
    width: number;
    height: number;
    fontSize: number;
    nodes: NodeLayout[];
    edges: EdgeLayout[];
}

type Vec = Point;

const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1]];
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1]];
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k];
const norm = (a: Vec) => Math.hypot(a[0], a[1]);
const unit = (a: Vec): Vec => {
    const n = norm(a);
    return n > 1e-9 ? scale(a, 1 / n) : [1, 0];
};
const radians = (degrees: number) => (degrees * Math.PI) / 180;
const direction = (degrees: number): Vec => [
    Math.cos(radians(degrees)),
    Math.sin(radians(degrees)),
];
const angleTo = (from: Vec, to: Vec) =>
    (Math.atan2(to[1] - from[1], to[0] - from[0]) * 180) / Math.PI;

/** The point where the ray from a node's center at `angle` leaves its boundary. */
export function boundaryPoint(
    node: { x: number; y: number; r: number; shape: 'circle' | 'square' },
    angle: number,
): Vec {
    const [c, s] = direction(angle);
    const reach = node.shape == 'square' ? node.r / Math.max(Math.abs(c), Math.abs(s)) : node.r;
    return [node.x + reach * c, node.y + reach * s];
}

interface Resolved {
    x: number;
    y: number;
    r: number;
    shape: 'circle' | 'square';
}

export function layoutGraph(spec: GraphSpec): GraphLayout {
    const fontSize = spec.fontSize ?? 15;
    const arrowSize = spec.arrowSize ?? 10;
    const flip = ([x, y]: Vec): Vec => [x, spec.height - y];

    const resolved = new Map<string, Resolved>();
    const nodes: NodeLayout[] = spec.nodes.map((node) => {
        if (resolved.has(node.id))
            throw new Error(`Graph "${spec.title}": duplicate node "${node.id}".`);
        const kind = spec.nodeKinds[node.kind];
        if (!kind) {
            throw new Error(
                `Graph "${spec.title}": node "${node.id}" is of kind "${node.kind}", which ` +
                    `\`nodeKinds\` does not define.`,
            );
        }
        const r = node.r ?? spec.nodeRadius ?? 22;
        const shape = node.shape ?? kind.shape ?? 'circle';
        const geometry = { x: node.x, y: node.y, r, shape };
        resolved.set(node.id, geometry);
        const [cx, cy] = flip([node.x, node.y]);
        return {
            spec: node,
            shape,
            r,
            cx,
            cy,
            annotation: node.annotation
                ? annotationAt(geometry, node.annotationAngle ?? -90, fontSize, flip)
                : undefined,
        };
    });

    const find = (id: string, edge: EdgeSpec) => {
        const node = resolved.get(id);
        if (!node) {
            throw new Error(
                `Graph "${spec.title}": edge ${edge.from} → ${edge.to} names no node "${id}".`,
            );
        }
        return node;
    };

    const edges = spec.edges.map((edge): EdgeLayout => {
        if (edge.kind !== undefined && !spec.edgeKinds?.[edge.kind]) {
            throw new Error(
                `Graph "${spec.title}": edge ${edge.from} → ${edge.to} is of kind ` +
                    `"${edge.kind}", which \`edgeKinds\` does not define.`,
            );
        }
        return layoutEdge(edge, find(edge.from, edge), find(edge.to, edge), arrowSize, flip);
    });

    return { width: spec.width, height: spec.height, fontSize, nodes, edges };
}

function annotationAt(
    node: Resolved,
    angle: number,
    fontSize: number,
    flip: (p: Vec) => Vec,
): TextLayout {
    const [c, s] = direction(angle);
    const [x, y] = flip(add(boundaryPoint(node, angle), scale([c, s], fontSize * 0.45)));
    return {
        x,
        y,
        anchor: c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle',
        // Above the node the text sits on its baseline; below, it hangs from its top.
        baseline: s > 0.3 ? 'auto' : s < -0.3 ? 'hanging' : 'middle',
    };
}

/** A cubic Bézier segment, as its four control points. */
type Cubic = [Vec, Vec, Vec, Vec];

function layoutEdge(
    edge: EdgeSpec,
    from: Resolved,
    to: Resolved,
    arrowSize: number,
    flip: (p: Vec) => Vec,
): EdgeLayout {
    const via = edge.via ?? [];
    const bend = via.length ? 0 : (edge.bend ?? 0);
    const curve = edge.curve ?? (bend ? 'bezier' : 'straight');
    const arrow = edge.arrow ?? 'end';

    const fromCenter: Vec = [from.x, from.y];
    const toCenter: Vec = [to.x, to.y];
    const fromAngle = edge.fromAngle ?? angleTo(fromCenter, via[0] ?? toCenter) + bend;
    const toAngle = edge.toAngle ?? angleTo(toCenter, via.at(-1) ?? fromCenter) - bend;
    const points: Vec[] = [boundaryPoint(from, fromAngle), ...via, boundaryPoint(to, toAngle)];

    // The path as either line segments or cubic segments. An arrowhead's tip sits on the node's
    // boundary, so the line is shortened by the arrowhead's length at that end.
    const arrows: Vec[][] = [];
    let d: string;
    let samples: Vec[];

    if (curve == 'straight') {
        if (arrow == 'end' || arrow == 'both') {
            const last = points.length - 1;
            const dir = unit(sub(points[last], points[last - 1]));
            arrows.push(arrowhead(points[last], dir, arrowSize));
            points[last] = sub(points[last], scale(dir, arrowSize));
        }
        if (arrow == 'start' || arrow == 'both') {
            const dir = unit(sub(points[0], points[1]));
            arrows.push(arrowhead(points[0], dir, arrowSize));
            points[0] = sub(points[0], scale(dir, arrowSize));
        }
        d = points.map((p, i) => `${i ? 'L' : 'M'} ${fmt(flip(p))}`).join(' ');
        samples = points;
    } else {
        const cubics = smoothThrough(points, direction(fromAngle), direction(toAngle));
        if (arrow == 'end' || arrow == 'both') {
            const last = cubics[cubics.length - 1];
            const dir = travelInto(last[3], [last[2], last[1], last[0]], direction(toAngle));
            arrows.push(arrowhead(last[3], dir, arrowSize));
            last[3] = sub(last[3], scale(dir, arrowSize));
            last[2] = sub(last[2], scale(dir, arrowSize));
        }
        if (arrow == 'start' || arrow == 'both') {
            const first = cubics[0];
            const dir = travelInto(first[0], [first[1], first[2], first[3]], direction(fromAngle));
            arrows.push(arrowhead(first[0], dir, arrowSize));
            first[0] = sub(first[0], scale(dir, arrowSize));
            first[1] = sub(first[1], scale(dir, arrowSize));
        }
        d =
            `M ${fmt(flip(cubics[0][0]))} ` +
            cubics
                .map(([, c1, c2, p]) => `C ${fmt(flip(c1))} ${fmt(flip(c2))} ${fmt(flip(p))}`)
                .join(' ');
        samples = cubics.flatMap((c, i) => sampleCubic(c, 24).slice(i ? 1 : 0));
    }

    return {
        spec: edge,
        d,
        arrows: arrows.map((polygon) => polygon.map((p) => fmt(flip(p))).join(' ')),
        label: edge.label ? toXY(flip(alongPolyline(samples, edge.labelAt ?? 0.5))) : undefined,
    };
}

/**
 * A smooth curve through `points` (a Catmull–Rom spline, as cubic segments) that leaves the first
 * point along `startNormal` and arrives at the last point against `endNormal`, both of which point
 * out of their nodes.
 */
export function smoothThrough(points: Vec[], startNormal: Vec, endNormal: Vec): Cubic[] {
    const n = points.length - 1;
    // Endpoint tangents are 1.2 chord lengths, so that a two-point curve has its control points
    // 0.4 of the way along, much as TikZ's default looseness does.
    const tangents = points.map((p, i): Vec => {
        if (i == 0) return scale(startNormal, 1.2 * norm(sub(points[1], p)));
        if (i == n) return scale(endNormal, -1.2 * norm(sub(p, points[n - 1])));
        return scale(sub(points[i + 1], points[i - 1]), 0.5);
    });
    return points
        .slice(0, n)
        .map((p, i) => [
            p,
            add(p, scale(tangents[i], 1 / 3)),
            sub(points[i + 1], scale(tangents[i + 1], 1 / 3)),
            points[i + 1],
        ]);
}

/**
 * The direction in which a curve arrives at its endpoint `tip`, from the nearest of `candidates`
 * (the control points, nearest first) that differs from it: a control point can coincide with its
 * endpoint. If they all do, the curve arrives against the node's outward `normal`.
 */
function travelInto(tip: Vec, candidates: Vec[], normal: Vec): Vec {
    for (const p of candidates) {
        if (norm(sub(tip, p)) > 1e-6) return unit(sub(tip, p));
    }
    return scale(normal, -1);
}

function arrowhead(tip: Vec, dir: Vec, size: number): Vec[] {
    const base = sub(tip, scale(dir, size));
    const across = scale([-dir[1], dir[0]], size * 0.45);
    return [tip, add(base, across), sub(base, across)];
}

function sampleCubic([p0, p1, p2, p3]: Cubic, count: number): Vec[] {
    return Array.from({ length: count + 1 }, (_, i) => {
        const t = i / count;
        const u = 1 - t;
        return add(
            add(scale(p0, u * u * u), scale(p1, 3 * u * u * t)),
            add(scale(p2, 3 * u * t * t), scale(p3, t * t * t)),
        );
    });
}

/** The point a `fraction` of the way along a polyline, by length. */
export function alongPolyline(points: Vec[], fraction: number): Vec {
    const lengths = points.slice(1).map((p, i) => norm(sub(p, points[i])));
    let remaining = Math.min(Math.max(fraction, 0), 1) * lengths.reduce((a, b) => a + b, 0);
    for (let i = 0; i < lengths.length; i++) {
        if (remaining <= lengths[i] || i == lengths.length - 1) {
            const t = lengths[i] ? Math.min(remaining / lengths[i], 1) : 0;
            return add(points[i], scale(sub(points[i + 1], points[i]), t));
        }
        remaining -= lengths[i];
    }
    return points[0];
}

const round = (v: number) => Math.round(v * 100) / 100;
const fmt = ([x, y]: Vec) => `${round(x)},${round(y)}`;
const toXY = ([x, y]: Vec) => ({ x: round(x), y: round(y) });
