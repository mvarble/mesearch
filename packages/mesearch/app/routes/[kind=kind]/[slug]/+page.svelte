<script lang="ts">
    import { onMount } from 'svelte';
    import site from '$site';
    import Icon from '$lib/components/Icon.svelte';
    import SequenceTrack from '$lib/components/SequenceTrack.svelte';
    import Toc from '$lib/components/Toc.svelte';
    import { formatDate, href, isoDate, kindLabel } from '$lib/format';
    import { reading } from '$lib/reading.svelte';

    let { data } = $props();
    let doc = $derived(data.doc);
    let article: HTMLElement | undefined = $state();

    // How far through the article the reader is, for the rail.
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

    let updated = $derived(isoDate(doc.updated) != isoDate(doc.created));
</script>

<svelte:head>
    <title>{doc.title} · {site.title}</title>
    {#if doc.summary}<meta name="description" content={doc.summary} />{/if}
</svelte:head>

<main id="main" class="doc kind-{doc.kind}">
    {#if data.memberships.length}
        <aside class="left">
            <div class="sticky">
                {#each data.memberships as membership (membership.sequence.key)}
                    <SequenceTrack {...membership} />
                {/each}
            </div>
        </aside>
    {/if}

    <article bind:this={article}>
        <header class="head">
            <p class="eyebrow kind">
                <a href={href('')}>{site.title}</a>
                <span aria-hidden="true">/</span>
                {kindLabel(doc.kind)}
                {#each data.memberships as membership (membership.sequence.key)}
                    <span aria-hidden="true">·</span>
                    <a href={href(membership.sequence.key)}>{membership.sequence.title}</a>
                    <span class="part">{membership.index + 1} of {membership.documents.length}</span
                    >
                {/each}
            </p>
            <h1>{@html doc.titleHtml}</h1>
            <p class="meta">
                <span
                    >Written <time datetime={isoDate(doc.created)}>{formatDate(doc.created)}</time
                    ></span
                >
                {#if updated}
                    <span
                        >Revised <time datetime={isoDate(doc.updated)}
                            >{formatDate(doc.updated)}</time
                        ></span
                    >
                {/if}
                <span>{doc.readingMinutes} min read</span>
            </p>
            {#if data.prerequisites.length}
                <div class="builds-on">
                    <span class="label">Builds on</span>
                    <ul class="chips">
                        {#each data.prerequisites as other (other.key)}
                            <li>
                                <a class="chip kind-{other.kind}" href={href(other.key)}
                                    >{other.title}</a
                                >
                            </li>
                        {/each}
                    </ul>
                </div>
            {/if}

            <!-- On screens too narrow for the sidebars, they fold into the header. -->
            {#if data.memberships.length || data.toc.length}
                <div class="folded">
                    {#each data.memberships as membership (membership.sequence.key)}
                        <details>
                            <summary>
                                Sequence: {membership.sequence.title}
                                <span class="part"
                                    >{membership.index + 1} of {membership.documents.length}</span
                                >
                            </summary>
                            <SequenceTrack {...membership} />
                        </details>
                    {/each}
                    {#if data.toc.length}
                        <details>
                            <summary>Contents</summary>
                            <Toc entries={data.toc} label="Contents" />
                        </details>
                    {/if}
                </div>
            {/if}
        </header>

        <div class="prose content">
            <data.Content />
        </div>

        {#if data.contents.length}
            <ol class="contents">
                {#each data.contents as part, i (part.key)}
                    <li class="kind-{part.kind}">
                        <span class="number">{i + 1}</span>
                        <div>
                            <a href={href(part.key)}>{@html part.titleHtml}</a>
                            {#if part.summaryHtml}<p>{@html part.summaryHtml}</p>{/if}
                        </div>
                    </li>
                {/each}
            </ol>
        {/if}

        <footer class="foot">
            {#each data.memberships as membership (membership.sequence.key)}
                {@const prev = membership.documents[membership.index - 1]}
                {@const next = membership.documents[membership.index + 1]}
                <nav class="pager" aria-label="Through {membership.sequence.title}">
                    {#if prev}
                        <a class="prev" href={href(prev.key)}>
                            <span class="eyebrow"
                                ><Icon name="arrow-left" size={14} /> Previous</span
                            >
                            <span class="pager-title">{@html prev.titleHtml}</span>
                        </a>
                    {/if}
                    {#if next}
                        <a class="next" href={href(next.key)}>
                            <span class="eyebrow">Next <Icon name="arrow-right" size={14} /></span>
                            <span class="pager-title">{@html next.titleHtml}</span>
                        </a>
                    {/if}
                </nav>
            {/each}

            {#if data.dependents.length}
                <section>
                    <h2 class="eyebrow">Leads to</h2>
                    <ul class="chips">
                        {#each data.dependents as other (other.key)}
                            <li>
                                <a class="chip kind-{other.kind}" href={href(other.key)}
                                    >{other.title}</a
                                >
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
            {#if data.related.length}
                <section>
                    <h2 class="eyebrow">Related</h2>
                    <ul class="chips">
                        {#each data.related as other (other.key)}
                            <li>
                                <a class="chip kind-{other.kind}" href={href(other.key)}
                                    >{other.title}</a
                                >
                            </li>
                        {/each}
                    </ul>
                </section>
            {/if}
            <a class="back" href="{href('')}#atlas"
                ><Icon name="graph" size={16} /> Back to the map</a
            >
        </footer>
    </article>

    {#if data.toc.length}
        <aside class="right">
            <div class="sticky">
                <Toc entries={data.toc} />
            </div>
        </aside>
    {/if}
</main>

<style>
    .doc {
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

    .kind {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.5em;
        margin: 0 0 1.1rem;
        color: var(--kind);
    }

    .kind a {
        color: var(--muted);
        text-decoration: none;
    }

    .kind a:hover {
        color: var(--ink);
    }

    .kind span[aria-hidden] {
        color: var(--faint);
    }

    .part {
        color: var(--faint);
        letter-spacing: 0.06em;
    }

    h1 {
        margin: 0 0 1rem;
        font: 600 var(--font-size-title) / 1.08 var(--font-heading);
        letter-spacing: -0.02em;
        text-wrap: balance;
    }

    .meta {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem 1.25rem;
        margin: 0;
        font: 400 0.85rem / 1.5 var(--font-ui);
        color: var(--muted);
    }

    .builds-on {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.5rem 0.75rem;
        margin-top: 1.4rem;
        padding-top: 1.1rem;
        border-top: 1px solid var(--rule);
    }

    .label {
        font: 600 var(--font-size-eyebrow) / 1 var(--font-ui);
        letter-spacing: 0.12em;
        text-transform: uppercase;
        color: var(--muted);
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

    details[open] summary {
        border-bottom: 1px solid var(--rule);
    }

    details > :global(:not(summary)) {
        padding: 1rem 0.9rem 0.5rem;
    }

    .content {
        padding-top: 0.25rem;
    }

    .contents {
        list-style: none;
        margin: 2.5rem 0 0;
        padding: 0;
        border-top: 1px solid var(--rule);
    }

    .contents li {
        display: grid;
        grid-template-columns: 2.5rem 1fr;
        gap: 0.75rem;
        padding: 1.1rem 0;
        border-bottom: 1px solid var(--rule);
    }

    .number {
        font: 600 1.6rem / 1.1 var(--font-serif);
        color: var(--kind);
        font-variant-numeric: oldstyle-nums;
    }

    .contents a {
        font: 600 1.15rem / 1.3 var(--font-serif);
        color: var(--ink);
        text-decoration: none;
    }

    .contents a:hover {
        color: var(--kind);
    }

    .contents p {
        margin: 0.3rem 0 0;
        color: var(--ink-soft);
        font-size: 0.97rem;
        line-height: 1.6;
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

    .foot h2 {
        margin: 0 0 0.6rem;
    }

    .pager {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
    }

    .pager a {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
        padding: 1rem 1.1rem;
        border: 1px solid var(--rule);
        border-radius: var(--radius);
        background: var(--paper-raised);
        color: inherit;
        text-decoration: none;
        transition: border-color 120ms;
    }

    .pager a:hover {
        border-color: var(--sequence);
    }

    .pager .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
        color: var(--sequence);
    }

    .next {
        grid-column: 2;
        text-align: right;
        align-items: flex-end;
    }

    .pager-title {
        font: 600 1rem / 1.3 var(--font-serif);
    }

    .back {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        align-self: flex-start;
        font: 500 0.85rem / 1 var(--font-ui);
        color: var(--muted);
        text-decoration: none;
    }

    .back:hover {
        color: var(--accent);
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
