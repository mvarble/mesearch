<script lang="ts">
    import {
        Article,
        ArticleHeader,
        Chips,
        Icon,
        Pager,
        Parts,
        References,
        SequenceTrack,
        Toc,
        kindLabel,
    } from '@mvarble/mesearch-ui';
    import site from '$site';
    import { href } from '$lib/format';

    let { data } = $props();
    let doc = $derived(data.doc);

    // Where the document sits: the site, its kind, and each sequence it is in.
    let crumbs = $derived([
        { label: site.title, url: href('') },
        { label: kindLabel(doc.kind) },
        ...data.memberships.map((m) => ({
            label: m.sequence.title,
            url: m.sequence.url,
            note: `${m.index + 1} of ${m.documents.length}`,
        })),
    ]);
</script>

<svelte:head>
    <title>{doc.title} · {site.title}</title>
    {#if doc.summary}<meta name="description" content={doc.summary} />{/if}
</svelte:head>

{#snippet header()}
    <ArticleHeader
        {crumbs}
        titleHtml={doc.titleHtml}
        created={doc.created}
        updated={doc.updated}
        readingMinutes={doc.readingMinutes}
        buildsOn={data.prerequisites}
    />
{/snippet}

{#snippet sequences()}
    {#each data.memberships as membership (membership.sequence.key)}
        <SequenceTrack
            title={membership.sequence.titleHtml}
            url={membership.sequence.url}
            items={membership.documents}
            current={doc.key}
        />
    {/each}
{/snippet}

{#snippet contents(folded: boolean)}
    <Toc entries={data.toc} label={folded ? 'Contents' : 'On this page'} />
{/snippet}

{#snippet footer()}
    {#each data.memberships as membership (membership.sequence.key)}
        <Pager
            label="Through {membership.sequence.title}"
            previous={membership.documents[membership.index - 1]}
            next={membership.documents[membership.index + 1]}
        />
    {/each}
    <section><Chips heading="Leads to" refs={data.dependents} /></section>
    <section><Chips heading="Related" refs={data.related} /></section>
    <a class="back" href="{href('')}#atlas"><Icon name="graph" size={16} /> Back to the map</a>
{/snippet}

<Article
    kind={doc.kind}
    {header}
    {footer}
    left={data.memberships.length ? sequences : undefined}
    right={data.toc.length ? contents : undefined}
    leftLabel={data.memberships.length == 1
        ? `Sequence: ${data.memberships[0]!.sequence.title}`
        : 'Sequences'}
    leftNote={data.memberships.length == 1
        ? `${data.memberships[0]!.index + 1} of ${data.memberships[0]!.documents.length}`
        : undefined}
    after={data.contents.length || data.references.length ? after : undefined}
>
    <data.Content />
</Article>

{#snippet after()}
    <References entries={data.references} />
    {#if data.contents.length}<Parts parts={data.contents} />{/if}
{/snippet}

<style>
    section:empty {
        display: none;
    }

    .back {
        display: inline-flex;
        align-items: center;
        gap: 0.45rem;
        align-self: flex-start;
        font: 500 0.85rem / 1 var(--font-ui);
        color: var(--muted);
        text-decoration: none;
    }

    .back:hover {
        color: var(--accent);
    }
</style>
