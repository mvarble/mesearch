<script lang="ts">
    import type { Snippet } from 'svelte';

    // A proof, ending in ∎.
    let { children, title = 'Proof' }: { children: Snippet; title?: string } = $props();
</script>

<div class="proof">
    <span class="proof-heading">{title}.</span>
    {@render children()}
    <span class="qed" aria-label="End of proof">∎</span>
</div>
