<script lang="ts">
    import type { Heading } from '../documents';
    import { renderMixed } from '../tex';

    let { headings }: { headings: Heading[] } = $props();

    // Scroll-spy: the active entry is the last heading above the top third of the viewport.
    let active = $state<string | undefined>();

    $effect(() => {
        const elements = headings
            .map((h) => document.getElementById(h.slug))
            .filter((el): el is HTMLElement => el !== null);
        const update = () => {
            const line = window.innerHeight / 3;
            let current = elements[0]?.id;
            for (const el of elements) {
                if (el.getBoundingClientRect().top <= line) current = el.id;
            }
            active = current;
        };
        update();
        window.addEventListener('scroll', update, { passive: true });
        return () => window.removeEventListener('scroll', update);
    });
</script>

{#if headings.length}
    <nav class="toc" aria-label="On this page">
        <p class="toc-title">On this page</p>
        <ol>
            {#each headings as h (h.slug)}
                <li class="depth-{h.depth}">
                    <a href="#{h.slug}" aria-current={active === h.slug ? 'location' : undefined}
                        >{@html renderMixed(h.title)}</a
                    >
                </li>
            {/each}
        </ol>
    </nav>
{/if}
