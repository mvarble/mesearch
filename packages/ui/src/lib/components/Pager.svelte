<script lang="ts">
    import Icon from './Icon.svelte';

    // The previous and next stops of a sequence, as two cards.
    type Stop = { url: string; titleHtml: string };
    let {
        previous,
        next,
        label = 'Sequence',
    }: { previous?: Stop; next?: Stop; label?: string } = $props();
</script>

{#if previous || next}
    <nav class="pager kind-sequence" aria-label={label}>
        {#if previous}
            <a class="previous" href={previous.url}>
                <span class="eyebrow"><Icon name="arrow-left" size={14} /> Previous</span>
                <span class="title">{@html previous.titleHtml}</span>
            </a>
        {/if}
        {#if next}
            <a class="next" href={next.url}>
                <span class="eyebrow">Next <Icon name="arrow-right" size={14} /></span>
                <span class="title">{@html next.titleHtml}</span>
            </a>
        {/if}
    </nav>
{/if}

<style>
    .pager {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        font-family: var(--font-ui);
    }

    a {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 1rem 1.1rem;
        border: 1px solid var(--rule);
        border-radius: var(--radius);
        background: var(--paper-raised);
        color: inherit;
        text-decoration: none;
        transition: border-color 120ms;
    }

    a:hover {
        border-color: var(--kind);
    }

    .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--kind);
    }

    .next {
        grid-column: 2;
        text-align: right;
        align-items: flex-end;
    }

    .title {
        font: 600 1rem / 1.3 var(--font-serif);
    }
</style>
