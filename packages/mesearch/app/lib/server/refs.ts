import type { MesearchDocument } from '@mvarble/mesearch-cms/presets/mesearch';

import { plain } from '$lib/format';
import type { DocumentRef, IndexEntry } from '$lib/types';
import { inlineHtml } from './inline';

export const toRef = (doc: MesearchDocument): DocumentRef => ({
    key: doc.key,
    kind: doc.kind,
    title: plain(doc.title),
    titleHtml: inlineHtml(doc.title, doc.katexMacros),
});

export const toIndexEntry = (doc: MesearchDocument): IndexEntry => ({
    ...toRef(doc),
    summary: plain(doc.summary),
    summaryHtml: inlineHtml(doc.summary, doc.katexMacros),
    created: doc.created,
    updated: doc.updated,
    readingMinutes: doc.readingMinutes,
    sequences: doc.sequences,
    descriptionFilename: doc.descriptionFilename,
});
