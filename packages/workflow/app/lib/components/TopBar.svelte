<script lang="ts">
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { Logo, SITE } from '$site';
    import type { NavSection } from '../nav';
    import Icon from './Icon.svelte';
    import ThemeToggle from './ThemeToggle.svelte';

    let {
        menuOpen = $bindable(false),
        showMenu = true,
    }: { menuOpen?: boolean; showMenu?: boolean } = $props();

    // Every section but "Start here", which the home page leads to.
    const sections = $derived((page.data.nav as NavSection[]).filter((s) => s.id != 'start'));
    const current = $derived(page.url.pathname);
</script>

<header class="topbar">
    {#if showMenu}
        <button
            class="icon-button menu-button"
            type="button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            aria-controls="sidebar"
            onclick={() => (menuOpen = !menuOpen)}
        >
            <Icon name={menuOpen ? 'close' : 'menu'} />
        </button>
    {/if}

    <a class="wordmark" href={resolve('/')}>
        <Logo variant="icon" />
        <span>{SITE.name}</span>
        <span class="version">v{SITE.version}</span>
    </a>

    <nav class="track-nav" aria-label="Sections">
        {#each sections as section (section.id)}
            <a
                href={section.href}
                aria-current={current.startsWith(section.href) ? 'page' : undefined}
                >{section.short}</a
            >
        {/each}
    </nav>

    <div class="topbar-actions">
        <a class="icon-button" href={SITE.repo} rel="external" aria-label="Source on GitHub">
            <Icon name="github" />
        </a>
        <ThemeToggle />
    </div>
</header>
