<script lang="ts">
    import Logo from '$lib/components/Logo.svelte';
    import TrackCard from '$lib/components/TrackCard.svelte';
    import { ARCHIVE, MATH, SITE, TRACKS } from '$lib/site';

    let { data } = $props();

    const blurb = (id: string) => TRACKS.find((t) => t.id == id)!.blurb;
</script>

<svelte:head>
    <title>{SITE.name}: {SITE.tagline}</title>
    <meta name="description" content={SITE.description} />
</svelte:head>

<section class="hero">
    <h1><Logo variant="lockup" /></h1>
    <p class="hero-tagline">{SITE.tagline}</p>
</section>

{#if data.component}
    <section class="landing-body prose">
        <data.component />
    </section>
{/if}

<section class="landing-tracks">
    <h2>Where things are</h2>
    <div class="card-grid">
        <TrackCard id="guide" eyebrow="Top-down" blurb={blurb('guide')} />
        <TrackCard id="math" eyebrow="The mathematics" blurb={MATH.blurb} />
        <TrackCard id="archive" eyebrow="How it came to be" blurb={ARCHIVE.blurb} />
    </div>
</section>
