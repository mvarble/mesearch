<!--
    A proof, for a document to wrap one in:

        import Proof from '@mvarble/mesearch/Proof.svelte';

        <Proof>

        Take any open cover ...

        </Proof>
-->
<script lang="ts">
    import type { ComponentProps } from 'svelte';
    import { Proof } from '@mvarble/mesearch-ui';

    let props: ComponentProps<typeof Proof> = $props();
</script>

<Proof {...props} />
