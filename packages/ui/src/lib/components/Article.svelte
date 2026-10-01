<script lang="ts">
    import { onMount, type Snippet } from 'svelte';
    import { reading } from '../reading.svelte.js';

    // A document's page: the article in a column of comfortable measure, with
    // a sidebar on either side when the screen is wide enough. On narrower
    // screens the sidebars fold into disclosures under the header. Scrolling
    // through the article moves the rail's progress line.
    //
    // A sidebar snippet is rendered twice, once in the margin and once folded,
    // and is told which it is.
    let {
        header,
        children,
        after,
        footer,
        left,
        right,
        leftLabel = 'Sequence',
        leftNote,
        rightLabel = 'Contents',
        kind,
    }: {
        header: Snippet;
        // The document itself, styled as prose.
        children: Snippet;
        // Anything between the document and the footer, not styled as prose.
        after?: Snippet;
        footer?: Snippet;
        left?: Snippet<[folded: boolean]>;
        right?: Snippet<[folded: boolean]>;
        // What a folded sidebar's disclosure says, and a quieter aside after
        // it ("2 of 5").
        leftLabel?: string;
        leftNote?: string;
        rightLabel?: string;
        kind?: string;
    } = $props();

    let article: HTMLElement | undefined = $state();

    onMount(() => {
        let frame = 0;
        const update = () => {
            frame = 0;
            if (!article) return;
            // Nothing read at the top of the page, everything once the end of
            // the article is on screen.
            const end = article.getBoundingClientRect().bottom + scrollY - innerHeight;
            reading.progress = end <= 0 ? 1 : Math.min(1, Math.max(0, scrollY / end));
        };
        const schedule = () => (frame ||= requestAnimationFrame(update));
        update();
        addEventListener('scroll', schedule, { passive: true });
        addEventListener('resize', schedule);
        return () => {
            removeEventListener('scroll', schedule);
            removeEventListener('resize', schedule);
            cancelAnimationFrame(frame);
            reading.progress = null;
        };
    });
</script>

<main id="main" class="page {kind ? `kind-${kind}` : ''}">
    {#if left}
        <aside class="left">
            <div class="sticky">{@render left(false)}</div>
        </aside>
    {/if}

    <article bind:this={article}>
        <div class="head">
            {@render header()}
            {#if left || right}
                <div class="folded">
                    {#if left}
                        <details>
                            <summary>
                                {leftLabel}
                                {#if leftNote}<span class="note">{leftNote}</span>{/if}
                            </summary>
                            <div class="folded-body">{@render left(true)}</div>
                        </details>
                    {/if}
                    {#if right}
                        <details>
                            <summary>{rightLabel}</summary>
                            <div class="folded-body">{@render right(true)}</div>
                        </details>
                    {/if}
                </div>
            {/if}
        </div>

        <div class="prose content">
            {@render children()}
        </div>

        {@render after?.()}

        {#if footer}
            <footer class="foot">{@render footer()}</footer>
        {/if}
    </article>

    {#if right}
        <aside class="right">
            <div class="sticky">{@render right(false)}</div>
        </aside>
    {/if}
</main>

<style>
    .page {
        display: grid;
        grid-template-columns: 1fr min(var(--measure), 100% - 2 * var(--gutter)) 1fr;
        padding: clamp(2.25rem, 6vw, 4.5rem) 0 4rem;
    }

    article {
        grid-column: 2;
        min-width: 0;
    }

    .left,
    .right {
        display: none;
    }

    .sticky {
        position: sticky;
        top: 2.5rem;
        max-height: calc(100vh - 5rem);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 2rem;
        scrollbar-width: thin;
    }

    .head {
        margin-bottom: 2.5rem;
    }

    .folded {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-top: 1.5rem;
    }

    details {
        border: 1px solid var(--rule);
        border-radius: var(--radius);
        background: var(--paper-raised);
        font-family: var(--font-ui);
    }

    summary {
        padding: 0.65rem 0.9rem;
        font: 500 0.88rem / 1.3 var(--font-ui);
        color: var(--ink-soft);
        cursor: pointer;
    }

    .note {
        color: var(--faint);
        letter-spacing: 0.06em;
    }

    details[open] summary {
        border-bottom: 1px solid var(--rule);
    }

    .folded-body {
        padding: 1rem 0.9rem 0.5rem;
    }

    .content {
        padding-top: 0.25rem;
    }

    .foot {
        display: flex;
        flex-direction: column;
        gap: 1.75rem;
        margin-top: 3.5rem;
        padding-top: 2rem;
        border-top: 1px solid var(--rule);
        font-family: var(--font-ui);
    }

    @media (min-width: 1280px) {
        .left {
            display: block;
            grid-column: 1;
            grid-row: 1;
            justify-self: end;
            width: var(--sidebar-left);
            margin-right: 3rem;
        }

        .right {
            display: block;
            grid-column: 3;
            grid-row: 1;
            justify-self: start;
            width: var(--sidebar-right);
            margin-left: 3rem;
        }

        .folded {
            display: none;
        }
    }
</style>
