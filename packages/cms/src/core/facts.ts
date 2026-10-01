import type { Store } from './store.ts';

// A digest of everything the markdown plugins and the module injection read for
// a single document --- and nothing else. When a rebuild changes a document's
// facts its compiled module is stale, even if the file itself was not touched:
// inserting one statement renumbers every later one, in other files too.
export function documentFacts(store: Store, id: string): string {
    return JSON.stringify({
        pathname: store.pathnameOf(id) ?? null,
        macros: store.foldedMacros(id),
        refs: store
            .refsOf(id)
            .map(({ resolver, written, target }) => [resolver, written, target])
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        headings: (store.docs.get(id)?.headings ?? []).map(({ depth, title, slug }) => [
            depth,
            title,
            slug,
        ]),
        inject: store.injection(id) ?? null,
    });
}

export function allFacts(store: Store): Map<string, string> {
    const facts = new Map<string, string>();
    for (const id of [...store.docs.keys()].sort()) facts.set(id, documentFacts(store, id));
    return facts;
}

// Documents whose facts differ between two builds, including documents that
// appeared or disappeared.
export function diffFacts(before: Map<string, string>, after: Map<string, string>): string[] {
    const changed: string[] = [];
    for (const [id, facts] of after) if (before.get(id) !== facts) changed.push(id);
    for (const id of before.keys()) if (!after.has(id)) changed.push(id);
    return changed;
}
