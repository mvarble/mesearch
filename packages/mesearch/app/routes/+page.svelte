<script lang="ts">
    import { Graph, Index } from '@mvarble/mesearch-ui';
    import site from '$site';
    import { href } from '$lib/format';

    let { data } = $props();

    let entries = $derived(Object.fromEntries(data.documents.map((doc) => [doc.key, doc])));
    let counts = $derived({
        concepts: data.documents.filter((doc) => doc.kind == 'concept').length,
        writeups: data.documents.filter((doc) => doc.kind == 'writeup').length,
        sequences: data.sequences.length,
    });
    const plural = (n: number, word: string) => `${n} ${word}${n == 1 ? '' : 's'}`;
</script>

<svelte:head>
    <title>{site.title}</title>
</svelte:head>

<main id="main" class="home">
    <header class="hero">
        <p class="eyebrow">{site.author ?? 'A library of notes'}</p>
        <h1>{site.title}</h1>
        {#if data.Description}
            <div class="lede prose">
                <data.Description />
            </div>
        {/if}
        <p class="counts">
            {[
                plural(counts.concepts, 'concept'),
                plural(counts.writeups, 'writeup'),
                ...(counts.sequences ? [plural(counts.sequences, 'sequence')] : []),
            ].join(' · ')}
        </p>
    </header>

    <section id="atlas" class="atlas" aria-labelledby="atlas-heading">
        <div class="section-head">
            <h2 id="atlas-heading">The map</h2>
            <p>
                Arrows run from what a document builds on to the document itself, so following them
                is a reading order. Dashed lines join documents that refer to one another.
            </p>
        </div>
        <Graph
            nodes={data.graph.nodes}
            links={data.graph.links}
            {entries}
            descriptions={data.descriptions}
            tuning={site.graph}
        />
    </section>

    {#if data.sequences.length}
        <section class="sequences" aria-labelledby="sequences-heading">
            <div class="section-head">
                <h2 id="sequences-heading">Sequences</h2>
                <p>Writeups meant to be read in order.</p>
            </div>
            <ul class="cards">
                {#each data.sequences as sequence (sequence.key)}
                    <li class="card kind-sequence">
                        <a href={href(sequence.key)}>
                            <span class="eyebrow">{plural(sequence.documents.length, 'part')}</span>
                            <span class="card-title">{@html sequence.titleHtml}</span>
                            {#if sequence.summaryHtml}<span class="card-summary"
                                    >{@html sequence.summaryHtml}</span
                                >{/if}
                            <ol class="parts">
                                {#each sequence.documents as part (part.key)}
                                    <li>{@html part.titleHtml}</li>
                                {/each}
                            </ol>
                        </a>
                    </li>
                {/each}
            </ul>
        </section>
    {/if}

    <section id="index" class="index-section" aria-labelledby="index-heading">
        <div class="section-head">
            <h2 id="index-heading">Index</h2>
            <p>Everything, most recently changed first.</p>
        </div>
        <Index entries={data.documents} />
    </section>
</main>

<style>
    .home {
        width: min(72rem, 100% - 2 * var(--gutter));
        margin: 0 auto;
        padding: clamp(2.5rem, 6vw, 5rem) 0 4rem;
    }

    .hero {
        max-width: var(--measure);
        margin-bottom: clamp(2.5rem, 6vw, 4.5rem);
    }

    .hero .eyebrow {
        color: var(--accent);
        margin: 0 0 0.9rem;
    }

    h1 {
        margin: 0 0 1.25rem;
        font: 600 clamp(2.6rem, 1.6rem + 4vw, 4.2rem) / 1.02 var(--font-serif);
        letter-spacing: -0.025em;
        text-wrap: balance;
    }

    .lede {
        font-size: 1.2rem;
        line-height: 1.65;
        color: var(--ink-soft);
    }

    .counts {
        margin: 1.5rem 0 0;
        font: 500 var(--font-size-ui) / 1.4 var(--font-ui);
        color: var(--muted);
        letter-spacing: 0.02em;
    }

    section {
        margin-bottom: clamp(3rem, 7vw, 5rem);
        scroll-margin-top: 1.5rem;
    }

    .section-head {
        display: flex;
        flex-wrap: wrap;
        align-items: baseline;
        gap: 0.4rem 1.5rem;
        margin-bottom: 1.25rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--rule);
    }

    h2 {
        margin: 0;
        font: 600 1.6rem / 1.2 var(--font-serif);
    }

    .section-head p {
        flex: 1 1 20rem;
        margin: 0;
        font: 400 0.9rem / 1.5 var(--font-ui);
        color: var(--muted);
    }

    .cards {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(18rem, 1fr));
        gap: 1rem;
        margin: 0;
        padding: 0;
        list-style: none;
    }

    .card a {
        display: flex;
        flex-direction: column;
        gap: 0.45rem;
        height: 100%;
        padding: 1.2rem 1.3rem;
        border: 1px solid var(--rule);
        border-top: 3px solid var(--kind);
        border-radius: var(--radius);
        background: var(--paper-raised);
        color: inherit;
        text-decoration: none;
        transition:
            box-shadow 150ms,
            transform 150ms;
    }

    .card a:hover {
        box-shadow: var(--shadow);
        transform: translateY(-1px);
    }

    .card .eyebrow {
        color: var(--kind);
    }

    .card-title {
        font: 600 1.25rem / 1.25 var(--font-serif);
    }

    .card-summary {
        font-size: 0.95rem;
        color: var(--ink-soft);
        line-height: 1.55;
    }

    .parts {
        margin: 0.3rem 0 0;
        padding-left: 1.3rem;
        font: 0.85rem / 1.6 var(--font-ui);
        color: var(--muted);
    }

    .parts li::marker {
        color: var(--kind);
        font-variant-numeric: tabular-nums;
    }
</style>
