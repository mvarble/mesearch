import type { SourceFile } from '../core/source.ts';
import { registerStatement } from '../core/statements.ts';
import type { Store } from '../core/store.ts';
import { walkDocument, type WalkTarget } from '../core/walk.ts';
import { TAG } from '../resolvers/equation.ts';

export interface NumberDocumentOptions {
    // The page the document is shown on.
    page: string;
    // What its numbers are unique within, and the document that owns the page:
    // the document itself by default.
    scope?: string;
    host?: string;
    // Whether an import specifier, written in `from`, is the component a
    // statement is spread into.
    isComponent(specifier: string, from: string): boolean;
    // The next label in the run. A count from one by default; pass one in to
    // carry a run across several documents.
    next?: () => string;
    // The `id` a statement with this slug is rendered with; its slug by default.
    statementId?: (slug: string) => string;
}

// Numbers a document's equations and the statements it shows --- and anything
// inside those, recursively --- in the order a reader meets them, as one run.
export function numberDocument(store: Store, file: SourceFile, options: NumberDocumentOptions) {
    let count = 0;
    const next = options.next ?? (() => String(++count));
    const walk = (file: SourceFile, target: WalkTarget) =>
        walkDocument(file, target, {
            isComponent: options.isComponent,
            onMath(tex, at) {
                for (const [, slug] of tex.matchAll(TAG)) {
                    store.addAnchor({
                        kind: 'equation',
                        scope: at.scope,
                        slug: slug!,
                        label: next(),
                        source: at.doc,
                        page: at.page,
                    });
                }
            },
            onImport(id, at) {
                registerStatement(store, id, at, { next, walk, id: options.statementId });
            },
        });
    walk(file, {
        doc: file.id,
        scope: options.scope ?? file.id,
        page: options.page,
        host: options.host ?? file.id,
    });
}
