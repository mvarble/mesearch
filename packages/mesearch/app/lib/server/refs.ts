import type { MesearchDocument } from '@mvarble/mesearch-cms/presets/mesearch';
import { inlineHtml } from '@mvarble/mesearch-ui/server';
import site from '$site';

import { href, plain } from '$lib/format';
import type { DocumentRef, IndexEntry } from '$lib/types';

// Titles and summaries as HTML, their math rendered with the site's macros
// and the document's own.
const html = (doc: MesearchDocument, text: string) =>
    inlineHtml(text, { ...site.katexMacros, ...doc.katexMacros });

export const toRef = (doc: MesearchDocument): DocumentRef => ({
    key: doc.key,
    kind: doc.kind,
    url: href(doc.key),
    title: plain(doc.title),
    titleHtml: html(doc, doc.title),
});

export const toIndexEntry = (doc: MesearchDocument): IndexEntry => ({
    ...toRef(doc),
    summary: plain(doc.summary),
    summaryHtml: html(doc, doc.summary),
    created: doc.created,
    updated: doc.updated,
    readingMinutes: doc.readingMinutes,
    sequences: doc.sequences,
    descriptionFilename: doc.descriptionFilename,
});

export { html as inlineHtml };
