<script lang="ts">
    import type { DocumentRef } from '../types.js';

    // The parts of a sequence on its own page: numbered, titled, summarised.
    type Part = DocumentRef & { summaryHtml?: string; label?: string };
    let { parts }: { parts: Part[] } = $props();
</script>

{#if parts.length}
    <ol class="parts">
        {#each parts as part, i (part.key)}
            <li class="kind-{part.kind}">
                <span class="number">{part.label ?? i + 1}</span>
                <div>
                    <a href={part.url}>{@html part.titleHtml}</a>
                    {#if part.summaryHtml}<p>{@html part.summaryHtml}</p>{/if}
                </div>
            </li>
        {/each}
    </ol>
{/if}

<style>
    .parts {
        list-style: none;
        margin: 2.5rem 0 0;
        padding: 0;
        border-top: 1px solid var(--rule);
    }

    li {
        display: grid;
        grid-template-columns: 2.5rem 1fr;
        gap: 0.75rem;
        padding: 1.1rem 0;
        border-bottom: 1px solid var(--rule);
    }

    .number {
        font: 600 1.6rem / 1.1 var(--font-serif);
        color: var(--kind);
        font-variant-numeric: oldstyle-nums;
    }

    a {
        font: 600 1.15rem / 1.3 var(--font-serif);
        color: var(--ink);
        text-decoration: none;
    }

    a:hover {
        color: var(--kind);
    }

    p {
        margin: 0.3rem 0 0;
        color: var(--ink-soft);
        font-size: 0.97rem;
        line-height: 1.6;
        text-align: left;
    }
</style>
