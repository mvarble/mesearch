<script lang="ts">
    import type { Reference } from '../types.js';

    // What a page cites, at its end: small, in label order, each entry the
    // target of the citations to it. Following one highlights it; the
    // browser's back button returns to the text.
    let { entries, heading = 'References' }: { entries: Reference[]; heading?: string } = $props();
</script>

{#if entries.length}
    <section class="references" aria-label={heading}>
        <p class="eyebrow">{heading}</p>
        <ol>
            {#each entries as entry (entry.id)}
                <li id={entry.id}>
                    <span class="label">[{entry.label}]</span>
                    <span class="entry">{@html entry.html}</span>
                </li>
            {/each}
        </ol>
    </section>
{/if}

<style>
    .references {
        margin-top: 3rem;
        padding-top: 1.1rem;
        border-top: 1px solid var(--rule);
    }

    .eyebrow {
        margin: 0 0 0.8rem;
        color: var(--muted);
    }

    ol {
        display: grid;
        grid-template-columns: max-content 1fr;
        gap: 0.45rem 0.9rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    li {
        display: grid;
        grid-column: 1 / -1;
        grid-template-columns: subgrid;
        scroll-margin-top: 30vh;
        border-radius: var(--radius);
    }

    .label {
        padding-top: 0.12em;
        font: 500 0.75rem / 1.5 var(--font-ui);
        font-variant-numeric: tabular-nums;
        color: var(--muted);
    }

    .entry {
        font: 400 0.86rem / 1.55 var(--font-body);
        color: var(--ink-soft);
        text-wrap: pretty;
    }

    .entry :global(a) {
        color: var(--muted);
        text-decoration-color: var(--rule-strong);
        text-underline-offset: 0.15em;
        overflow-wrap: anywhere;
    }

    .entry :global(a:hover) {
        color: var(--accent);
    }

    li:target {
        animation: arrive 2.4s ease-out;
    }

    li:target .entry {
        color: var(--ink);
    }

    li:target .label {
        color: var(--accent);
    }

    @keyframes arrive {
        from {
            background: var(--accent-soft);
        }
    }
</style>
