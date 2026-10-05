<script>
    // Flips a fair coin on demand and tracks the running proportion of heads,
    // drawn on a canvas in the theme's colours.
    import { palette } from '@mvarble/mesearch/palette';

    let flips = $state([]);
    let heads = $derived(flips.filter(Boolean).length);
    let canvas;

    // Reads the palette, so it draws again when the reader switches theme.
    $effect(() => {
        const context = canvas.getContext('2d');
        const { width, height } = canvas;
        const y = (p) => height - p * height;
        context.clearRect(0, 0, width, height);
        context.lineWidth = 2;
        context.strokeStyle = palette.ruleStrong;
        context.setLineDash([4, 4]);
        context.beginPath();
        context.moveTo(0, y(0.5));
        context.lineTo(width, y(0.5));
        context.stroke();
        context.setLineDash([]);
        context.strokeStyle = palette.series[0];
        context.beginPath();
        let count = 0;
        flips.forEach((head, i) => {
            if (head) count++;
            const x = flips.length > 1 ? (i / (flips.length - 1)) * width : 0;
            context.lineTo(x, y(count / (i + 1)));
        });
        context.stroke();
    });

    function flip(n) {
        const next = [...flips];
        for (let i = 0; i < n; i++) next.push(Math.random() < 0.5);
        flips = next;
    }
</script>

<div class="flipper">
    <div class="buttons">
        <button type="button" onclick={() => flip(1)}>Flip once</button>
        <button type="button" onclick={() => flip(100)}>Flip 100</button>
        <button type="button" onclick={() => (flips = [])}>Reset</button>
    </div>
    <p>
        {flips.length} flips, {heads} heads:
        <strong>{flips.length ? (heads / flips.length).toFixed(3) : '—'}</strong>
    </p>
    <div class="bar">
        <div style:width="{flips.length ? (100 * heads) / flips.length : 50}%"></div>
    </div>
    <canvas
        bind:this={canvas}
        width="600"
        height="160"
        aria-label="The proportion of heads after each flip, against one half"
    ></canvas>
</div>

<style>
    .flipper {
        margin: 1.5em 0;
        padding: 1em 1.2em;
        border: 1px solid var(--rule);
        border-radius: var(--radius);
        background: var(--paper-raised);
        font-family: var(--font-ui);
        font-size: 0.9rem;
        text-align: left;
    }

    .buttons {
        display: flex;
        gap: 0.5rem;
    }

    button {
        padding: 0.35rem 0.8rem;
        border: 1px solid var(--rule-strong);
        border-radius: 8px;
        background: var(--paper);
        cursor: pointer;
    }

    .bar {
        height: 6px;
        border-radius: 3px;
        background: var(--rule);
        overflow: hidden;
    }

    canvas {
        display: block;
        width: 100%;
        height: auto;
        margin-top: 0.8em;
        border-bottom: 1px solid var(--rule);
    }

    .bar div {
        height: 100%;
        background: var(--accent);
        transition: width 200ms;
    }
</style>
