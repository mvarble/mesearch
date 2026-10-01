import path from 'node:path';

import type { Resolver } from '../core/resolver.ts';
import type { DocRecord, Store } from '../core/store.ts';

export interface PageTarget {
    pathname: string;
    hash: string;
    formats: Record<string, string>;
    // Where the link should point once rewritten, if it should be rewritten.
    url?: string;
}

export interface PageLinkOptions {
    // Whether a link URL is one to look up at all. Absolute and dot-relative
    // URLs by default.
    match?(url: string): boolean;
    // The pathname and fragment a link URL names, if it names one on the site.
    locate(
        store: Store,
        doc: DocRecord,
        url: string,
    ): { pathname: string; hash: string } | undefined;
    // The URL a resolved link is rewritten to. Left alone when absent.
    url?(pathname: string, hash: string): string;
}

// A link to another page of the site. `%title`, `%label`, `%sequence` and
// `%full` in its text are replaced by what the target page provides.
export function pageLinks(options: PageLinkOptions): Resolver<PageTarget> {
    return {
        name: 'page',
        matchLink: (href) =>
            (options.match ?? ((url) => url.startsWith('/') || url.startsWith('.')))(href)
                ? href
                : undefined,
        resolve(store, doc, written) {
            const location = options.locate(store, doc, written);
            if (!location) return undefined;
            const page = store.pages.get(location.pathname);
            if (!page) return undefined;
            return {
                pathname: page.pathname,
                hash: location.hash,
                formats: page.formats,
                url: options.url?.(page.pathname, location.hash),
            };
        },
        // A link that does not even name a place on the site --- one that
        // climbs out of the content, say --- is left alone without comment.
        unresolved(store, doc, written) {
            const location = options.locate(store, doc, written);
            if (!location) return undefined;
            return `'${location.pathname}${location.hash}' does not resolve to a page in the site (see '${doc.id}').`;
        },
        rewriteLink(node, target) {
            if (target.url !== undefined) node.url = target.url;
            const [child] = node.children;
            if (node.children.length != 1 || child?.type != 'text') return;
            let value = child.value ?? '';
            for (const [name, replacement] of Object.entries(target.formats)) {
                value = value.replaceAll(`%${name}`, replacement);
            }
            child.value = value;
        },
    };
}

// The blog's rule: `/x` is the page at `x`, and `./x` is `x` beneath the page
// the link is written on. The URL itself is left exactly as written.
export function pathnameLinks(): Resolver<PageTarget> {
    return pageLinks({
        locate(store, doc, url) {
            const base = store.pathnameOf(doc.id);
            let pathname: string | undefined;
            if (url.startsWith('/')) pathname = url.slice(1);
            else if (typeof base == 'string' && url.startsWith('.'))
                pathname = path.posix.join(base, url);
            return pathname === undefined ? undefined : { pathname, hash: '' };
        },
    });
}
