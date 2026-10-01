<script lang="ts">
    import { bestMatch, highlight } from '../fuzzy.js';
    import { kindLabel } from '../settings.js';
    import type { SearchEntry } from '../types.js';

    // Search across the whole library from anywhere: `/` or Ctrl/⌘-K opens
    // it, arrows move, Enter goes, Escape closes. Documents match on their
    // titles and summaries; a heading inside one is its own result, so a
    // search can land on a section.
    //
    // `index` is where the entries come from: the URL of a JSON array of
    // them, fetched the first time the palette opens, or a function that
    // returns them. `navigate` follows a result --- SvelteKit's `goto`, say;
    // without it the browser navigates the ordinary way.
    let {
        index,
        navigate = (url: string) => location.assign(url),
        open = $bindable(false),
    }: {
        index: string | (() => Promise<SearchEntry[]>);
        navigate?: (url: string) => unknown;
        open?: boolean;
    } = $props();

    let entries = $state<SearchEntry[]>([]);
    let loading: Promise<void> | undefined;
    $effect(() => {
        if (open && !loading) {
            const load =
                typeof index == 'string'
                    ? () => fetch(index).then((response) => response.json())
                    : index;
            loading = load()
                .then((loaded: SearchEntry[]) => void (entries = loaded))
                .catch(() => (loading = undefined));
        }
    });

    let dialog: HTMLDialogElement | undefined = $state();
    let input: HTMLInputElement | undefined = $state();
    let query = $state('');
    let active = $state(0);

    interface Result {
        key: string;
        kind: SearchEntry['kind'];
        title: string;
        context?: string;
        contextHtml?: string;
        url: string;
        score: number;
        indices: number[];
    }

    let results = $derived.by((): Result[] => {
        if (!query.trim()) {
            return entries.slice(0, 8).map((entry) => ({
                key: entry.key,
                kind: entry.kind,
                title: entry.title,
                contextHtml: entry.summaryHtml,
                url: entry.url,
                score: 0,
                indices: [],
            }));
        }
        const out: Result[] = [];
        for (const entry of entries) {
            const match = bestMatch(query, [
                [entry.title, 1.6],
                [entry.summary, 0.5],
            ]);
            if (match) {
                out.push({
                    key: entry.key,
                    kind: entry.kind,
                    title: entry.title,
                    contextHtml: entry.summaryHtml,
                    url: entry.url,
                    score: match.score,
                    indices: match.field == 0 ? match.indices : [],
                });
            }
            for (const heading of entry.headings) {
                const hit = bestMatch(query, [[heading.title, 1.1]]);
                if (hit) {
                    out.push({
                        key: `${entry.key}#${heading.slug}`,
                        kind: entry.kind,
                        title: heading.title,
                        context: entry.title,
                        url: `${entry.url}#${heading.slug}`,
                        score: hit.score,
                        indices: hit.indices,
                    });
                }
            }
        }
        // Once something matches well, scattered letters elsewhere are noise.
        const best = Math.max(0, ...out.map((result) => result.score));
        return out
            .filter((result) => result.score >= best * 0.35)
            .sort((a, b) => b.score - a.score)
            .slice(0, 12);
    });

    $effect(() => {
        void results;
        active = 0;
    });

    $effect(() => {
        if (!dialog) return;
        if (open && !dialog.open) {
            dialog.showModal();
            input?.select();
        } else if (!open && dialog.open) {
            dialog.close();
        }
    });

    function go(result: Result | undefined) {
        if (!result) return;
        open = false;
        query = '';
        void navigate(result.url);
    }

    function onkeydown(event: KeyboardEvent) {
        if (event.key == 'ArrowDown') {
            active = Math.min(active + 1, results.length - 1);
            event.preventDefault();
        } else if (event.key == 'ArrowUp') {
            active = Math.max(active - 1, 0);
            event.preventDefault();
        } else if (event.key == 'Enter') {
            go(results[active]);
            event.preventDefault();
        }
    }

    // Opening shortcuts, from anywhere but a text field.
    function onwindowkeydown(event: KeyboardEvent) {
        const target = event.target as HTMLElement | null;
        const typing = target?.closest('input, textarea, [contenteditable="true"]');
        if ((event.key == 'k' || event.key == 'K') && (event.metaKey || event.ctrlKey)) {
            open = !open;
            event.preventDefault();
        } else if (event.key == '/' && !typing && !open) {
            open = true;
            event.preventDefault();
        }
    }
