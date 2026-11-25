<script lang="ts">
    import type { DocumentLink } from '../documents';
    import { STATUS_LABELS } from '$site';
    import { excerpt, renderMixed } from '../tex';

    // Links to documents: a list with summaries, a row of chips (`inline`), or a grid of cards. A
    // list given `excerpt` shows at most about that many characters of each summary.
    let {
        links,
        inline = false,
        cards = false,
        excerpt: limit,
    }: { links: DocumentLink[]; inline?: boolean; cards?: boolean; excerpt?: number } = $props();

    const summary = (text: string) => renderMixed(limit ? excerpt(text, limit) : text);
</script>

{#if inline}
    <span class="chips">
        {#each links as link (link.key)}
            <a class="chip" href={link.href}>{@html renderMixed(link.title)}</a>
        {/each}
    </span>
{:else if cards}
    <div class="card-grid">
        {#each links as link (link.key)}
            <a class="card" href={link.href}>
                <span class="card-title">{@html renderMixed(link.title)}</span>
                {#if link.summary}<span class="card-body">{@html renderMixed(link.summary)}</span
                    >{/if}
            </a>
        {/each}
    </div>
{:else}
    <ul class="link-list">
        {#each links as link (link.key)}
            <li>
                <a href={link.href}>{@html renderMixed(link.title)}</a>
                {#if link.status}
                    <span class="chip status-{link.status}">{STATUS_LABELS[link.status]}</span>
                {/if}
                {#if link.summary}<span class="summary">{@html summary(link.summary)}</span>{/if}
            </li>
        {/each}
    </ul>
{/if}
