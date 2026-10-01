<script lang="ts">
    import type { TrackItem } from '../types.js';

    // A sequence drawn as a line of stations: the ones behind the reader are
    // filled in, the current one is marked, the ones ahead are open circles.
    // A station's sections hang beneath it as smaller stops.
    let {
        title,
        url,
        items,
        current,
        eyebrow,
    }: {
        // The sequence itself, as HTML, and where its own page is.
        title: string;
        url: string;
        items: TrackItem[];
        // The key of the stop the reader is on, if any.
        current?: string;
        // Above the sequence's name; `Sequence · 2 of 3` by default.
        eyebrow?: string;
    } = $props();

    const flatten = (stops: TrackItem[]): TrackItem[] =>
        stops.flatMap((stop) => [stop, ...flatten(stop.children ?? [])]);
    let order = $derived(flatten(items).map((stop) => stop.key));
    let position = $derived(current ? order.indexOf(current) : -1);
    const state = (stop: TrackItem) => {
        const at = order.indexOf(stop.key);
        return { done: position >= 0 && at < position, here: at == position };
    };
    let top = $derived(items.findIndex((stop) => flatten([stop]).some((s) => s.key == current)));
</script>

{#snippet stops(list: TrackItem[], nested: boolean)}
    <ol class:nested>
        {#each list as stop, i (stop.key)}
            {@const { done, here } = state(stop)}
            <li class:done class:current={here}>
                <span class="station" aria-hidden="true">{stop.label ?? i + 1}</span>
                {#if here}
                    <span class="title" aria-current="page">{@html stop.titleHtml}</span>
                {:else}
                    <a class="title" href={stop.url}>{@html stop.titleHtml}</a>
                {/if}
                {#if stop.children?.length}{@render stops(stop.children, true)}{/if}
            </li>
        {/each}
    </ol>
{/snippet}

<nav class="track kind-sequence" aria-label="Sequence">
    <p class="eyebrow">
        {eyebrow ?? (top >= 0 ? `Sequence · ${top + 1} of ${items.length}` : 'Sequence')}
    </p>
    <a class="name" href={url} aria-current={position < 0 && current ? 'page' : undefined}
        >{@html title}</a
    >
    {@render stops(items, false)}
</nav>

<style>
    .track {
        font-family: var(--font-ui);
    }

    .eyebrow {
        margin: 0 0 0.35rem;
        color: var(--kind);
    }

    .name {
        display: block;
        margin-bottom: 1rem;
        font: 600 1rem / 1.3 var(--font-serif);
        color: var(--ink);
        text-decoration: none;
    }

    .name:hover {
        color: var(--kind);
    }

    ol {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    ol.nested {
        grid-column: 2;
        margin-top: 0.6rem;
    }

    ol.nested li {
        grid-template-columns: 1.1rem 1fr;
        padding-bottom: 0.5rem;
    }

    ol.nested .station {
        width: 1.1rem;
        height: 1.1rem;
        border-width: 1.5px;
        font-size: 0;
    }

    ol.nested li:not(:last-child)::before {
        left: calc(0.55rem - 1px);
        top: 1.1rem;
    }

    ol.nested .title {
        padding-top: 0;
        font-size: 0.8rem;
    }

    li {
        position: relative;
        display: grid;
        grid-template-columns: 1.6rem 1fr;
        gap: 0.6rem;
        padding-bottom: 0.9rem;
    }

    /* The line joining one station to the next. */
    li:not(:last-child)::before {
        content: '';
        position: absolute;
        left: calc(0.8rem - 1px);
        top: 1.6rem;
        bottom: 0;
        width: 2px;
        background: var(--rule-strong);
    }

    li.done::before {
        background: var(--kind);
    }

    .station {
        display: grid;
        place-items: center;
        width: 1.6rem;
        height: 1.6rem;
        border: 2px solid var(--rule-strong);
        border-radius: 50%;
        background: var(--paper);
        font: 600 0.68rem / 1 var(--font-ui);
        color: var(--muted);
        font-variant-numeric: tabular-nums;
    }

    .done .station {
        border-color: var(--kind);
        background: var(--kind);
        color: var(--paper);
    }

    .current .station {
        border-color: var(--kind);
        color: var(--kind);
        box-shadow: 0 0 0 4px var(--kind-soft);
    }

    .title {
        font-size: 0.84rem;
        line-height: 1.4;
        padding-top: 0.2rem;
        color: var(--muted);
        text-decoration: none;
    }

    a.title:hover {
        color: var(--ink);
    }

    .current .title {
        color: var(--ink);
        font-weight: 600;
    }
</style>
