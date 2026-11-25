<script lang="ts">
    import type { OpenEntryData } from '../server/open';
    import { KIND_LABELS, STAGE_COMMANDS } from '$site';
    import StageRail from './StageRail.svelte';

    let { entry }: { entry: OpenEntryData } = $props();
</script>

<article class="open-entry">
    <header>
        <a href={entry.link.href}>{entry.link.title}</a>
        <span class="chip">{KIND_LABELS[entry.kind] ?? entry.kind}</span>
    </header>
    <StageRail kind={entry.kind} stage={entry.stage} approvals={entry.approvals} />
    {#if entry.questions.length}
        <p class="open-count">
            {entry.questions.length == 1
                ? '1 open question keeps'
                : `${entry.questions.length} open questions keep`} this stage from being approved:
        </p>
        <ol class="open-questions">
            {#each entry.questions as question, i (i)}
                <li><a href={question.href}>{question.title}</a></li>
            {/each}
        </ol>
        <p class="muted">
            Answer in the conversation with <code>{STAGE_COMMANDS[entry.stage]}</code>.
        </p>
    {:else}
        <p class="muted">
            Nothing is open. Keep working with <code>{STAGE_COMMANDS[entry.stage]}</code>, or give
            <code>/wf-approve</code> to move on.
        </p>
    {/if}
</article>
