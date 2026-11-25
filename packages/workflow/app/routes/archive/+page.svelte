<script lang="ts">
    import DocumentMap from '../../lib/components/DocumentMap.svelte';
    import PageList from '../../lib/components/PageList.svelte';
    import { ARCHIVE, SITE } from '$site';

    let { data } = $props();
</script>

<svelte:head>
    <title>{ARCHIVE.title} · {SITE.name}</title>
    <meta property="og:title" content="{ARCHIVE.title} · {SITE.name}" />
    <meta name="description" content={ARCHIVE.blurb} />
    <meta property="og:description" content={ARCHIVE.blurb} />
</svelte:head>

<div class="doc-layout">
    <article class="doc track-index">
        <header class="doc-header">
            <h1>{ARCHIVE.title}</h1>
            <p class="lede">{ARCHIVE.blurb}</p>
        </header>
        {#if ARCHIVE.about}
            <div class="prose">
                <p>{ARCHIVE.about}</p>
            </div>
        {/if}
        {#if data.map.nodes.length}
            <DocumentMap {...data.map} />
        {/if}
        {#if data.active.length}
            <h2>In progress</h2>
            <PageList links={data.active} empty="" />
        {/if}
        <h2>Done</h2>
        <PageList links={data.done} empty="No entry is finished yet." />
        {#if data.abandoned.length}
            <h2>Set aside</h2>
            <p class="muted">
                Worked on, then put down. Their documents stay, should they be taken up again.
            </p>
            <PageList links={data.abandoned} empty="" />
        {/if}
    </article>
</div>
