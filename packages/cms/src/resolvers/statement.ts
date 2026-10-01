import type { Resolver } from '../core/resolver.ts';
import { parseReference, resolveReferenceScope, unresolvedReference } from '../core/scopes.ts';

export interface StatementTarget {
    scope: string;
    slug: string;
    label: string;
    kind: string;
    full: string;
    url: string;
}

const capitalizeWords = (text: string) =>
    text
        .split(' ')
        .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
        .join(' ');

export interface StatementOptions {
    // The URL of a statement on its page; `/<page>#<slug>` by default.
    url?(page: string, slug: string): string;
}

// `[%full](statement:slug)` refers to a numbered statement --- a theorem, a
// lemma --- substituting `%label`, `%kind` and `%full` ('Theorem 1.2') into the
// link text.
export function statements(options: StatementOptions = {}): Resolver<StatementTarget> {
    const url = options.url ?? ((page, slug) => `/${page}#${slug}`);
    return {
        name: 'statement',
        matchLink: (href) =>
            href.startsWith('statement:') ? href.slice('statement:'.length) : undefined,
        resolve(store, doc, written) {
            const parsed = parseReference(written);
            const scope = resolveReferenceScope(store, doc.scope, parsed);
            if (scope === undefined) return undefined;
            const anchor = store.anchor('statement', scope, parsed.slug);
            if (!anchor) return undefined;
            const kind = capitalizeWords(String(anchor.data?.kind ?? ''));
            return {
                scope: anchor.scope,
                slug: anchor.slug,
                label: anchor.label,
                kind,
                full: `${kind} ${anchor.label}`,
                url: url(anchor.page, anchor.slug),
            };
        },
        unresolved: (store, doc, written) =>
            unresolvedReference(store, doc.id, doc.scope, 'statement', written),
        rewriteLink(node, target) {
            node.url = target.url;
            const [child] = node.children;
            if (node.children.length != 1 || child?.type != 'text') return;
            child.value = (child.value ?? '')
                .replaceAll('%label', target.label)
                .replaceAll('%kind', target.kind)
                .replaceAll('%full', target.full);
        },
    };
}
