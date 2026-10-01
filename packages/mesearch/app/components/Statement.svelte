<!--
    What a document imports to show a statement --- a theorem, a definition ---
    written as a document of its own:

        import Statement from '@mvarble/mesearch/Statement.svelte';
        import * as heineBorel from './statements/heine-borel.md';

        <Statement {...heineBorel} />

    The content layer numbers it along with the page's equations.
-->
<script lang="ts">
    import type { ComponentProps } from 'svelte';
    import { Statement } from '@mvarble/mesearch-ui';

    let props: ComponentProps<typeof Statement> = $props();
</script>

<Statement {...props} />
