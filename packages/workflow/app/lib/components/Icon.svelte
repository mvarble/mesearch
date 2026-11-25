<script lang="ts">
    // Inline 24×24 stroke icons, so the site needs no icon font.
    const PATHS = {
        sun: 'M12 4V2M12 22v-2M4.9 4.9 3.5 3.5M20.5 20.5l-1.4-1.4M4 12H2M22 12h-2M4.9 19.1l-1.4 1.4M20.5 3.5l-1.4 1.4M16 12a4 4 0 1 1-8 0 4 4 0 0 1 8 0Z',
        moon: 'M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z',
        menu: 'M3 6h18M3 12h18M3 18h18',
        close: 'M18 6 6 18M6 6l12 12',
        expand: 'M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7',
        github: 'M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21',
        arrowLeft: 'M19 12H5M12 19l-7-7 7-7',
        arrowRight: 'M5 12h14M12 5l7 7-7 7',
        copy: 'M9 9h11v11H9zM5 15H4V4h11v1',
        check: 'M20 6 9 17l-5-5',
        file: 'M14 3H6v18h12V7l-4-4Zm0 0v4h4',
        play: 'M7 4v16l13-8L7 4Z',
        pause: 'M8 5v14M16 5v14',
        restart: 'M5 4v16M19 20 9 12l10-8v16Z',
    } as const;

    let { name, size = 18 }: { name: keyof typeof PATHS; size?: number } = $props();
</script>

<svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
>
    <path d={PATHS[name]} />
</svg>
