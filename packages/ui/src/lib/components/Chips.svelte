<script lang="ts">
    import type { DocumentRef } from '../types.js';

    // Documents mentioned in passing, as a row of small labelled links, under
    // an optional heading.
    let { refs, heading }: { refs: DocumentRef[]; heading?: string } = $props();
</script>

{#if refs.length}
    {#if heading}<h2 class="eyebrow">{heading}</h2>{/if}
    <ul class="chips">
        {#each refs as ref (ref.key)}
            <li><a class="chip kind-{ref.kind}" href={ref.url}>{ref.title}</a></li>
        {/each}
    </ul>
{/if}

<style>
    h2 {
        margin: 0 0 0.6rem;
    }
</style>
