<script lang="ts">
    import { STAGES, STAGE_LABELS } from '$site';

    // The stages of an entry's kind, and how far it has come along them.
    let {
        kind,
        stage,
        approvals = {},
    }: {
        kind: string;
        stage: string;
        approvals?: Record<string, { stale?: boolean }>;
    } = $props();

    const stateOf = (name: string) => {
        if (name == stage) return 'current';
        if (stage == 'done') return 'approved';
        const approval = approvals[name];
        if (!approval) return 'ahead';
        return approval.stale ? 'reopened' : 'approved';
    };
</script>

<ol class="stage-rail" aria-label="Stages">
    {#each STAGES[kind] ?? [] as name (name)}
        <li class="stage-{stateOf(name)}" aria-current={name == stage ? 'step' : undefined}>
            {STAGE_LABELS[name] ?? name}
        </li>
    {/each}
</ol>
