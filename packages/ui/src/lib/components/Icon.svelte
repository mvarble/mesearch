<script lang="ts">
    // A handful of line icons, drawn on a 24-unit grid in the current colour.
    import type { IconName } from '../types.js';

    let { name, size = 20 }: { name: IconName; size?: number } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    {#if name == 'search'}
        <circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.3-4.3" />
    {:else if name == 'graph'}
        <circle cx="6" cy="6" r="2.4" /><circle cx="18" cy="8" r="2.4" /><circle
            cx="11"
            cy="18"
            r="2.4"
        /><path d="M8.2 7 15.7 7.7M7.2 8.1l2.6 7.7M16.8 10l-4.4 6.2" />
    {:else if name == 'list'}
        <path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r="1" /><circle
            cx="4.5"
            cy="12"
            r="1"
        /><circle cx="4.5" cy="18" r="1" />
    {:else if name == 'sun'}
        <circle cx="12" cy="12" r="4" /><path
            d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"
        />
    {:else if name == 'moon'}
        <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    {:else if name == 'auto'}
        <circle cx="12" cy="12" r="8.5" /><path
            d="M12 3.5v17A8.5 8.5 0 0 0 12 3.5Z"
            fill="currentColor"
        />
    {:else if name == 'plus'}
        <path d="M12 5v14M5 12h14" />
    {:else if name == 'minus'}
        <path d="M5 12h14" />
    {:else if name == 'reset'}
        <path d="M4 4v5h5" /><path d="M5.5 15a7.5 7.5 0 1 0 1.3-8.3L4 9" />
    {:else if name == 'close'}
        <path d="M6 6l12 12M18 6 6 18" />
    {:else if name == 'arrow-right'}
        <path d="M5 12h14M13 6l6 6-6 6" />
    {:else if name == 'arrow-left'}
        <path d="M19 12H5M11 6l-6 6 6 6" />
    {:else if name == 'home'}
        <path d="M4 11 12 4l8 7M6 9.5V20h12V9.5" />
    {:else if name == 'pen'}
        <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 3 3" />
    {:else if name == 'book'}
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5Z" /><path
            d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"
        />
    {:else if name == 'quote'}
        <path d="M5 11h4v6H4v-5c0-3 1.5-5 4-6M15 11h4v6h-5v-5c0-3 1.5-5 4-6" />
    {/if}
</svg>
