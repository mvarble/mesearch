<script lang="ts">
    import { theme } from '../theme.svelte.js';
    import Icon from './Icon.svelte';

    // Shows the theme in use; a click switches to the other one.
    let label = $derived(
        theme.resolved == 'dark' ? 'Dark theme: switch to light' : 'Light theme: switch to dark',
    );
</script>

<button
    class="rail-button needs-js"
    type="button"
    onclick={() => theme.toggle()}
    aria-label={label}
    title={label}
>
    <Icon name={theme.resolved == 'dark' ? 'moon' : 'sun'} />
</button>
