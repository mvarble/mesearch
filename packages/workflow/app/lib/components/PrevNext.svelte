<script lang="ts">
    import type { DocumentLink } from '../documents';
    import { renderMixed } from '../tex';
    import Icon from './Icon.svelte';

    let { prev, next }: { prev?: DocumentLink; next?: DocumentLink } = $props();
</script>

{#if prev || next}
    <nav class="prev-next" aria-label="Previous and next pages">
        {#if prev}
            <a class="prev" href={prev.href}>
                <span class="label"><Icon name="arrowLeft" size={14} /> Previous</span>
                <span class="title">{@html renderMixed(prev.title)}</span>
            </a>
        {/if}
        {#if next}
            <a class="next" href={next.href}>
                <span class="label">Next <Icon name="arrowRight" size={14} /></span>
                <span class="title">{@html renderMixed(next.title)}</span>
            </a>
        {/if}
    </nav>
{/if}
