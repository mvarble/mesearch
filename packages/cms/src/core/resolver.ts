import type { RootContent } from 'mdast';

import type { DocRecord, Store } from './store.ts';
import type { SourceFile } from './source.ts';

// The parts of an mdast link and math node a resolver rewrites. mdsvex runs an
// older remark than the scanner does, so these are kept to what both share.
export interface LinkNode {
    type: 'link';
    url: string;
    children: Array<{ type: string; value?: string }>;
}

export interface MathNode {
    type: 'math';
    value: string;
    data?: Record<string, unknown>;
}

// One kind of reference a document can make: to a page, an equation, a
// statement, a citation. Resolution happens once per build, in the store; the
// markdown plugin then rewrites each node from what was resolved.
export interface Resolver<T = unknown> {
    name: string;
    // The reference a link URL makes, as written, if it is this resolver's.
    matchLink?(url: string, store: Store, doc: DocRecord): string | undefined;
    // The references a math block makes.
    matchMath?(tex: string): string[];
    resolve(store: Store, doc: DocRecord, written: string): T | undefined;
    // What to report when `resolve` finds nothing; undefined stays quiet.
    unresolved?(store: Store, doc: DocRecord, written: string): string | undefined;
    rewriteLink?(node: LinkNode, target: T): void;
    rewriteMath?(node: MathNode, written: string, target: T): void;
}

// Records every reference a document makes, reporting the ones that resolve to
// nothing. Runs once every document has registered what it contributes, so the
// result does not depend on the order documents were visited in.
export function resolveReferences(
    store: Store,
    doc: DocRecord,
    file: SourceFile,
    resolvers: readonly Resolver[],
) {
    const record = (resolver: Resolver, written: string, report: boolean) => {
        if (store.ref(doc.id, resolver.name, written)) return;
        const target = resolver.resolve(store, doc, written);
        if (target !== undefined) {
            store.addRef(doc.id, { resolver: resolver.name, written, target });
            return;
        }
        const message = report ? resolver.unresolved?.(store, doc, written) : undefined;
        if (message) store.error(doc.id, message);
    };

    const nodes: RootContent[] = file.mdast.children.toReversed();
    while (nodes.length > 0) {
        const node = nodes.pop()!;
        if ('children' in node && Array.isArray(node.children) && node.children.length) {
            nodes.push(...(node.children as RootContent[]).toReversed());
        }
        if (node.type == 'math') {
            for (const resolver of resolvers) {
                for (const written of resolver.matchMath?.(node.value) ?? []) {
                    record(resolver, written, false);
                }
            }
        }
        if (node.type == 'link') {
            const match = matchLink(resolvers, node.url, store, doc);
            if (match) record(match.resolver, match.written, true);
        }
    }
}

export function matchLink(
    resolvers: readonly Resolver[],
    url: string,
    store: Store,
    doc: DocRecord,
): { resolver: Resolver; written: string } | undefined {
    for (const resolver of resolvers) {
        const written = resolver.matchLink?.(url, store, doc);
        if (written !== undefined) return { resolver, written };
    }
    return undefined;
}
