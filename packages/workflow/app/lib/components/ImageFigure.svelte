<!--
    A photo or screenshot in a document, which opens at the size of the window when clicked.

    Import the image in the document's script, so that the build serves it under the base path, and
    give its pixel size, so that the page keeps its place while it loads and the enlarged copy is as
    large as the window allows without being letterboxed:

        <ImageFigure src={board} alt="…" width={1200} height={1600}>The caption.</ImageFigure>

    The image is a button: clicked, or pressed with Enter or Space, it opens a modal dialog, which
    Escape, the close button or a click outside it closes. Hovering or focusing it lifts it and shows
    an "Enlarge" badge, so that a reader sees it can be opened before trying. Adapted from skoro's
    `ExampleFigure`, with an image in place of its inlined SVG.
-->
<script lang="ts">
    import type { Snippet } from 'svelte';
    import Icon from './Icon.svelte';

    let {
        src,
        alt,
        width,
        height,
        children,
    }: { src: string; alt: string; width: number; height: number; children?: Snippet } = $props();

    let dialog: HTMLDialogElement | undefined = $state();

    function open() {
        dialog?.showModal();
    }

    // A click on the backdrop lands on the dialog itself, outside its frame.
    function closeOnBackdrop(event: MouseEvent) {
        if (event.target == dialog) dialog?.close();
    }
</script>

<figure class="image-figure">
    <button
        type="button"
        class="opener"
        onclick={open}
        aria-haspopup="dialog"
        aria-label={`Enlarge the image: ${alt}`}
    >
        <img {src} {alt} {width} {height} loading="lazy" />
        <span class="badge" aria-hidden="true"><Icon name="expand" size={16} /> Enlarge</span>
    </button>
    {#if children}<figcaption>{@render children()}</figcaption>{/if}
</figure>

<dialog bind:this={dialog} class="figure-dialog" aria-label={alt} onclick={closeOnBackdrop}>
    <div class="frame" style:--aspect={width / height}>
        <img class="enlarged" {src} {alt} {width} {height} />
        {#if children}<p class="dialog-caption">{@render children()}</p>{/if}
        <form method="dialog">
            <button class="close" aria-label="Close"><Icon name="close" size={20} /></button>
        </form>
    </div>
</dialog>

<style>
    .image-figure {
        margin: var(--space-6) 0;
    }

    .opener {
        position: relative;
        display: block;
        margin: 0 auto;
        padding: 0;
        border: 0;
        border-radius: var(--radius);
        background: none;
        cursor: zoom-in;
        box-shadow: 0 8px 24px rgb(0 0 0 / 0.08);
        transition:
            transform 160ms ease,
            box-shadow 160ms ease;
    }

    img {
        display: block;
        max-width: 100%;
        height: auto;
        border-radius: var(--radius);
    }

    /* A tall photo would fill the column, so its height is capped in place; the dialog shows it whole. */
    .opener img {
        max-height: 70vh;
        width: auto;
    }

    .badge {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.3rem 0.6rem;
        border-radius: 999px;
        background: var(--bg-1);
        color: var(--fg-2);
        font: var(--font-small);
        box-shadow: var(--shadow-sm);
        border: 1px solid var(--border);
        opacity: 0;
        transform: translateY(-2px);
        transition:
            opacity 160ms ease,
            transform 160ms ease;
    }

    .opener:hover,
    .opener:focus-visible {
        transform: translateY(-3px);
        box-shadow:
            0 0 0 2px var(--fg-accent),
            0 16px 36px rgb(0 0 0 / 0.14);
    }

    .opener:focus-visible {
        outline: none;
    }

    .opener:hover .badge,
    .opener:focus-visible .badge {
        opacity: 1;
        transform: none;
    }

    @media (prefers-reduced-motion: reduce) {
        .opener,
        .badge {
            transition: none;
        }

        .opener:hover,
        .opener:focus-visible {
            transform: none;
        }
    }

    figcaption {
        margin-top: var(--space-3);
        font: var(--font-small);
        color: var(--fg-3);
        text-align: center;
    }

    .figure-dialog {
        /* Centred in the window: the site's reset takes the user agent's automatic margins away. */
        margin: auto;
        max-width: 96vw;
        max-height: 96vh;
        padding: 0;
        border: 0;
        background: transparent;
        overflow: visible;
    }

    .figure-dialog::backdrop {
        background: rgb(10 12 20 / 0.72);
        backdrop-filter: blur(3px);
    }

    .frame {
        position: relative;
    }

    .enlarged {
        width: min(96vw, calc(86vh * var(--aspect)));
        max-width: none;
        box-shadow: 0 24px 64px rgb(0 0 0 / 0.35);
    }

    .dialog-caption {
        margin: var(--space-3) auto 0;
        max-width: 60rem;
        text-align: center;
        font: var(--font-small);
        color: hsl(0 0% 92%);
    }

    form {
        position: absolute;
        top: 0.75rem;
        right: 0.75rem;
        margin: 0;
    }

    .close {
        display: grid;
        place-items: center;
        width: 2.25rem;
        height: 2.25rem;
        border-radius: 999px;
        border: 1px solid var(--border);
        background: var(--bg-1);
        color: var(--fg-1);
        cursor: pointer;
        box-shadow: var(--shadow-sm);
    }

    .close:hover,
    .close:focus-visible {
        border-color: var(--fg-accent);
        color: var(--fg-accent);
    }
</style>
