// The input to `<ModelGraph>`: a hand-placed figure of a graph.
//
// A figure names its own kinds of node and edge. The component knows nothing of what a node
// means: each figure says what its kinds are called (in the legend and in the Markdown export) and
// how each is drawn, from a fixed palette of hues, shapes and line styles.
//
// Every piece of text (kind names, node labels, annotations, edge labels, the caption) may contain
// inline KaTeX between dollar signs, e.g. String.raw`$\log p(x \mid \mu)$`. `\$` is a literal
// dollar sign.
//
// Coordinates are mathematical, not SVG: the origin is the bottom-left corner of the viewport, +X
// points right and +Y points **up**. Angles are in degrees, counter-clockwise from +X, so 90° is
// straight up. Lengths are in viewport units; the figure scales to fit its column.

/** The palette. Each hue is a token `--graph-<hue>` in `tokens/colors.css`, tuned for both themes. */
export const HUES = [
    'gray',
    'blue',
    'orange',
    'green',
    'purple',
    'teal',
    'red',
    'sky',
    'amber',
    'olive',
    'magenta',
] as const;
export type Hue = (typeof HUES)[number];

/** A kind of node: what the figure calls it, and how it is drawn. */
export interface NodeKindSpec {
    /** Its name in the legend and the Markdown export, e.g. `Quantity`. */
    name: string;
    hue: Hue;
    /** Defaults to `circle`. */
    shape?: 'circle' | 'square';
    /** `shaded` fills the node strongly, the convention for an observed quantity. Defaults to `light`. */
    fill?: 'light' | 'shaded';
    /** Defaults to `solid`. */
    outline?: 'solid' | 'dashed';
}

/** A kind of edge: what the figure calls it, and how it is drawn. */
export interface EdgeKindSpec {
    /** Its name in the legend and the Markdown export, e.g. `input of`. */
    name: string;
    /** Defaults to the neutral edge colour. */
    hue?: Hue;
    /** Defaults to `solid`. */
    line?: 'solid' | 'dotted' | 'dashed';
}

export type Point = [x: number, y: number];

export interface NodeSpec {
    id: string;
    /** The center, in mathematical coordinates. */
    x: number;
    y: number;
    /** A key of the figure's `nodeKinds`. */
    kind: string;
    /** Radius, or half the side of a square. Defaults to the figure's `nodeRadius`. */
    r?: number;
    /** Overrides the kind's shape. */
    shape?: 'circle' | 'square';
    /** Text drawn inside the node: plain (`x₁`) or TeX (`$x_1$`). */
    label?: string;
    /** Text drawn just outside the node, e.g. a quantity type or an operation. */
    annotation?: string;
    /** Where the annotation sits, as an angle on the node. Defaults to -90 (below). */
    annotationAngle?: number;
    /** A hover tooltip. */
    title?: string;
    /** Draw faintly, to focus attention elsewhere. */
    muted?: boolean;
    class?: string;
    style?: string;
}

export interface EdgeSpec {
    from: string;
    to: string;
    /**
     * A key of the figure's `edgeKinds`. Without one, the edge is a plain solid line in the
     * neutral colour, and the legend does not list it.
     */
    kind?: string;
    /**
     * Where the edge leaves `from` / meets `to`, as an angle on that node. Defaults to the direction
     * of the edge's next point (the other node's center, or the nearest `via` point).
     */
    fromAngle?: number;
    toAngle?: number;
    /** Intermediate points the edge passes through. */
    via?: Point[];
    /**
     * `straight` joins the points with line segments. `bezier` draws a smooth curve through them
     * that leaves and meets each node along its normal. Defaults to `bezier` when `bend` is set.
     */
    curve?: 'straight' | 'bezier';
    /**
     * Rotate both default endpoint angles by this many degrees, as TikZ's `bend left` does:
     * positive bows the edge to the left of its direction of travel. Ignored when `via` is set.
     */
    bend?: number;
    /** Defaults to `end`. */
    arrow?: 'end' | 'start' | 'both' | 'none';
    label?: string;
    /** How far along the edge the label sits, from 0 to 1. Defaults to 0.5. */
    labelAt?: number;
    muted?: boolean;
    class?: string;
    style?: string;
}

export interface GraphSpec {
    /** The viewport. */
    width: number;
    height: number;
    /** The figure's accessible name, also shown as the start of its caption. */
    title: string;
    /** A sentence or two explaining the figure. Kept in the Markdown export. */
    caption?: string;
    /** The figure's kinds of node, by key. The legend lists them in this order. */
    nodeKinds: Record<string, NodeKindSpec>;
    /** The figure's kinds of edge, by key. The legend lists them in this order. */
    edgeKinds?: Record<string, EdgeKindSpec>;
    nodes: NodeSpec[];
    edges: EdgeSpec[];
    /** Default node radius. Defaults to 22. */
    nodeRadius?: number;
    /** Text size, in viewport units. Defaults to 15. */
    fontSize?: number;
    /** Arrowhead length, in viewport units. Defaults to 10. */
    arrowSize?: number;
    /** KaTeX macros for this figure, over the site-wide ones in `katex.config.ts`. */
    katexMacros?: Record<string, string>;
    /** Show a legend of the node and edge kinds used. Defaults to true. */
    legend?: boolean;
}

/** An identity function that type-checks a spec where it is written. */
export const defineGraph = (spec: GraphSpec): GraphSpec => spec;

/** The CSS classes that draw a node of `kind`. */
export const nodeKindClasses = (kind: NodeKindSpec) =>
    [
        `hue-${kind.hue}`,
        kind.fill == 'shaded' && 'fill-shaded',
        kind.outline == 'dashed' && 'outline-dashed',
    ]
        .filter(Boolean)
        .join(' ');

/** The CSS classes that draw an edge of `kind`, or a plain edge when there is none. */
export const edgeKindClasses = (kind: EdgeKindSpec | undefined) =>
    [kind?.hue && `hue-${kind.hue}`, `line-${kind?.line ?? 'solid'}`].filter(Boolean).join(' ');
