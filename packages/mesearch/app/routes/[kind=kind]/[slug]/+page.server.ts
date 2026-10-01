import { error } from '@sveltejs/kit';
import type { OutlineEntry } from '@mvarble/mesearch-cms/presets/mesearch';
import { cms } from '$cms';

import { inlineHtml, toIndexEntry, toRef } from '$lib/server/refs';
import type { TocEntry } from '$lib/types';

export const entries = () =>
    [...cms.documents.list(), ...cms.sequences.list()].map((doc) => {
        const [kind, slug] = doc.key.split('/') as [string, string];
        return { kind, slug };
    });

export const load = ({ params }) => {
    const key = `${params.kind}/${params.slug}`;
    const doc = cms.documents.get(key);
    if (!doc) error(404, `There is no document at ${key}.`);

    const toc = (entry: OutlineEntry): TocEntry => ({
        slug: entry.slug,
        depth: entry.depth,
        titleHtml: inlineHtml(doc, entry.title),
        children: entry.children.map(toc),
    });

    // Where the document sits in each sequence that includes it.
    const memberships = cms.sequences.containing(key).map(({ sequence, index, documents }) => ({
        sequence: toRef(sequence),
        index,
        documents: documents.map(toRef),
    }));

    // A sequence's own page lists what it orders.
    const contents =
        doc.kind == 'sequence'
            ? (cms.sequences.get(key)?.documents ?? [])
                  .map((member) => cms.documents.get(member))
                  .filter((member) => !!member)
                  .map(toIndexEntry)
            : [];

    return {
        doc: toIndexEntry(doc),
        filename: doc.filename,
        toc: cms.outline(doc.filename).map(toc),
        prerequisites: cms.prerequisites(key).map(toRef),
        dependents: cms.dependents(key).map(toRef),
        related: cms.related(key).map(toRef),
        memberships,
        contents,
    };
};
