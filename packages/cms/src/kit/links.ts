import path from 'node:path';

import type { DocRecord, Store } from '../core/store.ts';

export interface FileLinkOptions {
    // Where the documents live, relative to the project root. A page's
    // pathname is its file's path below here.
    contentDir: string;
    // The URL prefix the site is served under, as SvelteKit's `paths.base`:
    // empty, or starting with a slash and not ending in one.
    base?: string;
    // The file names, without extension, that stand for the folder they are
    // in: `concepts/x/index.md` is the page `concepts/x`. `index` by default.
    folderNames?: string[];
    // The file names, without extension, that are the home page when they sit
    // directly in the content directory. None by default.
    homeNames?: string[];
}

export interface FileLinks {
    // Anything that is not an external URL, a bare fragment, a file such as a
    // figure, or a reference another resolver claims.
    match(href: string): boolean;
    // The page a link names: written the way the files sit on disk ---
    // `../other/`, `../../writeups/x/index.md` --- or as a site path
    // (`/concepts/x/`, with or without the base).
    locate(store: Store, doc: Pick<DocRecord, 'id'>, href: string): Location | undefined;
    // The URL of a page, with the base and a trailing slash.
    url(pathname: string, hash?: string): string;
}

interface Location {
    pathname: string;
    hash: string;
}

// Links between documents written as paths on disk, for `pageLinks`: hand it
// the whole object, or use `locate` to build a resolver of your own.
export function fileLinks(options: FileLinkOptions): FileLinks {
    const contentDir = options.contentDir.replace(/\/+$/, '');
    const base = options.base ?? '';
    const folderNames = alternation(options.folderNames ?? ['index']);
    const homeNames = options.homeNames?.length ? alternation(options.homeNames) : undefined;
    const folderFile = new RegExp(`(^|/)(${folderNames})\\.(md|svx)$`);
    const home = new RegExp(`^(\\.${homeNames ? `|${homeNames}` : ''})$`);

    return {
        match: (href) =>
            !!href &&
            !/^[a-z][a-z0-9+.-]*:/i.test(href) &&
            !href.startsWith('#') &&
            !/\.(?!md$|svx$)[a-z0-9]+$/i.test(href.replace(/[?#].*$/, '')),
        locate(_store, doc, href) {
            const hashAt = href.search(/[?#]/);
            const target = hashAt < 0 ? href : href.slice(0, hashAt);
            const hash = hashAt < 0 ? '' : href.slice(hashAt).replace(/^\?[^#]*/, '');
            let rel: string;
            if (target.startsWith('/')) {
                const withoutBase =
                    base && target.startsWith(base + '/') ? target.slice(base.length) : target;
                rel = withoutBase.replace(/^\/+/, '');
            } else {
                const file = path.posix.normalize(
                    path.posix.join(path.posix.dirname(doc.id), target),
                );
                rel = path.posix.relative(contentDir, file);
                if (rel.startsWith('..')) return undefined;
            }
            const pathname = rel
                .replace(/\/+$/, '')
                .replace(folderFile, '')
                .replace(/\.(md|svx)$/, '')
                .replace(home, '');
            return { pathname, hash };
        },
        url: (pathname, hash = '') => `${base}/${pathname ? pathname + '/' : ''}${hash}`,
    };
}

const alternation = (names: string[]) =>
    names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
