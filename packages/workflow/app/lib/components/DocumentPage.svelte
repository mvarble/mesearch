<script lang="ts">
    import type { Component } from 'svelte';

    import { markdownHrefOf, type DocumentLink } from '../documents';
    import type { DocumentData } from '../server/document';
    import { KIND_LABELS, SITE, STATUS_LABELS } from '$site';
    import { renderMixed } from '../tex';
    import CopyCode from './CopyCode.svelte';
    import Icon from './Icon.svelte';
    import LinkList from './LinkList.svelte';
    import PrevNext from './PrevNext.svelte';
    import StageRail from './StageRail.svelte';
    import Timeline from './Timeline.svelte';
    import Toc from './Toc.svelte';

    let { data }: { data: DocumentData & { component: Component } } = $props();
    let body = $state<HTMLElement>();

    const doc = $derived(data.doc);
    const date = (d: Date) => d.toISOString().slice(0, 10);
    const tex = (text: string) => renderMixed(text, doc.katexMacros as Record<string, string>);
    const any = (...lists: DocumentLink[][]) => lists.some((list) => list.length);
    // How much of an entry's summary "How this came to be" and "What it revises" show: an entry
    // without one has its whole first paragraph, which is more than a list needs.
    const EXCERPT = 200;
</script>

<svelte:head>
    <title>{doc.title} · {SITE.name}</title>
    <meta property="og:title" content="{doc.title} · {SITE.name}" />
    <meta name="description" content={doc.summary} />
    <meta property="og:description" content={doc.summary} />
    <link rel="alternate" type="text/markdown" href={markdownHrefOf(doc.key)} />
</svelte:head>

<div class="doc-layout">
    <article class="doc doc-{doc.kind}">
        <header class="doc-header">
            <p class="breadcrumb">
                {#each data.crumbs as crumb, i (crumb.href)}
                    {#if i}<span class="sep" aria-hidden="true">/</span>{/if}<a href={crumb.href}
                        >{@html tex(crumb.title)}</a
                    >
                {/each}
            </p>
            <h1>{@html tex(doc.title)}</h1>
            {#if doc.summary}<p class="lede">{@html tex(doc.summary)}</p>{/if}
            {#if doc.kind == 'entry'}
                <p class="doc-meta">
                    <span class="chip">{KIND_LABELS[doc.workflow?.kind ?? ''] ?? 'Entry'}</span>
                    <span class="chip status-{doc.status}">{STATUS_LABELS[doc.status]}</span>
                    {#if doc.workflow?.started}<span>Started {doc.workflow.started}</span>{/if}
                    {#if doc.workflow?.finished}<span>· finished {doc.workflow.finished}</span>{/if}
                </p>
            {:else if doc.kind != 'page'}
                <p class="doc-meta">
                    <span>Updated {date(doc.updated)}</span>
                    <span>· {doc.readingMinutes} min read</span>
                </p>
            {/if}
            {#if data.prerequisites.length}
                <div class="doc-builds-on">
                    <span class="label">Builds on</span>
                    <LinkList links={data.prerequisites} inline />
                </div>
            {/if}
        </header>

        {#if doc.kind == 'entry' && data.revisedBy.length}
            <aside class="callout callout-note revised">
                <p class="callout-title">Revised</p>
                <p>The story this entry tells has since been changed by:</p>
                <LinkList links={data.revisedBy} />
            </aside>
        {/if}

        {#if data.amendedBy.length}
            <aside class="callout callout-note revised">
                <p class="callout-title">Amended</p>
                <p>
                    {doc.kind == 'entry' ? 'This entry is' : 'This document is'} kept as it was approved,
                    but for references in it that have since been brought up to date by:
                </p>
                <LinkList links={data.amendedBy} />
            </aside>
        {/if}

        <div class="prose" bind:this={body}>
            <data.component />
        </div>
        <CopyCode root={body} />

        {#if data.references.length}
            <section class="references" aria-labelledby="references">
                <h2 id="references">References</h2>
                <ol>
                    {#each data.references as reference (reference.key)}
                        <li id="cite:{reference.key}">
                            <span class="reference-label">[{reference.label}]</span>
                            {@html reference.html}
                        </li>
                    {/each}
                </ol>
            </section>
        {/if}

        {#if doc.kind == 'entry'}
            <section class="doc-context">
                {#if doc.workflow}
                    <h2>Where it stands</h2>
                    <StageRail
                        kind={doc.workflow.kind}
                        stage={doc.workflow.stage}
                        approvals={doc.workflow.approvals as Record<string, { stale?: boolean }>}
                    />
                {/if}
                <h2>Documents</h2>
                {#if data.documents.length}
                    <LinkList links={data.documents} cards />
                {:else}
                    <p class="muted">Nothing is written yet.</p>
                {/if}
                {#if data.pages.length || data.changes.length || data.amends.length}
                    <h2>What it changed</h2>
                {/if}
                {#if data.pages.length}
                    <p>The pages that say what this entry made true:</p>
                    <LinkList links={data.pages} />
                {/if}
                {#each data.changes as group (group.intro)}
                    <p>{group.intro}</p>
                    <ul class="link-list">
                        {#each group.links as link (link.href)}
                            <li>
                                <a href={link.href}
                                    >{#if link.code}<code>{link.label}</code
                                        >{:else}{link.label}{/if}</a
                                >
                            </li>
                        {/each}
                    </ul>
                {/each}
                {#if data.amends.length}
                    <p>The documents of finished entries whose references it brought up to date:</p>
                    <LinkList links={data.amends} />
                {/if}
                {#if data.revises.length}
                    <h2>What it revises</h2>
                    <LinkList links={data.revises} excerpt={EXCERPT} />
                {/if}
                {#if doc.workflow?.events.length}
                    <h2>History</h2>
                    <Timeline events={doc.workflow.events} />
                {/if}
            </section>
        {:else if any(data.entries, data.dependents)}
            <section class="doc-context">
                {#if data.entries.length}
                    <h2>How this came to be</h2>
                    <p>The development behind this page, newest first:</p>
                    <LinkList links={data.entries} excerpt={EXCERPT} />
                {/if}
                {#if data.dependents.length}
                    <h2>Built on by</h2>
                    <LinkList links={data.dependents} />
                {/if}
            </section>
        {/if}

        <footer class="doc-footer">
            <a href={data.source} rel="external">
                <Icon name="github" size={14} /> Edit this page
            </a>
            <a href={markdownHrefOf(doc.key)}>
                <Icon name="file" size={14} /> View as Markdown
            </a>
        </footer>
        <PrevNext prev={data.prev} next={data.next} />
    </article>

    <aside class="doc-aside">
        <Toc headings={data.headings} />
    </aside>
</div>
