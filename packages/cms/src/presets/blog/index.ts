import { docRecord, type Doctype, type Preset } from '../../core/build.ts';
import { Frontmatter } from '../../core/frontmatter.ts';
import { resolveId } from '../../core/paths.ts';
import type { SourceFile } from '../../core/source.ts';
import { bibliographies, readBibliography } from '../../core/bibtex.ts';
import { registerStatement } from '../../core/statements.ts';
import type { Store } from '../../core/store.ts';
import { parseHeadings, walkDocument, type WalkOptions, type WalkTarget } from '../../core/walk.ts';
import { labelPages, Numbering, type PageTree } from '../../model/build.ts';
import {
    citations,
    equations,
    pathnameLinks,
    statements,
    TAG,
    type Citation,
} from '../../resolvers/index.ts';
import type { BlogSnapshot, PageLink, Post, Sequence, SequenceChild } from './types.ts';

export type * from './types.ts';
export type { BlogCms } from './runtime.ts';

export interface BlogPresetOptions {
    // Where the content lives, relative to the project root.
    contentDir?: string;
    // The component a statement is spread into, as documents import it, and
    // the file that import names.
    statementComponent?: string;
    statementComponentFile?: string;
}

// The blog's content model.
//
// - `type: post` is a page at `posts/<slug>`.
// - `type: sequence` is a page at `sequences/<slug>` with a tree of chapter and
//   section pages beneath it, labelled by position when `enumerate` is set.
// - `type: statement` is a theorem, lemma or the like, rendered inside the page
//   that imports it and numbered with the equations around it.
// - `.bib` files are the bibliography that `cite:` links draw from. A
//   citation points at the reference list at the end of the page it is on,
//   which holds exactly what that page cites.
//
// Statements and equations share one counter per post, or per sequence, and
// their slugs are unique within it.
export function blogPreset(options: BlogPresetOptions = {}): Preset {
    const contentDir = options.contentDir ?? 'content';
    const statementComponent = options.statementComponent ?? '$lib/components/statement.svelte';
    const statementComponentFile =
        options.statementComponentFile ?? 'src/lib/components/statement.svelte';

    const isComponent = (specifier: string, from: string) =>
        specifier == statementComponent ||
        (specifier.startsWith('.') && resolveId(from, specifier) == statementComponentFile);

    // Walks a page --- and every statement it imports, recursively --- handing
    // out labels from `numbering` in reading order.
    function walk(store: Store, file: SourceFile, target: WalkTarget, numbering: Numbering) {
        const walkOptions: WalkOptions = {
            isComponent,
            onMath(tex, at) {
                for (const [, slug] of tex.matchAll(TAG)) {
                    store.addAnchor({
                        kind: 'equation',
                        scope: at.scope,
                        slug: slug!,
                        label: numbering.next(),
                        source: at.doc,
                        page: at.page,
                    });
                }
            },
            onImport(id, at) {
                registerStatement(store, id, at, {
                    next: () => numbering.next(),
                    walk: (file, target) => walk(store, file, target, numbering),
                });
            },
        };
        walkDocument(file, target, walkOptions);
    }

    const post: Doctype = {
        name: 'post',
        claims: (file) => file.frontmatter.type == 'post',
        initialize(store, file) {
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Post');
            const created = fm.requiredDate('created');
            const slug = fm.slug();
            const post: Post = {
                title: fm.requiredString('title'),
                slug,
                created,
                edited: fm.optionalDate('edited', created),
                pathname: `posts/${slug}`,
                filename: file.id,
                descriptionFilename: fm.optionalPath('description'),
                imageFilename: fm.optionalPath('image'),
                katexMacros: fm.katexMacros(),
                tags: fm.optionalStrings('tags') ?? [],
            };
            if (!report(store, fm)) return;

            store.addDoc(
                docRecord(file.id, 'post', {
                    macros: post.katexMacros,
                    headings: parseHeadings(file, { depth: 2 }),
                }),
            );
            store.addPage({
                pathname: post.pathname,
                doc: file.id,
                formats: { title: post.title, full: post.title },
            });
            registerScope(store, slug, file.id, `post '${slug}'`);
            registerDescription(store, post.descriptionFilename, file.id);
            store.collection<Post>('posts').set(slug, post);

            walk(
                store,
                file,
                { doc: file.id, scope: file.id, page: post.pathname, host: file.id },
                new Numbering(),
            );
        },
    };

    const sequence: Doctype = {
        name: 'sequence',
        claims: (file) => file.frontmatter.type == 'sequence',
        initialize(store, file) {
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Sequence');
            const created = fm.requiredDate('created');
            const enumerate = fm.optionalBoolean('enumerate', false);

            // `children` is a tree of pages, each described by a file the
            // sequence points at; a page's own frontmatter supplies its title
            // and slug.
            const declared = fm.optionalArray('children');
            const children = declared
                ? buildChildren(store, file.id, declared, false, true)
                : undefined;
            if (declared && !children) return;

            const slug = fm.slug();
            const pathname = `sequences/${slug}`;
            const root: Sequence = {
                title: fm.requiredString('title'),
                slug,
                created,
                edited: fm.optionalDate('edited', created),
                pathname,
                filename: file.id,
                descriptionFilename: fm.optionalPath('description'),
                imageFilename: fm.optionalPath('image'),
                katexMacros: fm.katexMacros(),
                tags: fm.optionalStrings('tags') ?? [],
                enumerate,
                children: [],
            };
            if (!report(store, fm)) return;

            store.addDoc(
                docRecord(file.id, 'sequence', {
                    macros: root.katexMacros,
                    headings: parseHeadings(file, { depth: 2 }),
                }),
            );
            store.addPage({
                pathname,
                doc: file.id,
                formats: { title: root.title, label: '', sequence: root.title, full: root.title },
            });
            registerScope(store, slug, file.id, `sequence '${slug}'`);
            registerDescription(store, root.descriptionFilename, file.id);

            // Labels are worked out for the whole tree up front; an unenumerated
            // sequence computes them all the same and simply does not show them.
            const labels = labelPages(children ?? []);
            const register = (input: ChildInput, parent: { id: string; pathname: string }) => {
                const label = labels.get(input)!;
                const childPathname = `${parent.pathname}/${input.slug}`;
                const child: SequenceChild = {
                    title: input.title,
                    slug: input.slug,
                    pathname: childPathname,
                    filename: input.filename,
                    katexMacros: input.katexMacros,
                    label: enumerate ? label : undefined,
                    appendix: input.appendix,
                    children: [],
                };
                // Every page of a sequence has the sequence root as its scope,
                // which is what makes a slug mean the same thing across the
                // whole sequence; its macros fold down from the page above.
                store.addDoc(
                    docRecord(input.filename, 'sequence-page', {
                        scope: file.id,
                        macroParent: parent.id,
                        macros: input.katexMacros,
                        headings: parseHeadings(store.file(input.filename), { depth: 2 }),
                    }),
                );
                store.addPage({
                    pathname: childPathname,
                    doc: input.filename,
                    formats: {
                        title: child.title,
                        ...(child.label !== undefined ? { label: child.label } : {}),
                        sequence: root.title,
                        full: child.label ? `${child.label}. ${child.title}` : child.title,
                    },
                });
                child.children = (input.children ?? []).map((grandchild) =>
                    register(grandchild, { id: input.filename, pathname: childPathname }),
                );
                return child;
            };
            root.children = (children ?? []).map((child) =>
                register(child, { id: file.id, pathname }),
            );
            store.collection<Sequence>('sequences').set(slug, root);

            // Walks the sequence in reading order, numbering its statements and
            // equations as it goes. `Numbering` owns when the count restarts;
            // this only has to visit the pages in the order a reader meets them.
            const numbering = new Numbering(enumerate ? '0' : undefined);
            walk(
                store,
                file,
                { doc: file.id, scope: file.id, page: pathname, host: file.id },
                numbering,
            );
            const descendants = root.children.toReversed();
            while (descendants.length > 0) {
                const descendant = descendants.pop()!;
                numbering.enter(descendant.label);
                walk(
                    store,
                    store.file(descendant.filename),
                    {
                        doc: descendant.filename,
                        scope: file.id,
                        page: descendant.pathname,
                        host: descendant.filename,
                    },
                    numbering,
                );
                descendants.push(...descendant.children.toReversed());
            }
        },
    };

    // Statements register themselves when a page imports them; on their own
    // they contribute nothing.
    const statement: Doctype = {
        name: 'statement',
        claims: (file) => file.frontmatter.type == 'statement',
    };

    const bib: Doctype = {
        name: 'bibtex',
        claims: (file) => file.id.endsWith('.bib'),
        initialize: (store, file) => readBibliography(store, file),
    };

    return {
        name: 'blog',
        contentDir,
        include: (id) => id.endsWith('.svx') || id.endsWith('.bib'),
        doctypes: [post, sequence, statement, bib],
        resolvers: [
            // On the page itself, a citation jumps to the page's own list. A
            // description is shown on the listings, so it points at the list
            // on its post's page.
            citations({
                url: (key, store, doc) =>
                    doc.doctype == 'description'
                        ? `/${store.pathnameOf(doc.id)}/#cite:${key}`
                        : `#cite:${key}`,
            }),
            equations(),
            statements(),
            pathnameLinks(),
        ],
        headingDepth: 2,
        runtime: '@mvarble/mesearch-cms/presets/blog/runtime',
        snapshot: (store): BlogSnapshot => ({
            posts: [...store.collection<Post>('posts').values()],
            sequences: [...store.collection<Sequence>('sequences').values()],
            pages: Object.fromEntries(
                [...store.pages].map(([pathname, page]) => [pathname, page.doc]),
            ),
            headings: Object.fromEntries([...store.docs].map(([id, doc]) => [id, doc.headings])),
            citations: [...store.collection<Citation>('citations').values()],
            bibliography: bibliographies(store),
            links: pageLinks(store),
        }),
    };
}

