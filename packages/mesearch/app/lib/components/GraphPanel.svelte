<script lang="ts">
    import type { Component } from 'svelte';
    import { formatDate, href, isoDate, kindLabel } from '$lib/format';
    import type { GraphLink, IndexEntry } from '$lib/types';
    import Icon from './Icon.svelte';

    // A selected node's preview. Beside a wide graph it is a drawer that slides
    // out of the graph's right edge, leaving the graph usable; under a narrow
    // one it is a sheet that rises from the bottom of the screen, which a thumb
    // can reach and dismiss with a downward swipe. Either way the reader stays
    // on the map, can hop to neighbouring nodes, and opens the document only
    // when they choose to.
    let {
        entry,
        Description,
        links,
        entries,
        onselect,
    }: {
        entry: IndexEntry | undefined;
        Description: Component | undefined;
        links: GraphLink[];
        entries: Record<string, IndexEntry>;
        onselect: (key: string | null) => void;
    } = $props();

    let panel: HTMLElement | undefined = $state();
    let dragFrom: number | null = null;
    let dragBy = $state(0);

    const neighbours = (pick: (link: GraphLink) => string | undefined) =>
        links
            .map(pick)
            .filter((key): key is string => !!key && !!entries[key])
            .map((key) => entries[key]!);

    let buildsOn = $derived(
        entry
            ? neighbours((l) => (l.style == 'solid' && l.to == entry!.key ? l.from : undefined))
            : [],
    );
    let leadsTo = $derived(
        entry
            ? neighbours((l) => (l.style == 'solid' && l.from == entry!.key ? l.to : undefined))
            : [],
    );
    let related = $derived(
        entry
            ? neighbours((l) =>
                  l.style == 'dashed'
                      ? l.from == entry!.key
                          ? l.to
                          : l.to == entry!.key
                            ? l.from
                            : undefined
                      : undefined,
              )
            : [],
    );

    $effect(() => {
        if (entry) panel?.focus({ preventScroll: true });
    });

    function onkeydown(event: KeyboardEvent) {
        if (event.key == 'Escape') {
            onselect(null);
            event.stopPropagation();
        }
    }

    // Swiping the sheet's handle down far enough dismisses it.
    function onhandledown(event: PointerEvent) {
        dragFrom = event.clientY;
        (event.currentTarget as Element).setPointerCapture(event.pointerId);
    }
    function onhandlemove(event: PointerEvent) {
        if (dragFrom !== null) dragBy = Math.max(0, event.clientY - dragFrom);
    }
    function onhandleup() {
        if (dragBy > 90) onselect(null);
        dragFrom = null;
        dragBy = 0;
    }
</script>