</script>

<svelte:window onkeydown={onwindowkeydown} />

<dialog
    bind:this={dialog}
    class="palette"
    aria-label="Search the library"
    onclose={() => (open = false)}
    onclick={(event) => {
        if (event.target == dialog) open = false;
    }}
>
    <div class="box">
        <label class="field">
            <span class="visually-hidden">Search</span>
            <input
                bind:this={input}
                bind:value={query}
                {onkeydown}
                type="search"
                placeholder="Search titles, summaries and sections…"
                autocomplete="off"
                spellcheck="false"
                role="combobox"
                aria-expanded="true"
                aria-controls="palette-results"
                aria-activedescendant={results[active] ? `palette-${active}` : undefined}
            />
            <kbd>esc</kbd>
        </label>
        <ul id="palette-results" class="results" role="listbox">
            {#each results as result, i (result.key)}
                <li
                    id={`palette-${i}`}
                    role="option"
                    aria-selected={i == active}
                    class:active={i == active}
                    class="kind-{result.kind}"
                >
                    <a
                        href={result.url}
                        onclick={(event) => {
                            event.preventDefault();
                            go(result);
                        }}
                        onmousemove={() => (active = i)}
                    >
                        <span class="kind">{kindLabel(result.kind)}</span>
                        <span class="title">
                            {#each highlight(result.title, result.indices) as part, j (j)}
                                {#if part.hit}<mark>{part.text}</mark>{:else}{part.text}{/if}
                            {/each}
                        </span>
                        {#if result.contextHtml}
                            <span class="context">{@html result.contextHtml}</span>
                        {:else if result.context}
                            <span class="context">{result.context}</span>
                        {/if}
                    </a>
                </li>
            {:else}
                <li class="empty">{entries.length ? `Nothing matches “${query}”.` : 'Loading…'}</li>
            {/each}
        </ul>
    </div>
</dialog>

<style>
    .palette {
        width: min(40rem, calc(100vw - 2rem));
        max-height: min(34rem, calc(100vh - 6rem));
        margin: 12vh auto auto;
        padding: 0;
        border: 1px solid var(--rule-strong);
        border-radius: var(--radius-large);
        background: var(--paper-raised);
        color: var(--ink);
        box-shadow: var(--shadow-strong);
        font-family: var(--font-ui);
        overflow: hidden;
    }

    .palette::backdrop {
        background: rgba(20, 16, 10, 0.32);
        backdrop-filter: blur(2px);
    }

    .box {
        display: flex;
        flex-direction: column;
        max-height: inherit;
    }

    .field {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.9rem 1.1rem;
        border-bottom: 1px solid var(--rule);
    }

    input {
        flex: 1;
        border: none;
        outline: none;
        background: transparent;
        color: var(--ink);
        font: 400 1.05rem / 1.4 var(--font-ui);
    }

    input::-webkit-search-cancel-button {
        display: none;
    }

    kbd {
        font: 500 0.7rem / 1 var(--font-ui);
        color: var(--muted);
        border: 1px solid var(--rule-strong);
        border-radius: 4px;
        padding: 0.2rem 0.35rem;
    }

    .results {
        list-style: none;
        margin: 0;
        padding: 0.4rem;
        overflow-y: auto;
    }

    .results a {
        display: grid;
        grid-template-columns: 5.5rem 1fr;
        grid-template-rows: auto auto;
        column-gap: 0.75rem;
        padding: 0.55rem 0.7rem;
        border-radius: 8px;
        color: inherit;
        text-decoration: none;
    }

    .active a {
        background: var(--kind-soft);
    }

    .kind {
        grid-row: span 2;
        font: 600 0.66rem / 1.9 var(--font-ui);
        letter-spacing: 0.1em;
        text-transform: uppercase;
        color: var(--kind);
    }

    .title {
        font-weight: 550;
        font-size: 0.95rem;
    }

    mark {
        background: none;
        color: var(--kind);
        text-decoration: underline;
        text-underline-offset: 0.15em;
    }

    .context {
        font-size: 0.8rem;
        color: var(--muted);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
    }

    .empty {
        padding: 1.5rem;
        text-align: center;
        color: var(--muted);
        font-size: 0.9rem;
    }
</style>
