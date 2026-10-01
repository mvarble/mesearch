<script lang="ts">
    import { bestMatch, highlight } from '$lib/fuzzy';
    import { formatDate, href, isoDate, kindLabel } from '$lib/format';
    import type { IndexEntry } from '$lib/types';

    // Every concept and writeup, as a ledger: newest change first, with a
    // fuzzy filter over titles and summaries. Without JavaScript it is the
    // same list in the same order, minus the controls.
    let { entries }: { entries: IndexEntry[] } = $props();

    type Sort = 'updated' | 'created' | 'title';
    type Filter = 'all' | 'concept' | 'writeup';
    let query = $state('');
    let sort = $state<Sort>('updated');
    let filter = $state<Filter>('all');

    const sorts: Array<[Sort, string]> = [
        ['updated', 'Updated'],
        ['created', 'Created'],
        ['title', 'A–Z'],
    ];
    const filters: Array<[Filter, string]> = [
        ['all', 'All'],
        ['concept', 'Concepts'],
        ['writeup', 'Writeups'],
    ];

    let shown = $derived.by(() => {
        const kept = entries.filter((entry) => filter == 'all' || entry.kind == filter);
        if (query.trim()) {
            const matched = kept
                .map((entry) => ({
                    entry,
                    match: bestMatch(query, [
                        [entry.title, 1.6],
                        [entry.summary, 0.6],
                    ]),
                }))
                .filter(({ match }) => match);
            // Once something matches well, scattered letters elsewhere are noise.
            const best = Math.max(0, ...matched.map(({ match }) => match!.score));
            return matched
                .filter(({ match }) => match!.score >= best * 0.35)
                .sort((a, b) => b.match!.score - a.match!.score)
                .map(({ entry, match }) => ({
                    entry,
                    indices: match!.field == 0 ? match!.indices : [],
                }));
        }
        const order = {
            updated: (a: IndexEntry, b: IndexEntry) => b.updated.valueOf() - a.updated.valueOf(),
            created: (a: IndexEntry, b: IndexEntry) => b.created.valueOf() - a.created.valueOf(),
            title: (a: IndexEntry, b: IndexEntry) => a.title.localeCompare(b.title),
        }[sort];
        return kept.toSorted(order).map((entry) => ({ entry, indices: [] as number[] }));
    });

    const dateOf = (entry: IndexEntry) => (sort == 'created' ? entry.created : entry.updated);
</script>

<div class="index">
    <div class="controls needs-js">
        <label class="search">
            <span class="visually-hidden">Filter the index</span>
            <input
                bind:value={query}
                type="search"
                placeholder="Filter by title or summary…"
                autocomplete="off"
            />
        </label>
        <div class="toggles">
            <div class="segmented" role="radiogroup" aria-label="Show">
                {#each filters as [value, label] (value)}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={filter == value}
                        onclick={() => (filter = value)}
                    >
                        {label}
                    </button>
                {/each}
            </div>
            <div class="segmented" role="radiogroup" aria-label="Sort by">
                {#each sorts as [value, label] (value)}
                    <button
                        type="button"
                        role="radio"
                        aria-checked={sort == value}
                        disabled={!!query.trim()}
                        onclick={() => (sort = value)}
                    >
                        {label}
                    </button>
                {/each}
            </div>
        </div>
    </div>

    <ol class="entries">
        {#each shown as { entry, indices } (entry.key)}
            <li class="kind-{entry.kind}">
                <time class="date" datetime={isoDate(dateOf(entry))}
                    >{formatDate(dateOf(entry))}</time
                >
                <div class="text">
                    <p class="eyebrow kind">
                        {kindLabel(entry.kind)}<span class="minutes">
                            · {entry.readingMinutes} min</span
                        >
                    </p>
                    <a class="title" href={href(entry.key)}>
                        {#if indices.length}
                            {#each highlight(entry.title, indices) as part, i (i)}
                                {#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}
                            {/each}
                        {:else}
                            {@html entry.titleHtml}
                        {/if}
                    </a>
                    {#if entry.summaryHtml}<p class="summary">{@html entry.summaryHtml}</p>{/if}
                </div>
            </li>
        {:else}
            <li class="none">
                {entries.length ? `Nothing matches “${query}”.` : 'Nothing has been written yet.'}
            </li>
        {/each}
    </ol>
</div>

<style>
    .controls {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 0.75rem 1rem;
        margin-bottom: 1.25rem;
        font-family: var(--font-ui);
    }

    .search {
        flex: 1 1 16rem;
    }

    input {
        width: 100%;
        padding: 0.6rem 0.9rem;
        border: 1px solid var(--rule-strong);
        border-radius: 10px;
        background: var(--paper-raised);
        color: var(--ink);
        font: 400 0.95rem / 1.3 var(--font-ui);
    }

    input:focus {
        outline: none;
        border-color: var(--accent);
        box-shadow: 0 0 0 3px var(--accent-soft);
    }

    .toggles {
        display: flex;
        flex-wrap: wrap;
        gap: 0.6rem;
    }

    .segmented {
        display: inline-flex;
        padding: 3px;
        border: 1px solid var(--rule);
        border-radius: 10px;
        background: var(--paper-sunken);
    }

    .segmented button {
        border: none;
        border-radius: 7px;
        padding: 0.32rem 0.7rem;
        background: transparent;
        color: var(--muted);
        font: 500 0.8rem / 1.2 var(--font-ui);
        cursor: pointer;
    }

    .segmented button[aria-checked='true'] {
        background: var(--paper-raised);
        color: var(--ink);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .segmented button:disabled {
        opacity: 0.5;
        cursor: default;
    }

    .entries {
        list-style: none;
        margin: 0;
        padding: 0;
        border-top: 1px solid var(--rule);
    }

    .entries li {
        display: grid;
        grid-template-columns: 7.5rem 1fr;
        gap: 1.25rem;
        padding: 1.1rem 0;
        border-bottom: 1px solid var(--rule);
    }

    .date {
        font: 500 0.8rem / 2.1 var(--font-ui);
        color: var(--muted);
        font-variant-numeric: tabular-nums;
    }

    .kind {
        margin: 0 0 0.2rem;
        color: var(--kind);
    }

    .minutes {
        color: var(--faint);
        letter-spacing: 0.04em;
    }

    .title {
        font: 600 1.18rem / 1.3 var(--font-serif);
        color: var(--ink);
        text-decoration: none;
    }

    .title:hover {
        color: var(--kind);
    }

    mark {
        background: var(--kind-soft);
        color: inherit;
        border-radius: 2px;
    }

    .summary {
        margin: 0.35rem 0 0;
        color: var(--ink-soft);
        font-size: 0.98rem;
        line-height: 1.6;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
    }

    .none {
        display: block !important;
        color: var(--muted);
        font-family: var(--font-ui);
        text-align: center;
    }

    @media (max-width: 560px) {
        .entries li {
            grid-template-columns: 1fr;
            gap: 0.2rem;
        }

        .date {
            line-height: 1.4;
            order: 2;
        }
    }
</style>