{#if entry}
    <button
        class="backdrop"
        type="button"
        aria-label="Close the preview"
        onclick={() => onselect(null)}
    ></button>
{/if}

<aside
    bind:this={panel}
    class="panel kind-{entry?.kind ?? 'concept'}"
    class:open={entry}
    style:--drag="{dragBy}px"
    aria-label={entry ? `${kindLabel(entry.kind)}: ${entry.title}` : undefined}
    aria-hidden={!entry}
    tabindex="-1"
    {onkeydown}
    inert={!entry}
>
    {#if entry}
        <div
            class="handle"
            onpointerdown={onhandledown}
            onpointermove={onhandlemove}
            onpointerup={onhandleup}
            onpointercancel={onhandleup}
            aria-hidden="true"
        ></div>
        <header>
            <p class="eyebrow kind">{kindLabel(entry.kind)}</p>
            <button class="close" type="button" onclick={() => onselect(null)} aria-label="Close">
                <Icon name="close" size={18} />
            </button>
        </header>
        <h3 class="title">{@html entry.titleHtml}</h3>
        <p class="meta">
            Updated <time datetime={isoDate(entry.updated)}>{formatDate(entry.updated)}</time>
            · {entry.readingMinutes} min read
        </p>
        <div class="body prose">
            {#if Description}
                <Description />
            {:else if entry.summaryHtml}
                <p>{@html entry.summaryHtml}</p>
            {/if}
        </div>

        {#each [['Builds on', buildsOn], ['Leads to', leadsTo], ['Related', related]] as const as [heading, list] (heading)}
            {#if list.length}
                <section>
                    <h4 class="eyebrow">{heading}</h4>
                    <ul class="chips">
                        {#each list as other (other.key)}
                            <li>
                                <button
                                    type="button"
                                    class="chip kind-{other.kind}"
                                    onclick={() => onselect(other.key)}
                                >
                                    {other.title}
                                </button>
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
        {/each}

        <a class="read" href={href(entry.key)}>
            Read the {entry.kind}
            <Icon name="arrow-right" size={18} />
        </a>
    {/if}
</aside>

<style>
    .panel {
        position: absolute;
        z-index: 5;
        top: 0;
        right: 0;
        bottom: 0;
        width: min(23rem, 45%);
        display: flex;
        flex-direction: column;
        gap: 0.9rem;
        padding: 1.1rem 1.25rem 1.25rem;
        background: var(--paper-raised);
        border-left: 1px solid var(--rule);
        box-shadow: var(--shadow);
        overflow-y: auto;
        outline: none;
        transform: translateX(105%);
        transition: transform 260ms cubic-bezier(0.2, 0.8, 0.2, 1);
        font-family: var(--font-ui);
    }

    .panel.open {
        transform: none;
    }

    .backdrop,
    .handle {
        display: none;
    }

    header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-top: 3px solid var(--kind);
        margin: -1.1rem -1.25rem 0;
        padding: 0.8rem 1.25rem 0;
    }

    .kind {
        color: var(--kind);
        margin: 0;
    }

    .close {
        display: grid;
        place-items: center;
        width: 2rem;
        height: 2rem;
        border: none;
        border-radius: 8px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
    }

    .close:hover {
        background: var(--accent-soft);
        color: var(--ink);
    }

    .title {
        margin: 0;
        font: 600 1.45rem / 1.2 var(--font-serif);
        color: var(--ink);
        text-wrap: balance;
    }

    .meta {
        margin: -0.4rem 0 0;
        font-size: 0.8rem;
        color: var(--muted);
    }

    .body {
        font: 400 0.98rem / 1.65 var(--font-serif);
        color: var(--ink-soft);
    }

    .body :global(p:last-child) {
        margin-bottom: 0;
    }

    section h4 {
        margin: 0 0 0.45rem;
    }

    .chip {
        font-size: 0.8rem;
    }

    .read {
        margin-top: auto;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.7rem 1rem;
        border-radius: 10px;
        background: var(--kind);
        color: var(--paper-raised);
        font: 600 0.9rem / 1 var(--font-ui);
        text-decoration: none;
        transition: filter 120ms;
    }

    .read:hover {
        filter: brightness(1.08);
    }

    /* A narrow screen: a sheet over the bottom of it. */
    @media (max-width: 759px) {
        .panel {
            position: fixed;
            z-index: 60;
            top: auto;
            left: 0;
            right: 0;
            bottom: 0;
            width: auto;
            max-height: 75vh;
            border-left: none;
            border-top: 1px solid var(--rule);
            border-radius: 18px 18px 0 0;
            box-shadow: var(--shadow-strong);
            padding-bottom: max(1.25rem, env(safe-area-inset-bottom));
            transform: translateY(105%);
        }

        .panel.open {
            transform: translateY(var(--drag));
            transition: transform 200ms ease;
        }

        header {
            border-top: none;
        }

        .handle {
            display: block;
            align-self: center;
            width: 2.75rem;
            height: 5px;
            margin: -0.35rem 0 -0.4rem;
            padding: 0;
            border-radius: 3px;
            background: var(--rule-strong);
            cursor: grab;
            touch-action: none;
            flex: none;
        }

        .backdrop {
            display: block;
            position: fixed;
            z-index: 55;
            inset: 0;
            border: none;
            background: rgba(20, 16, 10, 0.3);
            cursor: default;
        }
    }
</style>
