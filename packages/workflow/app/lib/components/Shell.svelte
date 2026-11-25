<!--
    The frame every page is drawn in: the top bar, the navigation beside the content (but on the
    home page), and the footer. A site's `+layout.svelte` imports its stylesheet and renders its
    pages in this, giving what its `<head>` adds, such as a link preview's image, as `head`.
-->
<script lang="ts">
    import type { Snippet } from 'svelte';

    import { asset, resolve } from '$app/paths';
    import { page } from '$app/state';
    import { SITE } from '$site';
    import Sidebar from './Sidebar.svelte';
    import TopBar from './TopBar.svelte';

    let {
        origin = '',
        head,
        children,
    }: { origin?: string; head?: Snippet; children: Snippet } = $props();
    let menuOpen = $state(false);

    const landing = $derived(page.route.id === '/');
</script>

<svelte:head>
    <link rel="alternate" type="text/plain" title="llms.txt" href={resolve('/llms.txt')} />
    <link rel="icon" href={asset('/favicon.svg')} />
    <meta property="og:site_name" content={SITE.name} />
    <meta property="og:type" content="website" />
    {#if origin}<meta property="og:url" content={origin + page.url.pathname} />{/if}
    {@render head?.()}
</svelte:head>

<a class="skip-link" href="#content">Skip to content</a>
<TopBar bind:menuOpen showMenu={!landing} />

<div class="shell" class:landing>
    {#if !landing}
        <Sidebar bind:open={menuOpen} />
    {/if}
    <main id="content">
        {@render children()}
    </main>
</div>

<footer class="site-footer">
    <p>
        {SITE.name} is developed at
        <a href={SITE.repo} rel="external">{SITE.repo.replace('https://', '')}</a>.
    </p>
    <p>
        For language models: <a href={resolve('/llms.txt')}>llms.txt</a> (index) ·
        <a href={resolve('/llms-full.txt')}>llms-full.txt</a> (every page, as Markdown).
    </p>
</footer>