// Which pages refer to which: by a link, or to an equation or a statement
// shown on the other page. Once per pair and direction, in the order found.
function pageLinks(store: Store): PageLink[] {
    const seen = new Set<string>();
    const links: PageLink[] = [];
    for (const id of store.docs.keys()) {
        const from = store.pathnameOf(id);
        if (from === undefined) continue;
        for (const ref of store.refsOf(id)) {
            const target = ref.target as { pathname?: string; scope?: string; slug?: string };
            const to =
                ref.resolver == 'page'
                    ? target.pathname?.replace(/\/+$/, '')
                    : (ref.resolver == 'statement' || ref.resolver == 'equation') &&
                        target.scope !== undefined &&
                        target.slug !== undefined
                      ? store.anchor(ref.resolver, target.scope, target.slug)?.page
                      : undefined;
            if (to === undefined || to == from || !store.pages.has(to)) continue;
            const key = `${from}\0${to}`;
            if (seen.has(key)) continue;
            seen.add(key);
            links.push({ from, to });
        }
    }
    return links;
}

interface ChildInput extends PageTree {
    title: string;
    slug: string;
    filename: string;
    katexMacros: Record<string, string>;
    appendix: boolean;
    children?: ChildInput[];
}

// The page tree a sequence declares, read from each page's own frontmatter.
// Anything wrong with it drops the whole sequence, reported once.
function buildChildren(
    store: Store,
    rootFilename: string,
    children: unknown[],
    appendixStart: boolean,
    topLevel: boolean,
): ChildInput[] | undefined {
    const out: ChildInput[] = [];
    let appendix = appendixStart;
    for (const child of children) {
        if (typeof child != 'object' || !child) {
            store.error(
                rootFilename,
                `${rootFilename}: each entry of \`children\` must be an object.`,
            );
            return;
        }
        // Once one top-level child is marked as an appendix, the rest are too.
        if (topLevel && !appendix && (child as { appendix?: unknown }).appendix === true) {
            appendix = true;
        }

        const entry = new Frontmatter(store.root, rootFilename, child, 'Sequence child');
        const relative = entry.requiredString('filename');
        if (!report(store, entry)) return;
        const filename = resolveId(rootFilename, relative);

        let file: SourceFile;
        try {
            file = store.file(filename);
        } catch {
            store.error(rootFilename, `${rootFilename}: \`${relative}\` does not exist.`);
            return;
        }
        const page = new Frontmatter(store.root, filename, file.frontmatter, 'Sequence page');
        const title = page.requiredString('title');
        const slug = page.slug();
        const katexMacros = page.katexMacros() as Record<string, string>;
        if (!report(store, page)) return;

        const nested = entry.optionalArray('children');
        if (!nested) {
            out.push({ title, slug, filename, katexMacros, appendix });
            continue;
        }
        // A sequence is chapters and sections, and nothing below that. The table
        // of contents spends its third level on the headings within a page, so a
        // deeper page tree would have nowhere left to go.
        if (!topLevel) {
            store.error(
                rootFilename,
                `${rootFilename}: \`${relative}\` nests a third level of pages; ` +
                    'a sequence has chapters and sections only.',
            );
            return;
        }
        const grandchildren = buildChildren(store, rootFilename, nested, appendix, false);
        if (!grandchildren) return;
        out.push({ title, slug, filename, katexMacros, children: grandchildren, appendix });
    }
    return out;
}

function registerScope(store: Store, slug: string, id: string, name: string) {
    if (!store.scopes.has(slug)) store.scopes.set(slug, id);
    store.scopeNames.set(id, name);
}

// A description is shown on the listings rather than on a page of its own. It
// folds its owner's macros and resolves links as though written on its page.
function registerDescription(store: Store, id: string | undefined, owner: string) {
    if (!id) return;
    let macros;
    try {
        macros = new Frontmatter(
            store.root,
            id,
            store.file(id).frontmatter,
            'Description',
        ).katexMacros();
    } catch {
        store.error(owner, `${owner}: the description \`${id}\` does not exist.`);
        return;
    }
    store.addDoc(
        docRecord(id, 'description', { scope: owner, host: owner, macroParent: owner, macros }),
    );
}

// Hands a reader's problems to the store, answering whether there were none.
function report(store: Store, fm: Frontmatter): boolean {
    const valid = fm.valid();
    for (const problem of fm.problems) store.error(fm.filename, problem);
    fm.problems.length = 0;
    return valid;
}
