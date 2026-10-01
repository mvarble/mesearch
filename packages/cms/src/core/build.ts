import type { KatexMacros } from '@mvarble/mesearch-markdown/katex';

import { Store, type DocRecord } from './store.ts';
import { scan, type SourceFile } from './source.ts';
import { resolveReferences, type Resolver } from './resolver.ts';

// A kind of file the content layer understands, registered in passes.
//
// The split exists because a reference can only be recorded once the thing it
// points at is known: every document contributes its own nodes first, and only
// then is any document asked to resolve what it mentions. That makes the result
// independent of the order documents happen to be visited.
export interface Doctype {
    name: string;
    claims(file: SourceFile): boolean;
    // Pass one: what this file contributes --- documents, pages, anchors.
    initialize?(store: Store, file: SourceFile): void;
    // Pass two: what this file points at. Every node already exists. Without
    // this hook every registered document has its references resolved.
    crossReference?(store: Store, file: SourceFile): void;
    // Pass three, once per build: whatever is derived from the whole site.
    finalize?(store: Store): void;
}

export interface Preset {
    name: string;
    // The directory content is scanned from, relative to the root.
    contentDir: string;
    // Which of the files under it the content layer reads.
    include(id: string): boolean;
    doctypes: Doctype[];
    // In the order a link is offered to them; the first to claim it wins.
    resolvers: Resolver[];
    // The deepest heading recorded, and the rendered `id` stamped on.
    headingDepth: number;
    // The module, exporting `bind(snapshot)`, that turns a snapshot into the
    // queries a site's `load` functions call.
    runtime: string;
    // The serialisable part of the store that `bind` is handed.
    snapshot(store: Store): unknown;
}

export interface BuildOptions {
    root: string;
    preset: Preset;
    // Folded under every document's own.
    macros?: KatexMacros;
}

export function buildStore({ root, preset, macros }: BuildOptions): Store {
    const store = new Store(root, macros);
    const files = scan(root, preset.contentDir, preset.include).map((id) => store.file(id));
    const claimed = files.map((file) => ({
        file,
        doctype: preset.doctypes.find((doctype) => doctype.claims(file)),
    }));

    for (const { file, doctype } of claimed) doctype?.initialize?.(store, file);
    for (const { file, doctype } of claimed) {
        if (doctype?.crossReference) doctype.crossReference(store, file);
        else defaultCrossReference(store, preset, file);
    }
    for (const doctype of preset.doctypes) doctype.finalize?.(store);
    return store;
}

// Anything the first pass registered gets its references resolved --- a page,
// and anything shown on one.
export function defaultCrossReference(store: Store, preset: Preset, file: SourceFile) {
    const doc = store.docs.get(file.id);
    if (!doc || store.pathnameOf(doc.id) === undefined) return;
    resolveReferences(store, doc, file, preset.resolvers);
}

// A document with nothing of its own yet, for doctypes to fill in.
export const docRecord = (
    id: string,
    doctype: string,
    fields: Partial<Omit<DocRecord, 'id' | 'doctype'>> = {},
): DocRecord => ({
    id,
    doctype,
    scope: fields.scope ?? id,
    host: fields.host,
    macroParent: fields.macroParent,
    macros: fields.macros ?? {},
    headings: fields.headings ?? [],
});
