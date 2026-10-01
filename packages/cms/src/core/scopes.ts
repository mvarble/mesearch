import type { Store } from './store.ts';

// A "scope" is the umbrella a slug is unique within: a post, or the root
// document of a sequence. References are resolved within the referencing
// document's scope, so a short slug means the same thing wherever it is written
// inside one piece of writing, and unrelated writing is free to reuse it.

export interface ParsedReference {
    // Present when the reference explicitly names another scope.
    scopeSlug?: string;
    slug: string;
}

// `slug` stays inside the current scope; `some-post/slug` reaches into another.
// Slugs never contain a slash, so the split is unambiguous.
export function parseReference(ref: string): ParsedReference {
    const separator = ref.lastIndexOf('/');
    if (separator < 0) return { slug: ref };
    return {
        scopeSlug: ref.slice(0, separator),
        slug: ref.slice(separator + 1),
    };
}

// The scope a reference should be looked up in, or undefined when an explicit
// scope slug names nothing on the site.
export function resolveReferenceScope(
    store: Store,
    sourceScope: string,
    parsed: ParsedReference,
): string | undefined {
    if (typeof parsed.scopeSlug != 'string') return sourceScope;
    return store.scopes.get(parsed.scopeSlug);
}

// Names a scope the way an author would write it, for error messages.
export const describeScope = (store: Store, scope: string) =>
    store.scopeNames.get(scope) ?? `'${scope}'`;

// The error for a reference that resolved to nothing, with a hint as to why.
export function unresolvedReference(
    store: Store,
    source: string,
    scope: string,
    kind: string,
    ref: string,
): string {
    const { scopeSlug, slug } = parseReference(ref);
    const hint =
        typeof scopeSlug == 'string'
            ? `No post or sequence has the slug '${scopeSlug}'.`
            : `Write '<post-or-sequence-slug>/${slug}' to reach a ${kind} outside it.`;
    return `${source}: '${ref}' does not name a ${kind} in ${describeScope(store, scope)}. ${hint}`;
}
