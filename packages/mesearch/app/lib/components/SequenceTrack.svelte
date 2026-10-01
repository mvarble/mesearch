<script lang="ts">
    import { href } from '$lib/format';
    import type { DocumentRef } from '$lib/types';

    // A sequence drawn as a line of stations: the ones behind the reader are
    // filled in, the current one is marked, the ones ahead are open circles.
    let {
        sequence,
        documents,
        index,
    }: { sequence: DocumentRef; documents: DocumentRef[]; index: number } = $props();
</script>

<nav class="track kind-sequence" aria-label="Sequence: {sequence.title}">
    <p class="eyebrow">Sequence · {index + 1} of {documents.length}</p>
    <a class="name" href={href(sequence.key)}>{@html sequence.titleHtml}</a>
    <ol>
        {#each documents as doc, i (doc.key)}
            <li class:done={i < index} class:current={i == index}>
                <span class="station" aria-hidden="true">{i + 1}</span>
                {#if i == index}
                    <span class="title" aria-current="page">{@html doc.titleHtml}</span>
                {:else}
                    <a class="title" href={href(doc.key)}>{@html doc.titleHtml}</a>
                {/if}
            </li>
        {/each}
    </ol>
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
