import type { Resolver } from '../core/resolver.ts';
import { parseReference, resolveReferenceScope, unresolvedReference } from '../core/scopes.ts';

export const TAG = /@tag\(([a-zA-Z-_0-9]+)\)/g;

export interface EquationTarget {
    scope: string;
    slug: string;
    label: string;
    url: string;
}

export interface EquationOptions {
    // The URL of an equation on its page; `/<page>#eq:<slug>` by default.
    url?(page: string, slug: string): string;
}

// `$$ ... @tag(slug) $$` numbers an equation, and `[](eq:slug)` refers to one
// as `(label)`. Both are scoped like statements: a bare slug means one within
// the referencing document's scope, `scope-slug/slug` reaches into another.
export function equations(options: EquationOptions = {}): Resolver<EquationTarget> {
    const url = options.url ?? ((page, slug) => `/${page}#eq:${slug}`);
    return {
        name: 'equation',
        matchLink: (href) => (href.startsWith('eq:') ? href.slice('eq:'.length) : undefined),
        matchMath: (tex) => [...tex.matchAll(TAG)].map((match) => match[1]!),
        resolve(store, doc, written) {
            const parsed = parseReference(written);
            const scope = resolveReferenceScope(store, doc.scope, parsed);
            if (scope === undefined) return undefined;
            const anchor = store.anchor('equation', scope, parsed.slug);
            if (!anchor) return undefined;
            return {
                scope: anchor.scope,
                slug: anchor.slug,
                label: anchor.label,
                url: url(anchor.page, anchor.slug),
            };
        },
        unresolved: (store, doc, written) =>
            unresolvedReference(store, doc.id, doc.scope, 'equation', written),
        rewriteLink(node, target) {
            node.url = target.url;
            node.children = [{ type: 'text', value: `(${target.label})` }];
        },
        // `@tag(slug)` becomes `\tag{label}`, both in the TeX and in the copy
        // `remark-math` keeps for rendering, and the equation gets the `id` a
        // reference links to.
        rewriteMath(node, written, target) {
            const tag = `@tag(${written})`;
            const replacement = `\\tag{${target.label}}`;
            if (!node.value.includes(tag)) return;
            node.value = node.value.replaceAll(tag, replacement);
            const data = node.data as
                | { hChildren?: Array<{ value?: unknown }>; hProperties?: Record<string, unknown> }
                | undefined;
            const child = data?.hChildren?.length == 1 ? data.hChildren[0] : undefined;
            if (child && typeof child.value == 'string') {
                child.value = child.value.replaceAll(tag, replacement);
                if (data?.hProperties && typeof data.hProperties == 'object') {
                    data.hProperties.id = `eq:${target.slug}`;
                }
            }
        },
    };
}
