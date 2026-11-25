<script lang="ts">
    import {
        Graph,
        type GraphLegend,
        type GraphLink,
        type GraphNode,
        type IndexEntry,
    } from '@mvarble/mesearch-ui';

    import { MAP_TUNING } from '../map';

    // mesearch's map of documents: math notes, and the archive documents that build on them, shown
    // on the Mathematics and Archive pages alike. Solid arrows run from what a document builds on
    // to the document; dashed lines join documents that link to each other. Its colours come from
    // skoro's tokens (`styles/utils/map.css`).
    let {
        nodes,
        links,
        entries,
    }: { nodes: GraphNode[]; links: GraphLink[]; entries: Record<string, IndexEntry> } = $props();

    const legend: GraphLegend = {
        kinds: [
            { kind: 'math', label: 'Math note', shape: 'pill' },
            { kind: 'entry-document', label: 'Archive document', shape: 'card' },
        ],
        solid: 'builds on',
        dashed: 'links to',
        from: 'Builds on',
        to: 'Built on by',
        related: 'Linked',
        empty: 'Notes will appear here as they are written.',
    };
</script>

<div class="document-map">
    <Graph {nodes} {links} {entries} {legend} tuning={MAP_TUNING} />
</div>
