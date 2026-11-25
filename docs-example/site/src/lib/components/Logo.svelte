<script lang="ts">
    // The example's logo, inlined so that its ink follows the theme (`.logo` in the shared styles).
    import icon from '../../../static/favicon.svg?raw';
    import { SITE } from '$lib/site';

    let { variant }: { variant: 'icon' | 'lockup' } = $props();
</script>

<span class="logo logo-{variant}" aria-hidden="true">
    <!-- eslint-disable-next-line svelte/no-at-html-tags -- a file in this repository -->
    {@html icon}{#if variant === 'lockup'}<span>{SITE.name}</span>{/if}
</span>
