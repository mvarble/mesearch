<script lang="ts">
    import type { DocumentLink } from '../documents';
    import { STATUS_LABELS } from '$site';
    import { renderMixed } from '../tex';

    // The documents of a section, one row each.
    let {
        links,
        numbered = false,
        start = 1,
        empty,
    }: { links: DocumentLink[]; numbered?: boolean; start?: number; empty: string } = $props();
</script>

{#if links.length}
    <ol class="page-list" class:numbered {start}>
        {#each links as link, i (link.key)}
            <li>
                <a href={link.href}>
                    {#if numbered}<span class="index">{String(start + i).padStart(2, '0')}</span
                        >{/if}
                    <span class="title"
                        >{@html renderMixed(link.title)}{#if link.status}
                            <span class="chip status-{link.status}"
                                >{STATUS_LABELS[link.status]}</span
                            >{/if}</span
                    >
                    <span class="summary">{@html renderMixed(link.summary)}</span>
                </a>
            </li>
        {/each}
    </ol>
{:else}
    <p class="muted">{empty}</p>
{/if}
