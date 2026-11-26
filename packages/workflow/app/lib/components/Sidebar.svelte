<script lang="ts">
    import { page } from '$app/state';
    import type { NavItem, NavSection } from '../nav';

    let { open = $bindable(false) }: { open?: boolean } = $props();

    const sections = $derived(page.data.nav as NavSection[]);
    // Links are written without a trailing slash and pages are served with one, so the two are
    // compared without it.
    const bare = (path: string) => path.replace(/\/+$/, '');
    const here = $derived(bare(page.url.pathname));
    const under = (href: string) => here === bare(href) || here.startsWith(bare(href) + '/');

    // A section folded away lists its items only while the reader is in it.
    const shown = (section: NavSection) => !section.folded || under(section.href);
    // An item with children unfolds while the reader is on one of them, or under its `within`.
    const unfolded = (item: NavItem) =>
        !!item.children &&
        (item.children.some((child) => here === bare(child.href)) ||
            (item.within !== undefined && under(item.within)));
</script>

{#snippet link(item: NavItem, current: boolean)}
    <a href={item.href} aria-current={current ? 'page' : undefined} onclick={() => (open = false)}
        >{#if item.code}<code>{item.title}</code
            >{:else}{item.title}{/if}{#if item.status && item.status != 'done'}
            <span class="status-dot status-{item.status}" title={item.status}></span>{/if}</a
    >
{/snippet}

<nav id="sidebar" class="sidebar" class:open aria-label="Documentation">
    {#each sections as section (section.id)}
        <details open={section.items.length > 0 && shown(section)}>
            <summary>
                <a href={section.href}>{section.title}</a>
            </summary>
            {#if section.items.length && shown(section)}
                <ol>
                    {#each section.items as item (item.key)}
                        {@const unfold = unfolded(item)}
                        <li
                            class:nav-sub={item.sub}
                            class:nav-group={item.children}
                            class:unfolded={unfold}
                        >
                            <!-- A group's own link is the current page only when it is a document
                                 of its own (an entry), not when it stands for its first child. -->
                            {@render link(
                                item,
                                here === bare(item.href) &&
                                    !item.children?.some((child) => bare(child.href) === here),
                            )}
                            {#if unfold && item.children}
                                <ol>
                                    {#each item.children as child (child.key)}
                                        <li class="nav-child">
                                            {@render link(child, here === bare(child.href))}
                                        </li>
                                    {/each}
                                </ol>
                            {/if}
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
