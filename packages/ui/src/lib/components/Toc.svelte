<script lang="ts">
    import { onMount } from 'svelte';
    import type { TocEntry } from '../types.js';

    // The document's headings, with the one being read marked. Without
    // JavaScript it is a plain list of anchors.
    let { entries, label = 'On this page' }: { entries: TocEntry[]; label?: string } = $props();

    let active = $state<string | null>(null);
    // How far down the list the marker sits, for the line beside it.
    let list: HTMLElement | undefined = $state();
    let marker = $state<{ top: number; height: number } | null>(null);

    const flatten = (items: TocEntry[]): TocEntry[] =>
        items.flatMap((item) => [item, ...flatten(item.children)]);

    onMount(() => {
        const slugs = flatten(entries).map((entry) => entry.slug);
        const headings = slugs
            .map((slug) => document.getElementById(slug))
            .filter((heading): heading is HTMLElement => !!heading);
        if (!headings.length) return;

        // The current section is the last heading to have passed a line a
        // little below the top of the screen; before the first, none is.
        let frame = 0;
        const update = () => {
            frame = 0;
            const line = Math.min(140, innerHeight * 0.25);
            let current: string | null = null;
            for (const heading of headings) {
                if (heading.getBoundingClientRect().top - line > 0) break;
                current = heading.id;
            }
            const atEnd = innerHeight + scrollY >= document.documentElement.scrollHeight - 4;
            active = atEnd ? headings.at(-1)!.id : current;
        };
        const schedule = () => (frame ||= requestAnimationFrame(update));
        update();
        addEventListener('scroll', schedule, { passive: true });
        addEventListener('resize', schedule);
        return () => {
            removeEventListener('scroll', schedule);
            removeEventListener('resize', schedule);
            cancelAnimationFrame(frame);
        };
    });

    $effect(() => {
        const link = active
            ? list?.querySelector<HTMLElement>(`a[href="#${CSS.escape(active)}"]`)
            : null;
        marker = link && list ? { top: link.offsetTop, height: link.offsetHeight } : null;
    });
</script>

{#snippet tree(items: TocEntry[])}
    <ul>
        {#each items as item (item.slug)}
            <li class="depth-{item.depth}">
                <a
                    href="#{item.slug}"
                    class:active={active == item.slug}
                    aria-current={active == item.slug ? 'location' : undefined}
                >
                    {@html item.titleHtml}
                </a>
                {#if item.children.length}{@render tree(item.children)}{/if}
            </li>
        {/each}
    </ul>
{/snippet}

<nav class="toc" aria-label={label}>
    <p class="eyebrow">{label}</p>
    <div class="list" bind:this={list}>
        {#if marker}
            <span
                class="marker"
                style:transform="translateY({marker.top}px)"
                style:height="{marker.height}px"
            ></span>
        {/if}
        {@render tree(entries)}
    </div>
</nav>

<style>
    .toc {
        font-family: var(--font-ui);
    }

    .eyebrow {
        margin: 0 0 0.8rem;
    }

    .list {
        position: relative;
        border-left: 1px solid var(--rule);
    }

    .marker {
        position: absolute;
        left: -1px;
        top: 0;
        width: 2px;
        background: var(--accent);
        transition:
            transform 180ms ease,
            height 180ms ease;
    }

    ul {
        list-style: none;
        margin: 0;
        padding: 0;
    }

    ul ul {
        padding-left: 0.8rem;
    }

    a {
        display: block;
        padding: 0.28rem 0 0.28rem 0.9rem;
        font-size: 0.82rem;
        line-height: 1.4;
        color: var(--muted);
        text-decoration: none;
        transition: color 120ms;
    }

    .depth-1 > a {
        color: var(--ink-soft);
        font-weight: 500;
    }

    a:hover {
        color: var(--ink);
    }

    a.active {
        color: var(--accent);
    }
</style>
