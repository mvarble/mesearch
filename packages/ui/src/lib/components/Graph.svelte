<script lang="ts" module>
    import type { GraphLegend as Legend } from '../types.js';

    export const MESEARCH_LEGEND: Legend = {
        kinds: [
            { kind: 'concept', label: 'Concept', shape: 'pill' },
            { kind: 'writeup', label: 'Writeup', shape: 'card' },
        ],
        solid: 'builds on',
        dashed: 'related',
        sequenced: 'in a sequence',
        from: 'Builds on',
        to: 'Leads to',
        related: 'Related',
        empty: 'Concepts and writeups will appear here as they are written.',
    };
</script>

<script lang="ts">
    import { onMount, type Component } from 'svelte';
    import {
        boxExit,
        createSimulation,
        DEFAULT_TUNING,
        NODE_HEIGHT,
        type GraphTuning,
        type LayoutEdge,
        type LayoutNode,
    } from '../graph-layout.js';
    import { kindLabel } from '../settings.js';
    import type { GraphLegend, GraphLink, GraphNode, IndexEntry } from '../types.js';
    import GraphPanel from './GraphPanel.svelte';
    import Icon from './Icon.svelte';

    // The library as a map. Solid arrows run from what a document builds on to
    // the document, so following them is a reading order; dashed lines join
    // documents that link to each other without either depending on the other.
    //
    // The page ships this already laid out, as plain links. With JavaScript it
    // comes alive: drag a node and the rest make room, pan and zoom, and a
    // click opens the document's description beside the graph rather than
    // leaving the page.
    //
    // The nodes arrive with positions: lay them out at build time with
    // `layout` from `@mvarble/mesearch-ui/server`. `entries` and
    // `descriptions` feed the preview panel, by node key.
    let {
        nodes: given,
        links,
        entries,
        descriptions = {},
        tuning = DEFAULT_TUNING,
        legend = MESEARCH_LEGEND,
    }: {
        nodes: GraphNode[];
        links: GraphLink[];
        entries: Record<string, IndexEntry>;
        descriptions?: Record<string, Component>;
        tuning?: GraphTuning;
        // What the kinds and the lines mean; mesearch's own by default.
        legend?: GraphLegend;
    } = $props();

    type SimNode = LayoutNode & GraphNode;
    // d3 moves these objects itself, so they are kept out of Svelte's
    // reactivity; `frame` is bumped whenever they have moved.
    // svelte-ignore state_referenced_locally
    const nodes: SimNode[] = given.map((node) => ({
        ...node,
        id: node.key,
        height: NODE_HEIGHT,
    }));
    const byKey = new Map(nodes.map((node) => [node.key, node]));
    // svelte-ignore state_referenced_locally
    const edges = links.filter((link) => byKey.has(link.from) && byKey.has(link.to));
    let frame = $state(0);

    // Everything is drawn in graph coordinates; the view is a pan and a zoom.
    const PAD = 40;
    function bounds() {
        if (nodes.length == 0) return { x: -200, y: -120, width: 400, height: 240 };
        const xs = nodes.flatMap((n) => [(n.x ?? 0) - n.width / 2, (n.x ?? 0) + n.width / 2]);
        const ys = nodes.flatMap((n) => [(n.y ?? 0) - n.height / 2, (n.y ?? 0) + n.height / 2]);
        const x = Math.min(...xs) - PAD;
        const y = Math.min(...ys) - PAD;
        return { x, y, width: Math.max(...xs) + PAD - x, height: Math.max(...ys) + PAD - y };
    }
    const box = bounds();
    const viewBox = `${box.x} ${box.y} ${box.width} ${box.height}`;
    let view = $state({ x: 0, y: 0, k: 1 });

    let selected = $state<string | null>(null);
    let hovered = $state<string | null>(null);
    let svg: SVGSVGElement | undefined = $state();
    let container: HTMLElement | undefined = $state();
    let live = $state(false);

    // What to emphasise: the focused node, its neighbours, and --- for the
    // selected node --- everything it transitively builds on.
    let focus = $derived(hovered ?? selected);
    let lit = $derived.by(() => {
        if (!focus) return null;
        // Built afresh on every change and never mutated afterwards, so these
        // need no reactivity of their own.
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const set = new Set([focus]);
        for (const edge of edges) {
            if (edge.from == focus) set.add(edge.to);
            if (edge.to == focus) set.add(edge.from);
        }
        // eslint-disable-next-line svelte/prefer-svelte-reactivity
        const seen = new Set([focus]);
        const stack = [focus];
        while (stack.length) {
            const key = stack.pop()!;
            for (const edge of edges) {
                if (edge.style != 'solid' || edge.to != key || seen.has(edge.from)) continue;
                seen.add(edge.from);
                set.add(edge.from);
                stack.push(edge.from);
            }
        }
        return set;
    });

    const label = (title: string) =>
        title.length > 40 ? title.slice(0, 38).trimEnd() + '…' : title;

    let simulation: ReturnType<typeof createSimulation> | undefined;

    onMount(() => {
        live = true;
        // Labels are measured now that there is a font to measure them in,
        // and the layout settles around their real sizes.
        for (const text of svg?.querySelectorAll<SVGTextElement>('text[data-key]') ?? []) {
            const node = byKey.get(text.dataset.key!);
            if (node) node.width = Math.ceil(text.getComputedTextLength()) + 28;
        }
        const simEdges: LayoutEdge[] = edges.map((e) => ({
            source: e.from,
            target: e.to,
            style: e.style,
        }));
        simulation = createSimulation(nodes, simEdges, tuning)
            .alpha(0.12)
            .alphaDecay(0.04)
            .on('tick', () => frame++);
        return () => simulation?.stop();
    });

    // Screen coordinates to graph coordinates.
    function toGraph(clientX: number, clientY: number) {
        const point = toViewBox(clientX, clientY);
        return { x: (point.x - view.x) / view.k, y: (point.y - view.y) / view.k };
    }

    // How many view-box units one screen pixel is.
    const unitsPerPixel = () => 1 / (svg?.getScreenCTM()?.a || 1);

    // A point on the screen in view-box coordinates, before the pan and zoom.
    function toViewBox(clientX: number, clientY: number) {
        const matrix = svg?.getScreenCTM();
        if (!matrix) return { x: 0, y: 0 };
        const point = new DOMPoint(clientX, clientY).matrixTransform(matrix.inverse());
        return { x: point.x, y: point.y };
    }

    function zoomBy(factor: number, about?: { x: number; y: number }) {
        const k = Math.min(4, Math.max(0.3, view.k * factor));
        const centre = about ?? { x: box.x + box.width / 2, y: box.y + box.height / 2 };
        // Keep `centre` (in view-box coordinates) where it is.
        view = {
            k,
            x: centre.x - ((centre.x - view.x) * k) / view.k,
            y: centre.y - ((centre.y - view.y) * k) / view.k,
        };
    }

    function reset() {
        view = { x: 0, y: 0, k: 1 };
    }

    // Brings a node into the part of the graph the panel leaves visible.
    function reveal(key: string) {
        const node = byKey.get(key);
        if (!node || !svg || !container) return;
        const rect = container.getBoundingClientRect();
        const wide = matchMedia('(min-width: 760px)').matches;
        // The drawer covers the right of a wide graph, the sheet the bottom of
        // a narrow one; the node goes in the middle of what is left.
        const visibleWidth = wide ? rect.width - Math.min(368, rect.width * 0.45) : rect.width;
        const visibleHeight = wide ? rect.height : rect.height * 0.4;
        const target = toViewBox(rect.left + visibleWidth / 2, rect.top + visibleHeight / 2);
        view = {
            k: view.k,
            x: target.x - (node.x ?? 0) * view.k,
            y: target.y - (node.y ?? 0) * view.k,
        };
    }

    function select(key: string | null) {
        selected = key;
        if (key) reveal(key);
    }

    // Dragging a node, panning the background, and pinching with two fingers
    // all start from a pointer going down. None of this is drawn, so none of
    // it is reactive.
    // eslint-disable-next-line svelte/prefer-svelte-reactivity
    const pointers = new Map<number, { x: number; y: number }>();
    let drag: { key: string; startX: number; startY: number; moved: boolean } | null = null;
    let pan = $state<{ x: number; y: number; viewX: number; viewY: number } | null>(null);
    let pinch: { distance: number; k: number } | null = null;
    let suppressClick = false;

    function onNodePointerDown(event: PointerEvent, key: string) {
        if (event.button != 0) return;
        drag = { key, startX: event.clientX, startY: event.clientY, moved: false };
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
        event.stopPropagation();
    }

    function onNodePointerMove(event: PointerEvent) {
        if (!drag) return;
        const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY);
        if (!drag.moved && distance < 4) return;
        drag.moved = true;
        const node = byKey.get(drag.key)!;
        const point = toGraph(event.clientX, event.clientY);
        node.fx = point.x;
        node.fy = point.y;
        simulation?.alphaTarget(0.25).restart();
    }

    function onNodePointerUp() {
        if (!drag) return;
        if (drag.moved) {
            const node = byKey.get(drag.key)!;
            node.fx = null;
            node.fy = null;
            simulation?.alphaTarget(0);
            suppressClick = true;
        }
        drag = null;
    }

    function onNodeClick(event: MouseEvent, key: string) {
        // A modified click still opens the document, in a new tab or not.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.button != 0) return;
        event.preventDefault();
        if (suppressClick) {
            suppressClick = false;
            return;
        }
        select(selected == key ? null : key);
    }

    function onBackgroundPointerDown(event: PointerEvent) {
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.size == 2) {
            const [a, b] = [...pointers.values()] as [
                { x: number; y: number },
                { x: number; y: number },
            ];
            pinch = { distance: Math.hypot(a.x - b.x, a.y - b.y), k: view.k };
            pan = null;
        } else if (event.pointerType == 'mouse' && event.button == 0) {
            pan = { x: event.clientX, y: event.clientY, viewX: view.x, viewY: view.y };
        }
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
    }

    function onBackgroundPointerMove(event: PointerEvent) {
        if (pointers.has(event.pointerId))
            pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pinch && pointers.size == 2) {
            const [a, b] = [...pointers.values()] as [
                { x: number; y: number },
                { x: number; y: number },
            ];
            const distance = Math.hypot(a.x - b.x, a.y - b.y);
            const mid = toViewBox((a.x + b.x) / 2, (a.y + b.y) / 2);
            zoomBy((pinch.k * distance) / pinch.distance / view.k, mid);
        } else if (pan) {
            const scale = unitsPerPixel();
            view = {
                ...view,
                x: pan.viewX + (event.clientX - pan.x) * scale,
                y: pan.viewY + (event.clientY - pan.y) * scale,
            };
        }
    }

    function onBackgroundPointerUp(event: PointerEvent) {
        pointers.delete(event.pointerId);
        if (pointers.size < 2) pinch = null;
        if (pan && Math.hypot(event.clientX - pan.x, event.clientY - pan.y) < 4) select(null);
        pan = null;
    }

    // A plain wheel scrolls the page past the graph; with Ctrl or ⌘ held ---
    // which is also what a trackpad pinch reports --- it zooms.
    function onwheel(event: WheelEvent) {
        if (!(event.ctrlKey || event.metaKey)) return;
        event.preventDefault();
        zoomBy(Math.exp(-event.deltaY * 0.0025), toViewBox(event.clientX, event.clientY));
    }

    function onkeydown(event: KeyboardEvent) {
        if (event.key == 'Escape' && selected) {
            select(null);
            event.stopPropagation();
        }
    }

    // Positions, reread on every frame of the simulation.
    // Drawn round, as concepts are; anything else is a card.
    const pill = (kind: string) => legend.kinds.find((k) => k.kind == kind)?.shape == 'pill';

    const at = (key: string) => {
        void frame;
        const node = byKey.get(key)!;
        return { x: node.x ?? 0, y: node.y ?? 0, width: node.width, height: node.height };
    };
    // A solid edge is straight. A dashed one bows gently to one side, so that
    // it stays distinguishable where it runs alongside a chain of solid ones.
    function path(link: GraphLink) {
        const a = at(link.from);
        const b = at(link.to);
        const start = boxExit(a.x, a.y, a.width, a.height, b.x, b.y);
        const end = boxExit(b.x, b.y, b.width, b.height, a.x, a.y, link.style == 'solid' ? 5 : 3);
        if (link.style == 'solid') return `M${start.x} ${start.y}L${end.x} ${end.y}`;
        const bend = 0.18;
        const cx = (start.x + end.x) / 2 - (end.y - start.y) * bend;
        const cy = (start.y + end.y) / 2 + (end.x - start.x) * bend;
        return `M${start.x} ${start.y}Q${cx} ${cy} ${end.x} ${end.y}`;
    }
