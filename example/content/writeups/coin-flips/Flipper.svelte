<script>
    // Flips a fair coin on demand and tracks the running proportion of heads.
    let flips = $state([]);
    let heads = $derived(flips.filter(Boolean).length);

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

    .bar div {
        height: 100%;
        background: var(--accent);
        transition: width 200ms;
    }
</style>
