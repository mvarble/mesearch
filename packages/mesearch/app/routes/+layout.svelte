<script lang="ts">
    import '@mvarble/mesearch-ui/fonts';
    import 'katex/dist/katex.min.css';
    import '@mvarble/mesearch-markdown/styles/katex.css';
    import '@mvarble/mesearch-ui/styles/index.css';
    // The project's own stylesheet, last, so that it can override anything.
    import '$site/user-styles';

    import { goto, invalidateAll } from '$app/navigation';
    import { Shell, configure } from '@mvarble/mesearch-ui';
    import site from '$site';
    import { href } from '$lib/format';

    let { children } = $props();

    configure({ lang: site.lang });

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

<Shell
    title={site.title}
    home={href('')}
    links={[
        { url: `${href('')}#atlas`, label: 'Graph', icon: 'graph' },
        { url: `${href('')}#index`, label: 'Index', icon: 'list' },
    ]}
    search={`${site.base}/search.json`}
    navigate={goto}
>
    {@render children()}
</Shell>
