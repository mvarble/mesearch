<script lang="ts">
    import type { Snippet } from 'svelte';
    import type { RailLink } from '../types.js';
    import Icon from './Icon.svelte';
    import ThemeToggle from './ThemeToggle.svelte';

    // Instead of a header across the top every page has this: a slim spine
    // down the left edge on wide screens, and a floating dock at the bottom on
    // narrow ones. The site's monogram, search, a few links, and the theme ---
    // and on a document, how far along the reader is.
    let {
        title,
        home,
        links = [],
        onsearch,
        progress = null,
        logo,
    }: {
        // The site's name; its initials make the monogram.
        title: string;
        home: string;
        links?: RailLink[];
        // Left out, there is no search button.
        onsearch?: () => void;
        progress?: number | null;
        // Drawn in place of the initials.
        logo?: Snippet;
    } = $props();

    let monogram = $derived(
        title
            .split(/\s+/)
            .filter(Boolean)
            .slice(0, 2)
            .map((word) => word[0]!.toUpperCase())
            .join(''),
    );
</script>

<nav class="rail" aria-label="Site">
    <a class="monogram" href={home} {title} aria-label={`${title}, home`}>
        {#if logo}{@render logo()}{:else}{monogram}{/if}
    </a>
    <div class="actions">
        {#if onsearch}
            <button
                class="rail-button needs-js"
                type="button"
                onclick={onsearch}
                aria-label="Search"
                title="Search  ( / )"
            >
                <Icon name="search" />
            </button>
        {/if}
        {#each links as link (link.url)}
            <a class="rail-button" href={link.url} aria-label={link.label} title={link.label}
                ><Icon name={link.icon} /></a
            >
        {/each}
    </div>
    <div class="end">
        <ThemeToggle />
    </div>
    {#if progress !== null}
        <div class="progress" aria-hidden="true">
            <div class="progress-fill" style:transform="scaleY({progress})"></div>
        </div>
    {/if}
</nav>

<style>
    .rail {
        position: fixed;
        z-index: 40;
        display: flex;
        align-items: center;
        background: color-mix(in srgb, var(--paper-sunken) 88%, transparent);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        font-family: var(--font-ui);
    }

    .monogram {
        display: grid;
        place-items: center;
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 10px;
        background: var(--accent);
        color: var(--accent-ink);
        font: 600 1.05rem / 1 var(--font-serif);
        letter-spacing: 0.02em;
        text-decoration: none;
        flex: none;
    }

    .actions,
    .end {
        display: flex;
        align-items: center;
        gap: 0.25rem;
    }

    .rail :global(.rail-button) {
        display: grid;
        place-items: center;
        width: 2.5rem;
        height: 2.5rem;
        border: none;
        border-radius: 10px;
        background: transparent;
        color: var(--muted);
        cursor: pointer;
        text-decoration: none;
        transition:
            background 120ms,
            color 120ms;
    }

    .rail :global(.rail-button:hover) {
        background: var(--accent-soft);
        color: var(--ink);
    }

    /* Narrow screens: a floating dock, centred at the bottom. */
    .rail {
        left: 50%;
        bottom: max(0.9rem, env(safe-area-inset-bottom));
        transform: translateX(-50%);
        flex-direction: row;
        gap: 0.35rem;
        padding: 0.35rem;
        border: 1px solid var(--rule);
        border-radius: 16px;
        box-shadow: var(--shadow);
    }

    .progress {
        display: none;
    }

    /* Wide screens: a spine down the left edge. */
    @media (min-width: 960px) {
        .rail {
            left: 0;
            top: 0;
            bottom: 0;
            transform: none;
            width: var(--rail-width);
            flex-direction: column;
            gap: 0;
            padding: 0.9rem 0;
            border: none;
            border-right: 1px solid var(--rule);
            border-radius: 0;
            box-shadow: none;
        }

        .actions {
            flex-direction: column;
            margin-top: 1.5rem;
        }

        .end {
            margin-top: auto;
            flex-direction: column;
        }

        .progress {
            display: block;
            position: absolute;
            top: 0;
            right: -1px;
            bottom: 0;
            width: 2px;
        }

        .progress-fill {
            height: 100%;
            background: var(--accent);
            transform-origin: top;
            transition: transform 80ms linear;
        }
    }
</style>
