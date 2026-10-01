import type { KatexMacros } from '@mvarble/mesearch-markdown/katex';

import type { Heading } from '../model/outline.ts';
import { SourceFile } from './source.ts';

// A markdown document the content layer knows about.
export interface DocRecord {
    // Its path relative to the project root.
    id: string;
    doctype: string;
    // The document whose slugs this one's references are resolved among: a
    // post, the root of a sequence, or the document itself.
    scope: string;
    // The document whose page this one is rendered on, when it has no page of
    // its own: an imported statement, a description shown on a listing.
    host?: string;
    // The document whose macros are folded under this one's.
    macroParent?: string;
    // The KaTeX macros its own frontmatter declares.
    macros: KatexMacros;
    // Its own headings, in order, down to the depth the site collects.
    headings: Heading[];
}

// A URL on the site, always backed by a document.
export interface PageRecord {
    // Without leading or trailing slashes; '' is the home page.
    pathname: string;
    doc: string;
    // The values a link to this page may substitute into its text, by name:
    // `[%title](/posts/x)` reads `formats.title`.
    formats: Record<string, string>;
}

// Something on a page that a reference can point at by slug.
export interface Anchor {
    kind: string;
    scope: string;
    slug: string;
    label: string;
    // The document that defines it, and the page that shows it.
    source: string;
    page: string;
    data?: Record<string, unknown>;
}

export interface ResolvedRef {
    resolver: string;
    // The reference as written, which is what the markdown plugin looks the
    // target back up by.
    written: string;
    target: unknown;
}

export interface Diagnostic {
    file: string;
    message: string;
}

const anchorKey = (kind: string, scope: string, slug: string) => `${kind}\0${scope}\0${slug}`;
const refKey = (resolver: string, written: string) => `${resolver}\0${written}`;

// Everything the content layer knows, rebuilt from scratch on every scan.
//
// Rebuilding is cheap and is the only way stale entries for renamed or deleted
// content disappear; it also makes the result independent of which file
// happened to change. Nothing here is incremental on purpose.
export class Store {
    readonly root: string;
    readonly siteMacros: KatexMacros;
    readonly docs = new Map<string, DocRecord>();
    readonly pages = new Map<string, PageRecord>();
    readonly anchors = new Map<string, Anchor>();
    readonly diagnostics: Diagnostic[] = [];
    // Scope documents by the slug an author writes to reach into them, and the
    // way an author would name them in an error message.
    readonly scopes = new Map<string, string>();
    readonly scopeNames = new Map<string, string>();
    // Whatever a preset keeps that the generic tables do not cover: posts,
    // sequences, citations, the graph. Insertion order is kept.
    private readonly collections = new Map<string, Map<string, unknown>>();
    private readonly pageByDoc = new Map<string, string>();
    private readonly refs = new Map<string, Map<string, ResolvedRef>>();
    private readonly files = new Map<string, SourceFile>();
    private readonly injections = new Map<string, Record<string, unknown>>();

    constructor(root: string, siteMacros: KatexMacros = {}) {
        this.root = root;
        this.siteMacros = siteMacros;
    }

    // The parsed file behind an id, read on first use.
    file(id: string): SourceFile {
        let file = this.files.get(id);
        if (!file) {
            file = new SourceFile(this.root, id);
            this.files.set(id, file);
            const problem = file.frontmatterProblem;
            if (problem) this.error(id, problem);
        }
        return file;
    }

    hasFile(id: string): boolean {
        return this.files.has(id);
    }

    addDoc(doc: DocRecord): DocRecord {
        this.docs.set(doc.id, doc);
        return doc;
    }

    addPage(page: PageRecord): PageRecord {
        this.pages.set(page.pathname, page);
        this.pageByDoc.set(page.doc, page.pathname);
        return page;
    }

    // The page a document is shown on: its own, or its host's.
    pathnameOf(id: string): string | undefined {
        const own = this.pageByDoc.get(id);
        if (own !== undefined) return own;
        const host = this.docs.get(id)?.host;
        return host && host != id ? this.pathnameOf(host) : undefined;
    }

    ownPathname(id: string): string | undefined {
        return this.pageByDoc.get(id);
    }

    addAnchor(anchor: Anchor) {
        this.anchors.set(anchorKey(anchor.kind, anchor.scope, anchor.slug), anchor);
    }

    anchor(kind: string, scope: string, slug: string): Anchor | undefined {
        return this.anchors.get(anchorKey(kind, scope, slug));
    }

    addRef(doc: string, ref: ResolvedRef) {
        let refs = this.refs.get(doc);
        if (!refs) this.refs.set(doc, (refs = new Map()));
        refs.set(refKey(ref.resolver, ref.written), ref);
    }

    ref(doc: string, resolver: string, written: string): ResolvedRef | undefined {
        return this.refs.get(doc)?.get(refKey(resolver, written));
    }

    refsOf(doc: string): ResolvedRef[] {
        return [...(this.refs.get(doc)?.values() ?? [])];
    }

    collection<T>(name: string): Map<string, T> {
        let collection = this.collections.get(name);
        if (!collection) this.collections.set(name, (collection = new Map()));
        return collection as Map<string, T>;
    }

    // What the Vite plugin appends to a document's compiled module as
    // `export const cms = ...`.
    inject(doc: string, value: Record<string, unknown>) {
        this.injections.set(doc, value);
    }

    injection(doc: string): Record<string, unknown> | undefined {
        return this.injections.get(doc);
    }

    // The KaTeX macros a document renders with: the site's, then each ancestor
    // along `macroParent` from the furthest down, then its own. The nearer
    // definition of a name wins.
    foldedMacros(id: string): KatexMacros {
        const chain: KatexMacros[] = [];
        const seen = new Set<string>();
        for (let doc = this.docs.get(id); doc && !seen.has(doc.id);) {
            seen.add(doc.id);
            chain.unshift(doc.macros);
            doc = doc.macroParent ? this.docs.get(doc.macroParent) : undefined;
        }
        return Object.assign({}, this.siteMacros, ...chain);
    }

    error(file: string, message: string) {
        this.diagnostics.push({ file, message });
    }
}
