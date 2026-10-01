<script lang="ts">
    import { page } from '$app/state';
    import site from '$site';
    import { href } from '$lib/format';
</script>

<svelte:head>
    <title>{page.status} · {site.title}</title>
</svelte:head>

<main id="main" class="error">
    <p class="eyebrow">{page.status}</p>
    <h1>{page.status == 404 ? 'Not in the library' : 'Something went wrong'}</h1>
    <p>{page.error?.message}</p>
    <p><a href={href('')}>Back to {site.title}</a></p>
</main>

<style>
    .error {
        width: min(var(--measure), 100% - 2 * var(--gutter));
        margin: 0 auto;
        padding: 6rem 0;
    }

    .eyebrow {
        color: var(--accent);
    }

    h1 {
        font: 600 2.4rem / 1.1 var(--font-serif);
        margin: 0.5rem 0 1rem;
    }

    a {
        color: var(--accent);
    }
</style>
