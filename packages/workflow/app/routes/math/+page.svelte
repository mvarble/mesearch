<script lang="ts">
    import DocumentMap from '../../lib/components/DocumentMap.svelte';
    import PageList from '../../lib/components/PageList.svelte';
    import { MATH, SITE } from '$site';

    let { data } = $props();
</script>

<svelte:head>
    <title>{MATH.title} · {SITE.name}</title>
    <meta property="og:title" content="{MATH.title} · {SITE.name}" />
    <meta name="description" content={MATH.blurb} />
    <meta property="og:description" content={MATH.blurb} />
</svelte:head>

<div class="doc-layout">
    <article class="doc track-index">
        <header class="doc-header">
            <h1>{MATH.title}</h1>
            <p class="lede">{MATH.blurb}</p>
        </header>
        {#if data.parts.length}
            <!-- The notes in the order they are read: part by part, numbered through. -->
            {#each data.parts as part (part.id)}
                <section class="math-part" aria-labelledby={part.id}>
                    <h2 id={part.id}>{part.title}</h2>
                    <p class="part-blurb">{part.blurb}</p>
                    <PageList
                        links={part.notes}
                        numbered
                        start={part.start}
                        empty="No notes in this part yet."
                    />
                </section>
            {/each}
            {#if data.map.nodes.length}
                <section class="math-part" aria-labelledby="map">
                    <h2 id="map">What rests on what</h2>
                    <p class="part-blurb">
                        The order above is one way through. The map shows why it is the order it is:
                        an arrow runs from each note to the notes and the archive's documents that
                        build on it.
                    </p>
                    <DocumentMap {...data.map} />
                </section>
            {/if}
        {:else}
            <!-- Notes without parts, by title, under the map they make. -->
            {#if data.map.nodes.length}
                <DocumentMap {...data.map} />
            {/if}
            <h2>Notes</h2>
            <PageList links={data.notes} empty="No notes yet." />
        {/if}
    </article>
</div>