</script>

<div
    class="graph"
    style:aspect-ratio="{box.width} / {box.height}"
    class:live
    class:has-selection={selected}
    bind:this={container}
    role="group"
    aria-label="Graph of the library"
>
    {#if nodes.length == 0}
        <p class="empty">{legend.empty}</p>
    {:else}
        <svg
            bind:this={svg}
            {viewBox}
            preserveAspectRatio="xMidYMid meet"
            class:panning={pan}
            onpointerdown={onBackgroundPointerDown}
            onpointermove={onBackgroundPointerMove}
            onpointerup={onBackgroundPointerUp}
            onpointercancel={onBackgroundPointerUp}
            {onwheel}
            {onkeydown}
            role="presentation"
        >
            <defs>
                <marker
                    id="graph-arrow"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M0 0.8 9 5 0 9.2Z" class="arrow" />
                </marker>
                <marker
                    id="graph-arrow-lit"
                    viewBox="0 0 10 10"
                    refX="8.5"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                >
                    <path d="M0 0.8 9 5 0 9.2Z" class="arrow lit" />
                </marker>
                <pattern id="graph-grid" width="24" height="24" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="1" class="grid-dot" />
                </pattern>
            </defs>
            <rect
                x={box.x - 4000}
                y={box.y - 4000}
                width={box.width + 8000}
                height={box.height + 8000}
                fill="url(#graph-grid)"
            />
            <g transform="translate({view.x} {view.y}) scale({view.k})">
                <g class="edges">
                    {#each edges as link (link.from + '→' + link.to)}
                        {@const on = lit?.has(link.from) && lit?.has(link.to)}
                        <path
                            d={path(link)}
                            class="edge {link.style}"
                            class:lit={on}
                            class:dim={lit && !on}
                            marker-end={link.style == 'solid'
                                ? on
                                    ? 'url(#graph-arrow-lit)'
                                    : 'url(#graph-arrow)'
                                : undefined}
                        />
                    {/each}
                </g>
                <g class="nodes">
                    {#each nodes as node (node.key)}
                        {@const p = at(node.key)}
                        <a
                            href={node.url}
                            class="node kind-{node.kind}"
                            class:selected={selected == node.key}
                            class:dim={lit && !lit.has(node.key)}
                            onclick={(event) => onNodeClick(event, node.key)}
                            onpointerdown={(event) => onNodePointerDown(event, node.key)}
                            onpointermove={onNodePointerMove}
                            onpointerup={onNodePointerUp}
                            onpointerenter={() => (hovered = node.key)}
                            onpointerleave={() => (hovered = null)}
                            onfocus={() => (hovered = node.key)}
                            onblur={() => (hovered = null)}
                            aria-label="{kindLabel(node.kind)}: {node.title}"
                        >
                            <g transform="translate({p.x} {p.y})">
                                <title>{node.title}</title>
                                <rect
                                    x={-p.width / 2}
                                    y={-p.height / 2}
                                    width={p.width}
                                    height={p.height}
                                    rx={pill(node.kind) ? p.height / 2 : 5}
                                />
                                {#if node.sequenced && legend.sequenced}
                                    <circle
                                        class="tick"
                                        cx={-p.width / 2 + 2}
                                        cy={-p.height / 2 + 2}
                                        r="3.5"
                                    />
                                {/if}
                                <text data-key={node.key} text-anchor="middle" dy="0.35em"
                                    >{label(node.title)}</text
                                >
                            </g>
                        </a>
                    {/each}
                </g>
            </g>
        </svg>

        <div class="legend" aria-hidden="true">
            {#each legend.kinds as { kind, label } (kind)}
                <span><i class="swatch kind-{kind}" class:pill={pill(kind)}></i>{label}</span>
            {/each}
            <span><i class="line solid"></i>{legend.solid}</span>
            <span><i class="line dashed"></i>{legend.dashed}</span>
            {#if legend.sequenced}
                <span><i class="mark"></i>{legend.sequenced}</span>
            {/if}
        </div>

        <div class="controls needs-js">
            <button type="button" onclick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in"
                ><Icon name="plus" size={18} /></button
            >
            <button type="button" onclick={() => zoomBy(0.8)} aria-label="Zoom out" title="Zoom out"
                ><Icon name="minus" size={18} /></button
            >
            <button
                type="button"
                onclick={reset}
                aria-label="Fit the whole graph"
                title="Fit the whole graph"><Icon name="reset" size={18} /></button
            >
        </div>
        <p class="hint needs-js">
            Click a node for a preview · drag to rearrange · Ctrl/⌘ + scroll to zoom
        </p>

        {#if live}
            <GraphPanel
                entry={selected ? entries[selected] : undefined}
                Description={selected ? descriptions[selected] : undefined}
                links={edges}
                {entries}
                onselect={select}
                headings={legend}
            />
        {/if}
    {/if}
</div>

<style>
    /* As tall as the map's own proportions ask, within limits: a wide,
     * shallow map gets a shorter box rather than empty space. */
    .graph {
        position: relative;
        /* Set, so that only the height follows the proportions: with an
         * automatic width, the minimum height would widen the box instead. */
        width: 100%;
        min-height: 26rem;
        max-height: clamp(26rem, 72vh, 46rem);
        border: 1px solid var(--rule);
        border-radius: var(--radius-large);
        background: var(--graph-background);
        overflow: hidden;
        font-family: var(--font-ui);
    }

    svg {
        display: block;
        width: 100%;
        height: 100%;
        touch-action: pan-y;
        user-select: none;
        -webkit-user-select: none;
    }

    .live svg {
        cursor: grab;
    }

    svg.panning {
        cursor: grabbing;
    }

    .grid-dot {
        fill: var(--graph-grid);
    }

    .edge {
        fill: none;
        stroke: var(--graph-edge);
        stroke-width: 1.4;
        transition: opacity 150ms;
    }

    .edge.dashed {
        stroke-dasharray: 5 5;
        stroke-width: 1.2;
    }

    .edge.lit {
        stroke: var(--graph-edge-strong);
        stroke-width: 1.8;
    }

    .edge.dim {
        opacity: 0.18;
    }

    .arrow {
        fill: var(--graph-edge);
    }

    .arrow.lit {
        fill: var(--graph-edge-strong);
    }

    .node {
        cursor: pointer;
        outline: none;
        transition: opacity 150ms;
        touch-action: none;
    }

    .node rect {
        fill: var(--graph-node);
        stroke: var(--kind);
        stroke-width: 1.3;
        transition:
            fill 120ms,
            stroke-width 120ms;
    }

    .node text {
        fill: var(--graph-label);
        font: 500 12.5px / 1 var(--font-ui);
        pointer-events: none;
    }

    .node:hover rect,
    .node:focus-visible rect {
        fill: var(--kind-soft);
        stroke-width: 2;
    }

    .node.selected rect {
        fill: var(--kind);
        stroke-width: 2;
    }

    .node.selected text {
        fill: var(--paper-raised);
    }

    .node.dim {
        opacity: 0.25;
    }

    .tick {
        fill: var(--sequence);
        stroke: var(--graph-background);
        stroke-width: 1.5;
    }

    .legend {
        position: absolute;
        left: 0.9rem;
        top: 0.75rem;
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 0.9rem;
        max-width: calc(100% - 1.8rem);
        font: 500 0.72rem / 1.3 var(--font-ui);
        color: var(--muted);
        pointer-events: none;
    }

    .legend span {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
    }

    .swatch {
        width: 0.7rem;
        height: 0.7rem;
        border-radius: 2px;
        border: 1.5px solid var(--kind);
    }

    .swatch.pill {
        border-radius: 50%;
    }

    .mark {
        width: 0.5rem;
        height: 0.5rem;
        border: none;
        background: var(--sequence);
    }

    .line {
        width: 1.3rem;
        border-top: 1.5px solid var(--graph-edge-strong);
    }

    .line.dashed {
        border-top-style: dashed;
    }

    .controls {
        position: absolute;
        right: 0.75rem;
        bottom: 0.75rem;
        display: flex;
        flex-direction: column;
        border: 1px solid var(--rule);
        border-radius: 10px;
        background: var(--paper-raised);
        box-shadow: var(--shadow);
        overflow: hidden;
        transition: right 220ms ease;
    }

    .controls button {
        display: grid;
        place-items: center;
        width: 2.1rem;
        height: 2.1rem;
        border: none;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
    }

    .controls button + button {
        border-top: 1px solid var(--rule);
    }

    .controls button:hover {
        color: var(--ink);
        background: var(--accent-soft);
    }

    .hint {
        position: absolute;
        left: 0.9rem;
        bottom: 0.6rem;
        margin: 0;
        font: 0.72rem / 1.3 var(--font-ui);
        color: var(--faint);
        pointer-events: none;
    }

    .empty {
        display: grid;
        place-items: center;
        height: 100%;
        margin: 0;
        color: var(--muted);
        font: var(--font-size-ui) var(--font-ui);
    }

    @media (min-width: 760px) {
        .has-selection .controls {
            right: calc(min(23rem, 45%) + 0.75rem);
        }
    }

    @media (max-width: 560px) {
        .hint {
            display: none;
        }
    }
</style>
