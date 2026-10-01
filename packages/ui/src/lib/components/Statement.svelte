<script lang="ts">
    import type { Component } from 'svelte';
    import type { StatementInfo } from '../types.js';

    // A theorem, a definition, a remark: a document of its own, spread in as
    // `<Statement {...theorem} />`. Its heading runs into its first line, and
    // claims --- theorems, lemmas and their kin --- are set in italics, as in
    // a textbook; definitions, remarks and examples stay upright.
    let {
        default: Body,
        cms,
        noLabel = false,
        noBlock = false,
    }: {
        default: Component;
        cms: StatementInfo;
        // Leave out the "Theorem 2." heading.
        noLabel?: boolean;
        // Render it without its frame, as part of the surrounding text.
        noBlock?: boolean;
    } = $props();

    const UPRIGHT = /^(definition|remark|example|notation|note|exercise|assumption|problem)s?$/i;

    let upright = $derived(UPRIGHT.test(cms.kind.trim()));
    let name = $derived(
        cms.kind
            .split(' ')
            .map((word) => word.slice(0, 1).toUpperCase() + word.slice(1))
            .join(' '),
    );
</script>

<div class="statement" class:upright class:bare={noBlock} id={cms.id ?? cms.slug}>
    {#if !noLabel}
        <span class="heading"
            >{name}&nbsp;{cms.label}{#if cms.title}<span class="title">({cms.title})</span
                >{/if}.</span
        >
    {/if}<Body />
</div>

<style>
    .statement {
        margin: 1.75em 0;
        padding: 0.1em 0 0.1em 1.1em;
        border-left: 2px solid color-mix(in srgb, var(--accent) 45%, transparent);
        font-style: italic;
        scroll-margin-top: 2rem;
    }

    /* Equation numbers stay upright, as they are everywhere else. */
    .statement :global(.math-tag) {
        font-style: normal;
    }

    .statement.upright {
        border-left-color: var(--rule-strong);
        font-style: normal;
    }

    .statement.bare {
        margin: 0;
        padding: 0;
        border: none;
    }

    /* A block of its own within the line, so justification leaves its
     * spaces alone. */
    .heading {
        display: inline-block;
        margin-right: 0.3em;
        font-style: normal;
        font-weight: 650;
        color: var(--ink);
    }

    .title {
        margin-left: 0.3em;
        font-weight: 400;
    }

    /* A first paragraph runs on from the heading, as in a textbook. */
    .heading + :global(p) {
        display: inline;
    }

    .statement > :global(:first-child:not(.heading)) {
        margin-top: 0;
    }

    .statement > :global(:last-child) {
        margin-bottom: 0;
    }

    .statement:target {
        animation: arrive 2.4s ease-out;
    }

    @keyframes arrive {
        from {
            background: var(--accent-soft);
        }
    }
</style>
