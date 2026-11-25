<script lang="ts">
    import PageList from '../../lib/components/PageList.svelte';
    import { SITE } from '$site';

    let { data } = $props();
</script>

<svelte:head>
    <title>{data.track.title} · {SITE.name}</title>
    <meta property="og:title" content="{data.track.title} · {SITE.name}" />
    <meta name="description" content={data.track.blurb} />
    <meta property="og:description" content={data.track.blurb} />
</svelte:head>

<!-- The same frame as a documentation page, so the two line up. -->
<div class="doc-layout">
    <article class="doc track-index">
        <header class="doc-header">
            <h1>{data.track.title}</h1>
            <p class="lede">{data.track.blurb}</p>
        </header>
        <PageList links={data.pages} numbered empty="Nothing in this track yet." />
    </article>
</div>
