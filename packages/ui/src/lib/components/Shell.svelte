<script lang="ts">
    import { onMount, type Snippet } from 'svelte';
    import { reading } from '../reading.svelte.js';
    import { theme } from '../theme.svelte.js';
    import type { RailLink, SearchEntry } from '../types.js';
    import Palette from './Palette.svelte';
    import Rail from './Rail.svelte';

    // What every page sits in: the rail (a dock on phones), the search
    // palette, a skip link, and the theme kept applied. Wrap a root layout's
    // children in it.
    let {
        title,
        home,
        links = [],
        search,
        navigate,
        children,
    }: {
        title: string;
        home: string;
        links?: RailLink[];
        // Where the palette's entries come from; without it there is no search.
        search?: string | (() => Promise<SearchEntry[]>);
        navigate?: (url: string) => unknown;
        children: Snippet;
    } = $props();

    let searching = $state(false);

    onMount(() => theme.start());
</script>

<a class="skip" href="#main">Skip to content</a>
<Rail
    {title}
    {home}
    {links}
    onsearch={search ? () => (searching = true) : undefined}
    progress={reading.progress}
/>
{#if search}
    <Palette index={search} {navigate} bind:open={searching} />
{/if}

<div class="shell">
    {@render children()}
</div>

<style>
    .shell {
        min-height: 100vh;
        padding-bottom: 6rem;
    }

    @media (min-width: 960px) {
        .shell {
            margin-left: var(--rail-width);
            padding-bottom: 0;
        }
    }

    .skip {
        position: absolute;
        left: 1rem;
        top: -3rem;
        z-index: 50;
        padding: 0.5rem 0.9rem;
        background: var(--accent);
        color: var(--accent-ink);
        border-radius: var(--radius);
        font: 500 var(--font-size-ui) var(--font-ui);
    }

    .skip:focus {
        top: 1rem;
    }
</style>
