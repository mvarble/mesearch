import { docRecord } from './build.ts';
import { Frontmatter } from './frontmatter.ts';
import type { SourceFile } from './source.ts';
import type { Store } from './store.ts';
import type { WalkTarget } from './walk.ts';

// What a statement's compiled module exports as `cms`: everything the
// component it is spread into needs to frame it.
export interface StatementInjection {
    kind: string;
    label: string;
    slug: string;
    pathname: string;
    filename: string;
    // A name of its own, as in "Theorem 3 (Heine--Borel)", when it has one.
    title?: string;
    // The `id` it is rendered with, when that is not its slug.
    id?: string;
}

export interface StatementOptions {
    // The next label in the page's run of statements and equations.
    next(): string;
    // Walks the statement's own contents, which carry on the same run.
    walk(file: SourceFile, target: WalkTarget): void;
    // The `id` a statement with this slug is rendered with; its slug by default.
    id?(slug: string): string;
}

// A document with `type: statement` --- a theorem, a lemma, a definition ---
// rendered inside the page that imports it. It takes the next number, and
// anything it contains keeps counting from there: a statement nested inside
// another does not restart, it belongs to the same run as the page.
export function registerStatement(
    store: Store,
    id: string,
    at: WalkTarget,
    options: StatementOptions,
) {
    let file: SourceFile;
    try {
        file = store.file(id);
    } catch {
        store.error(at.doc, `${at.doc}: imports \`${id}\`, which does not exist.`);
        return;
    }
    const fm = new Frontmatter(store.root, id, file.frontmatter, 'Statement');
    if (fm.raw('type') != 'statement') return;
    const kind = fm.raw('kind');
    if (typeof kind != 'string' || !kind) {
        store.error(id, `${id}: a statement needs a \`kind\`, such as \`theorem\`.`);
        return;
    }
    const title = fm.raw('title');

    const slug = fm.slug();
    const label = options.next();
    // Rendering a statement twice takes two numbers, and only the last label
    // sticks. It is usually an accident: an element such as `<Uniform />` is
    // matched case-insensitively against an imported `uniform` document. The
    // numbering is kept as it is, since published labels depend on it.
    if (store.docs.has(id)) {
        store.error(
            id,
            `${id}: rendered more than once on \`${at.page}\`; each rendering takes a number ` +
                'and the last label wins. (An element whose name matches the import ' +
                'case-insensitively counts as a rendering.)',
        );
    }
    // A statement's macros fold under the page it is shown on, not under a
    // statement that happens to contain it.
    store.addDoc(
        docRecord(id, 'statement', {
            scope: at.scope,
            host: at.host,
            macroParent: at.host,
            macros: fm.katexMacros(),
        }),
    );
    store.addAnchor({
        kind: 'statement',
        scope: at.scope,
        slug,
        label,
        source: id,
        page: at.page,
        data: { kind },
    });
    const injection: StatementInjection = {
        kind,
        label,
        slug,
        pathname: at.page,
        filename: id,
        ...(typeof title == 'string' && title ? { title } : {}),
        ...(options.id ? { id: options.id(slug) } : {}),
    };
    store.inject(id, { ...injection });
    options.walk(file, { doc: id, scope: at.scope, page: at.page, host: at.host });
}
