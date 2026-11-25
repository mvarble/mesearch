<script lang="ts">
    import { layoutGraph, type TextLayout } from '../graph/geometry';
    import {
        edgeKindClasses,
        nodeKindClasses,
        type EdgeSpec,
        type GraphSpec,
        type NodeSpec,
    } from '../graph/spec';
    import { renderMixed } from '../tex';

    // Renders a hand-placed graph figure (see `$lib/graph/spec.ts`) as SVG, with a caption and a
    // legend of the node and edge kinds it uses, named and styled as the figure defines them. All
    // geometry is computed in `$lib/graph/geometry.ts`; this component only writes it out.
    //
    // Text is not drawn in the SVG. It sits in an HTML layer over it, so that labels can hold
    // KaTeX: HTML inside an SVG would need `<foreignObject>`, whose box must be sized in advance
    // (impossible without measuring, and so without JavaScript), and WebKit misplaces the
    // `position: relative` spans KaTeX is built from inside a scaled one. Each label is placed
    // by percentage, and its font size tracks the figure's width through container-query units,
    // so the layer scales exactly with the drawing, all in CSS.

    let { spec }: { spec: GraphSpec } = $props();

    const layout = $derived(layoutGraph(spec));
    const id = $props.id();
    const text = (source: string) => renderMixed(source, spec.katexMacros);

    const nodeClass = (node: NodeSpec) =>
        ['graph-node', nodeKindClasses(spec.nodeKinds[node.kind]), node.class]
            .filter(Boolean)
            .join(' ');

    const edgeClass = (edge: EdgeSpec) =>
        [
            'graph-edge',
            edgeKindClasses(edge.kind === undefined ? undefined : spec.edgeKinds?.[edge.kind]),
            edge.muted && 'graph-muted',
            edge.class,
        ]
            .filter(Boolean)
            .join(' ');

    // Positions a label: its point as a percentage of the viewport, then a translation that puts
    // the requested part of its box on that point.
    const SHIFT_X = { start: '0%', middle: '-50%', end: '-100%' };
    const SHIFT_Y = { hanging: '0%', middle: '-50%', auto: '-100%' };
    const place = (t: TextLayout) =>
        `left: ${(t.x / layout.width) * 100}%; top: ${(t.y / layout.height) * 100}%; ` +
        `transform: translate(${SHIFT_X[t.anchor]}, ${SHIFT_Y[t.baseline]});`;
    const centered = (x: number, y: number) =>
        place({ x, y, anchor: 'middle', baseline: 'middle' });

    // The legend lists the kinds this figure uses, in the order the figure declares them.
    const legend = $derived.by(() => {
        const nodeKinds = new Set(spec.nodes.map((n) => n.kind));
        const edgeKinds = new Set(spec.edges.map((e) => e.kind));
        return {
            nodes: Object.entries(spec.nodeKinds).filter(([key]) => nodeKinds.has(key)),
            edges: Object.entries(spec.edgeKinds ?? {}).filter(([key]) => edgeKinds.has(key)),
        };
    });
</script>

<figure class="model-graph">
    <div
        class="graph-canvas"
        style:max-width="{layout.width}px"
        style:--graph-width={layout.width}
        style:--graph-font={layout.fontSize}
    >
        <svg viewBox="0 0 {layout.width} {layout.height}" role="img" aria-labelledby="{id}-title">
            <title id="{id}-title">{spec.title}</title>

            {#each layout.edges as edge, i (i)}
                <g class={edgeClass(edge.spec)} style={edge.spec.style}>
                    <path d={edge.d} />
                    {#each edge.arrows as points, j (j)}
                        <polygon {points} />
                    {/each}
                </g>
            {/each}

            {#each layout.nodes as node (node.spec.id)}
                <g
                    class={nodeClass(node.spec)}
                    class:graph-muted={node.spec.muted}
                    style={node.spec.style}
                >
                    {#if node.spec.title}<title>{node.spec.title}</title>{/if}
                    {#if node.shape == 'square'}
                        <rect
                            x={node.cx - node.r}
                            y={node.cy - node.r}
                            width={2 * node.r}
                            height={2 * node.r}
                            rx="3"
                        />
                    {:else}
                        <circle cx={node.cx} cy={node.cy} r={node.r} />
                    {/if}
                </g>
            {/each}
        </svg>

        <div class="graph-labels">
            {#each layout.edges as edge, i (i)}
                {#if edge.label}
                    <span
                        class="edge-label {edgeClass(edge.spec)}"
                        style={centered(edge.label.x, edge.label.y)}
                        >{@html text(edge.spec.label!)}</span
                    >
                {/if}
            {/each}
            {#each layout.nodes as node (node.spec.id)}
                {#if node.spec.label}
                    <span
                        class="node-label"
                        class:graph-muted={node.spec.muted}
                        style={centered(node.cx, node.cy)}>{@html text(node.spec.label)}</span
                    >
                {/if}
                {#if node.annotation}
                    <span
                        class="node-annotation"
                        class:graph-muted={node.spec.muted}
                        style={place(node.annotation)}>{@html text(node.spec.annotation!)}</span
                    >
                {/if}
            {/each}
        </div>
    </div>

    {#if spec.legend ?? true}
        <ul class="graph-legend" aria-label="Legend">
            {#each legend.nodes as [key, kind] (key)}
                <li>
                    <svg viewBox="-9 -9 18 18" width="14" height="14" aria-hidden="true">
                        <g class="graph-node {nodeKindClasses(kind)}">
                            {#if kind.shape == 'square'}
                                <rect x="-7" y="-7" width="14" height="14" rx="2" />
                            {:else}
                                <circle r="7" />
                            {/if}
                        </g>
                    </svg>
                    <span>{@html text(kind.name)}</span>
                </li>
            {/each}
            {#each legend.edges as [key, kind] (key)}
                <li>
                    <svg viewBox="0 0 28 10" width="28" height="10" aria-hidden="true">
                        <g class="graph-edge {edgeKindClasses(kind)}">
                            <path d="M 1 5 L 20 5" />
                            <polygon points="27,5 19,1.5 19,8.5" />
                        </g>
                    </svg>
                    <span>{@html text(kind.name)}</span>
                </li>
            {/each}
        </ul>
    {/if}

    <figcaption>
        <strong>{spec.title}.</strong>
        {#if spec.caption}{@html text(spec.caption)}{/if}
    </figcaption>
</figure>
