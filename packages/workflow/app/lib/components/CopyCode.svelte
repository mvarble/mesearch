<script lang="ts">
    // Adds a copy button to every highlighted block inside `root`. The blocks are static HTML from
    // mdsvex, so the buttons are attached after mount rather than rendered by a component.
    let { root }: { root: HTMLElement | undefined } = $props();

    $effect(() => {
        if (!root) return;
        const buttons: HTMLButtonElement[] = [];
        for (const pre of root.querySelectorAll<HTMLPreElement>('pre.shiki')) {
            const button = document.createElement('button');
            button.type = 'button';
            button.className = 'copy-button';
            button.textContent = 'Copy';
            button.addEventListener('click', async () => {
                await navigator.clipboard.writeText(pre.innerText);
                button.textContent = 'Copied';
                setTimeout(() => (button.textContent = 'Copy'), 1500);
            });
            pre.parentElement?.insertBefore(button, pre);
            buttons.push(button);
        }
        return () => buttons.forEach((b) => b.remove());
    });
</script>
