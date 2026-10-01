import bibtex from 'bibtex';

import { docRecord, type Doctype, type Preset } from '../../core/build.ts';
import { Frontmatter } from '../../core/frontmatter.ts';
import { resolveId } from '../../core/paths.ts';
import type { SourceFile } from '../../core/source.ts';
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
import type { BlogSnapshot, Post, Sequence, SequenceChild, StatementInjection } from './types.ts';

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
// - `.bib` files are the bibliography that `cite:` links draw from.
//
// Statements and equations share one counter per post, or per sequence, and
// their slugs are unique within it.
export function blogPreset(options: BlogPresetOptions = {}): Preset {
    const contentDir = options.contentDir ?? 'src/content';
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
                registerStatement(store, id, at, numbering, walk);
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
        initialize(store, file) {
            const entries = store.collection<Citation>('citations');
            let parsed;
            try {
                parsed = bibtex.parseBibFile(file.raw);
            } catch (error) {
                store.error(file.id, `${file.id}: the bibliography does not parse.\n${error}`);
                return;
            }
            for (const [key, entry] of Object.entries(parsed.entries$)) {
                const field = (name: string) => {
                    const value = entry.getFieldAsString(name);
                    return value === undefined ? undefined : String(value);
                };
                entries.set(key, {
                    kind: entry.type,
                    key,
                    title: field('title') ?? '',
                    year: field('year') ?? '',
                    doi: field('doi'),
                    publisher: field('publisher'),
                    issn: field('issn'),
                    isbn: field('isbn'),
                    journal: field('journal'),
                    number: field('number'),
                    pages: field('pages'),
                    volume: field('volume'),
                    institution: field('institution'),
                    edition: field('edition'),
                    url: field('url'),
                    series: field('series'),
                    authors: (entry.getAuthors()?.authors$ ?? []).map((author) => ({
                        lastname: String(author.lastNames$.at(-1)),
                        fullname: fullname(author),
                    })),
                });
            }
        },
    };

    return {
        name: 'blog',
        contentDir,
        include: (id) => id.endsWith('.svx') || id.endsWith('.bib'),
        doctypes: [post, sequence, statement, bib],
        resolvers: [citations(), equations(), statements(), pathnameLinks()],
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
        }),
    };
}

// A statement imported into the page being walked. It takes the next number,
// and anything it contains keeps counting from there --- a statement nested
// inside another does not restart, it belongs to the same run as the page.
function registerStatement(
    store: Store,
    id: string,
    at: WalkTarget,
    numbering: Numbering,
    walk: (store: Store, file: SourceFile, target: WalkTarget, numbering: Numbering) => void,
) {
    let file: SourceFile;
    try {
        file = store.file(id);
    } catch {
        store.error(at.doc, `${at.doc}: imports \`${id}\`, which does not exist.`);
        return;
    }
    const fm = new Frontmatter(store.root, id, file.frontmatter, 'Statement');
    if (fm.raw('type') != 'statement') return;
    const kind = fm.raw('kind');
    if (typeof kind != 'string' || !kind) return;

    const slug = fm.slug();
    const label = numbering.next();
    // Rendering a statement twice takes two numbers, and only the last label
    // sticks. It is usually an accident: an element such as `<Uniform />` is
    // matched case-insensitively against an imported `uniform` document. The
    // numbering is kept as it is, since published labels depend on it.
    if (store.docs.has(id)) {
        store.error(
            id,
            `${id}: rendered more than once on \`${at.page}\`; each rendering takes a number ` +
                'and the last label wins. (An element whose name matches the import ' +
                'case-insensitively counts as a rendering.)',
        );
    }
    // A statement's macros fold under the page it is shown on, not under a
    // statement that happens to contain it.
    store.addDoc(
        docRecord(id, 'statement', {
            scope: at.scope,
            host: at.host,
            macroParent: at.host,
            macros: fm.katexMacros(),
        }),
    );
    store.addAnchor({
        kind: 'statement',
        scope: at.scope,
        slug,
        label,
        source: id,
        page: at.page,
        data: { kind },
    });
    const injection: StatementInjection = { kind, label, slug, pathname: at.page, filename: id };
    store.inject(id, { ...injection });
    walk(store, file, { doc: id, scope: at.scope, page: at.page, host: at.host }, numbering);
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

function fullname(name: bibtex.AuthorName): string {
    const append = (str: string, add: string) => `${str.trim()} ${add.trim()}`;
    let out = name.firstNames.join(' ');
    out = append(out, name.vons.join(' '));
    out = append(out, name.lastNames.join(' '));
    out = append(out, name.jrs.join(' '));
    return out;
}
