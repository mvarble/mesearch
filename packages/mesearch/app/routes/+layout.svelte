<script lang="ts">
    import '@fontsource-variable/source-serif-4/opsz.css';
    import '@fontsource-variable/source-serif-4/opsz-italic.css';
    import '@fontsource-variable/inter/wght.css';
    import '@fontsource/fira-mono/400.css';
    import 'katex/dist/katex.min.css';
    import '@mvarble/mesearch-markdown/styles/katex.css';
    import '$lib/styles/tokens.css';
    import '$lib/styles/base.css';
    import '$lib/styles/prose.css';
    // The project's own stylesheet, last, so that it can override anything.
    import '$site/user-styles';

    import { onMount } from 'svelte';
    import { invalidateAll } from '$app/navigation';
    import site from '$site';
    import Palette from '$lib/components/Palette.svelte';
    import Rail from '$lib/components/Rail.svelte';
    import { reading } from '$lib/reading.svelte';
    import { theme } from '$lib/theme.svelte';

    let { children } = $props();
    let searching = $state(false);

    onMount(() => theme.start());

    // While the dev server runs, a change to the content refreshes the page's
    // data in place rather than reloading it.
    if (import.meta.hot) {
        import.meta.hot.on('mesearch-cms:update', () => void invalidateAll());
    }
</script>

<svelte:head>
    <meta name="generator" content="mesearch" />
    {#if site.author}<meta name="author" content={site.author} />{/if}
</svelte:head>

<a class="skip" href="#main">Skip to content</a>
<Rail onsearch={() => (searching = true)} progress={reading.progress} />
<Palette bind:open={searching} />

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
