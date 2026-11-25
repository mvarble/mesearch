import { error } from '@sveltejs/kit';
import { cms } from '$cms';
import { citationLabel } from '@mvarble/mesearch-cms/runtime';
import { referenceHtml } from '@mvarble/mesearch-ui/server';

import { resolve } from '$app/paths';
import { hrefOf, linkOf, type DocumentLink, type SiteDocument } from '../documents';
import { qualifiedTitle } from './title';
import { ARCHIVE, MATH, MATH_PARTS, SITE, TRACKS } from '$site';
import { hooks } from '$site/server';

export interface Crumb {
    title: string;
    href: string;
}

export interface Reference {
    key: string;
    label: string;
    html: string;
}

// Everything a document's page shows besides its own body, which `+page.ts` attaches as a
// component. The lists are links, kept small: they travel with the page as data.
export function documentData(key: string) {
    const doc = cms.get(key);
    if (!doc) error(404, `No document ${key}.`);
    const links = (records: SiteDocument[]) => records.map(linkOf);
    const qualified = (records: SiteDocument[]) =>
        records.map((record) => ({ ...linkOf(record), title: qualifiedTitle(record) }));
    const keys = (list: string[]) =>
        list.flatMap((k) => {
            const record = cms.get(k);
            return record ? [linkOf(record)] : [];
        });

    // What an entry amended, as links: a document by its own key, and a statement by the entry it
    // belongs to, each once.
    const amended = (list: string[]) => {
        const records = [
            ...new Set(
                list.map((k) => (k.includes('/statements/') ? k.split('/statements/')[0]! : k)),
            ),
        ].flatMap((k) => cms.get(k) ?? []);
        return qualified(records);
    };

    let crumbs: Crumb[];
    let prev: DocumentLink | undefined;
    let next: DocumentLink | undefined;
    if (doc.kind == 'page') {
        const track = TRACKS.find((t) => t.id == doc.track)!;
        crumbs = [{ title: track.title, href: resolve('/[track=track]', { track: track.id }) }];
        const neighbours = cms.pages.neighbours(key);
        prev = neighbours.prev && linkOf(neighbours.prev);
        next = neighbours.next && linkOf(neighbours.next);
    } else if (doc.kind == 'math') {
        const part = MATH_PARTS.find((p) => p.id == doc.part);
        crumbs = [
            { title: MATH.title, href: resolve('/math') },
            ...(part ? [{ title: part.title, href: `${resolve('/math')}#${part.id}` }] : []),
        ];
        // Notes in parts are read in order, one after another; notes without are not.
        if (MATH_PARTS.length) {
            const neighbours = cms.math.neighbours(key);
            prev = neighbours.prev && linkOf(neighbours.prev);
            next = neighbours.next && linkOf(neighbours.next);
        }
    } else if (doc.kind == 'entry') {
        crumbs = [{ title: ARCHIVE.title, href: resolve('/archive') }];
    } else {
        const entry = cms.get(doc.entry)!;
        crumbs = [
            { title: ARCHIVE.title, href: resolve('/archive') },
            { title: entry.title, href: hrefOf(entry.key) },
        ];
        const siblings = cms.archive.documents(doc.entry);
        const i = siblings.findIndex((sibling) => sibling.key == key);
        prev = siblings[i - 1] && linkOf(siblings[i - 1]!);
        next = siblings[i + 1] && linkOf(siblings[i + 1]!);
    }

    const references: Reference[] = cms.bibliography(key).map((citation) => ({
        key: citation.key,
        label: citationLabel(citation),
        html: referenceHtml(citation),
    }));

    return {
        doc,
        headings: cms.headings(doc.filename),
        crumbs,
        prev,
        next,
        references,
        // Both named as the map names them, since an archive document's own title ("Mathematics")
        // says nothing of the entry it belongs to.
        prerequisites: qualified(cms.prerequisites(key)),
        dependents: qualified(cms.dependents(key)),
        // A page: the development behind it. An entry: what it changed (its pages, and whatever
        // else the site's `entryChanges` hook lists, as skoro's crates), and what it revises or
        // is revised by. An entry's document: its siblings.
        entries: doc.kind == 'page' ? keys(doc.entries) : [],
        pages: doc.kind == 'entry' ? keys(doc.pages) : [],
        changes: doc.kind == 'entry' ? (hooks.entryChanges?.(doc) ?? []) : [],
        revises: doc.kind == 'entry' ? keys(doc.revises) : [],
        revisedBy: doc.kind == 'entry' ? keys(doc.revisedBy) : [],
        // An entry: the documents of done entries whose references it brought up to date. An
        // entry or one of its documents: the later entries that did so to it.
        amends: doc.kind == 'entry' ? amended(doc.amends) : [],
        amendedBy: doc.kind == 'entry' || doc.kind == 'entry-document' ? keys(doc.amendedBy) : [],
        documents: doc.kind == 'entry' ? links(cms.archive.documents(key)) : [],
        source: `${SITE.repo}/blob/${SITE.branch}/site/${doc.filename}`,
    };
}

export type DocumentData = ReturnType<typeof documentData>;
