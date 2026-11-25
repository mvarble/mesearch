<script lang="ts">
    import { renderTex, type Macros } from '../tex';

    // KaTeX, rendered while the page is prerendered, so it displays without JavaScript.
    //
    //     <Tex src={String.raw`\int_0^1 f(x)\,dx`} />
    //     <Tex display src={String.raw`\calI(\theta) = \E[s s^\top]`} />
    //
    // `String.raw` keeps backslashes as written. In a `.svx` page, `$…$` and `$$…$$` do the same job
    // with less ceremony; this component is for Svelte markup and for props.

    let {
        src,
        display = false,
        macros,
    }: { src: string; display?: boolean; macros?: Macros } = $props();

    const html = $derived(renderTex(src, { display, macros }));
</script>

{#if display}
    <div class="tex-display">{@html html}</div>
{:else}
    <span class="tex">{@html html}</span>
{/if}
