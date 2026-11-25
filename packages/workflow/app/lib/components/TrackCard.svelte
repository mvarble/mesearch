<script lang="ts">
    import { page } from '$app/state';
    import type { NavSection } from '../nav';

    let { id, eyebrow, blurb }: { id: string; eyebrow?: string; blurb: string } = $props();
    const section = $derived((page.data.nav as NavSection[]).find((s) => s.id == id)!);
    const first = $derived(section.items[0]);
</script>

<a class="card track-card" href={first && id != 'archive' ? first.href : section.href}>
    {#if eyebrow}<span class="eyebrow">{eyebrow}</span>{/if}
    <span class="card-title">{section.title}</span>
    <span class="card-body">{blurb}</span>
    {#if first && id != 'archive'}
        <span class="card-cta">Begin with “{first.title}” →</span>
    {:else if !first}
        <span class="card-cta muted">Nothing here yet.</span>
    {/if}
</a>
