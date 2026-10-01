<script lang="ts">
    import { theme } from '../theme.svelte.js';
    import Icon from './Icon.svelte';

    const labels = {
        system: 'Theme: following the device',
        light: 'Theme: light',
        dark: 'Theme: dark',
    };
    const icons = { system: 'auto', light: 'sun', dark: 'moon' } as const;
</script>

<button
    class="rail-button needs-js"
    type="button"
    onclick={() => theme.cycle()}
    aria-label={labels[theme.choice]}
    title={`${labels[theme.choice]} (click to change)`}
>
    <Icon name={icons[theme.choice]} />
</button>
