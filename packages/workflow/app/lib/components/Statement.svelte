<!--
    What a document imports to show a statement --- a theorem, a definition --- written as a
    document of its own, beside it:

        import Statement from './Statement.svelte';
        import * as whitening from './statements/whitening.md';

        <Statement {...whitening} />

    The content database numbers it along with the document's equations, and `[%full](statement:x)`
    refers to it as "Lemma 2".
-->
<script lang="ts">
    import type { Component } from 'svelte';
    import type { StatementInjection } from '@mvarble/mesearch-cms/runtime';

    let {
        default: Body,
        cms,
        noLabel = false,
    }: { default: Component; cms: StatementInjection; noLabel?: boolean } = $props();

    // Claims are set in italics, as in a textbook; definitions and remarks stay upright.
    const UPRIGHT = /^(definition|remark|example|notation|note|exercise|assumption|problem)s?$/i;
    const upright = $derived(UPRIGHT.test(cms.kind.trim()));
    const name = $derived(
        cms.kind
            .split(' ')
            .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
            .join(' '),
    );
</script>

<div class="statement" class:upright id={cms.id ?? cms.slug}>
    {#if !noLabel}
        <span class="statement-heading"
            >{name}&nbsp;{cms.label}{#if cms.title}<span class="statement-title">({cms.title})</span
                >{/if}.</span
        >
    {/if}<Body />
</div>
