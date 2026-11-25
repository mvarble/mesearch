<script lang="ts">
    import '../styles/index.css';

    import Shell from '@mvarble/mesearch-workflow/app/lib/components/Shell.svelte';

    let { data, children } = $props();
</script>

<Shell origin={data.origin}>
    {@render children()}
</Shell>
