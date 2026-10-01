<script lang="ts">
    import type { Snippet } from 'svelte';

    // A proof: "Proof." running into its first line, and a square at its end.
    let { title = 'Proof', children }: { title?: string; children: Snippet } = $props();
</script>

<div class="proof">
    <span class="heading">{title}.</span>{@render children()}
</div>

<style>
    .proof {
        margin: 1.25em 0 1.75em;
    }

    .heading {
        margin-right: 0.3em;
        font-style: italic;
        color: var(--ink);
    }

    /* The first paragraph runs on from "Proof." */
    .heading + :global(p) {
        display: inline;
    }

    .proof > :global(:last-child) {
        margin-bottom: 0;
    }

    .proof::after {
        content: '∎';
        display: block;
        margin-top: -1.72em;
        text-align: right;
        color: var(--muted);
    }
</style>
