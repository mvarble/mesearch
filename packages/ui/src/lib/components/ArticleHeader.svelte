<script lang="ts">
    import type { Snippet } from 'svelte';
    import { formatDate, isoDate } from '../settings.js';
    import type { DocumentRef } from '../types.js';
    import Chips from './Chips.svelte';

    // A document's header: where it sits (`Site / Writeup · Sequence 2 of 3`),
    // its title, when it was written and revised, and what it builds on.
    let {
        crumbs = [],
        titleHtml,
        created,
        updated,
        readingMinutes,
        buildsOn = [],
        buildsOnLabel = 'Builds on',
        children,
    }: {
        // The trail above the title. A crumb with a URL is a link; `note` is
        // set beside it in a lighter colour.
        crumbs?: Array<{ label: string; url?: string; note?: string }>;
        titleHtml: string;
        created?: Date;
        updated?: Date;
        readingMinutes?: number;
        buildsOn?: DocumentRef[];
        buildsOnLabel?: string;
        // Anything else, under the dates: tags, say.
        children?: Snippet;
    } = $props();

    let revised = $derived(
        !!updated && (!created || isoDate(updated) != isoDate(created)) ? updated : undefined,
    );
</script>

<header>
    {#if crumbs.length}
        <p class="eyebrow trail">
            {#each crumbs as crumb, i (i)}
                {#if i > 0}<span class="separator" aria-hidden="true">{i == 1 ? '/' : '·'}</span
                    >{/if}
                {#if crumb.url}<a href={crumb.url}>{crumb.label}</a>{:else}<span class="here"
                        >{crumb.label}</span
                    >{/if}
                {#if crumb.note}<span class="note">{crumb.note}</span>{/if}
            {/each}
        </p>
    {/if}
    <h1>{@html titleHtml}</h1>
    {#if created || revised || readingMinutes}
        <p class="meta">
            {#if created}
                <span>Written <time datetime={isoDate(created)}>{formatDate(created)}</time></span>
            {/if}
            {#if revised}
                <span>Revised <time datetime={isoDate(revised)}>{formatDate(revised)}</time></span>
            {/if}
            {#if readingMinutes}<span>{readingMinutes} min read</span>{/if}
        </p>
    {/if}
    {@render children?.()}
    {#if buildsOn.length}
        <div class="builds-on">
            <span class="label">{buildsOnLabel}</span>
            <Chips refs={buildsOn} />
        </div>
    {/if}
</header>

<style>
    .trail {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5em;
        margin: 0 0 1.1rem;
    }

    .trail a {
        color: var(--muted);
        text-decoration: none;
    }

    .trail a:hover {
        color: var(--ink);
    }

    .here {
        color: var(--kind, var(--accent));
    }

    .separator,
    .note {
        color: var(--faint);
    }

    .note {
        letter-spacing: 0.06em;
    }

    h1 {
        margin: 0 0 1rem;
        font: 600 var(--font-size-title) / 1.08 var(--font-heading);
        letter-spacing: -0.02em;
        text-wrap: balance;
    }

    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1.25rem;
        margin: 0;
        font: 400 0.85rem / 1.5 var(--font-ui);
        color: var(--muted);
    }

    .builds-on {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem 0.75rem;
        margin-top: 1.4rem;
        padding-top: 1.1rem;
        border-top: 1px solid var(--rule);
    }

    .label {
        font: 600 var(--font-size-eyebrow) / 1 var(--font-ui);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
    }
</style>
