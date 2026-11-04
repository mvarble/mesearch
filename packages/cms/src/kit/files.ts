import { readBibliography } from '../core/bibtex.ts';
import type { Doctype } from '../core/build.ts';
import type { Frontmatter } from '../core/frontmatter.ts';
import type { Store } from '../core/store.ts';

// Every `.bib` file adds to one bibliography, which `cite:` links draw from.
export function bibtexDoctype(collection = 'citations'): Doctype {
    return {
        name: 'bibtex',
        claims: (file) => file.id.endsWith('.bib'),
        initialize: (store, file) => readBibliography(store, file, collection),
    };
}

// Hands a frontmatter reader's problems to the store, answering whether there
// were none.
export function reportProblems(store: Store, fm: Frontmatter): boolean {
    const valid = fm.valid();
    for (const problem of fm.problems) store.error(fm.filename, problem);
    fm.problems.length = 0;
    return valid;
}

// `<folder>/<name>.md` or `<folder>/<name>.svx`, whichever the content has.
export function findSibling(
    store: Store,
    folder: string,
    name: string,
    extensions = ['md', 'svx'],
): string | undefined {
    for (const extension of extensions) {
        const id = `${folder}/${name}.${extension}`;
        if (store.hasFile(id)) return id;
    }
    return undefined;
}
