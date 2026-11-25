<script lang="ts">
    import { page } from '$app/state';
    import type { NavSection } from '../nav';

    let { open = $bindable(false) }: { open?: boolean } = $props();

    const sections = $derived(page.data.nav as NavSection[]);
    // Links are written without a trailing slash and pages are served with one, so the two are
    // compared without it.
    const bare = (path: string) => path.replace(/\/+$/, '');
    const here = $derived(bare(page.url.pathname));
</script>

<nav id="sidebar" class="sidebar" class:open aria-label="Documentation">
    {#each sections as section (section.id)}
        <details open={section.items.length > 0}>
            <summary>
                <a href={section.href}>{section.title}</a>
            </summary>
            {#if section.items.length}
                <ol>
                    {#each section.items as item (item.key)}
                        <li class:nav-sub={item.sub}>
                            <a
                                href={item.href}
                                aria-current={here === bare(item.href) ? 'page' : undefined}
                                onclick={() => (open = false)}
                                >{#if item.code}<code>{item.title}</code
                                    >{:else}{item.title}{/if}{#if item.status && item.status != 'done'}
                                    <span
                                        class="status-dot status-{item.status}"
                                        title={item.status}
                                    ></span>{/if}</a
                            >
                        </li>
                    {/each}
                </ol>
            {/if}
        </details>
    {/each}
</nav>

{#if open}
    <button
        class="sidebar-scrim"
        type="button"
        aria-label="Close navigation"
        onclick={() => (open = false)}
    ></button>
{/if}
