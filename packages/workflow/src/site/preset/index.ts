import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
    bibtexDoctype,
    bibliographies,
    citations,
    docRecord,
    equations,
    fileLinks,
    findSibling,
    firstHeading,
    Frontmatter,
    gitDates,
    numberDocument,
    pageLinks,
    parseHeadings,
    plainText,
    readingMinutes,
    referenceText,
    reportProblems,
    statements,
    type DateProvider,
    type Doctype,
    type PageTarget,
    type Preset,
    type Resolver,
    type SourceFile,
    type Store,
} from '@mvarble/mesearch-cms';

import type {
    EntryStatus,
    Graph,
    GraphEdge,
    SiteDocument,
    SiteEntry,
    SiteEntryDocument,
    SiteMath,
    SitePage,
    SiteSnapshot,
    WorkflowRecord,
} from './types.ts';

export type * from './types.ts';
export type { SiteCms } from './runtime.ts';

export interface SitePresetOptions {
    // The tracks of pages, in reading order. Each is a folder under the content
    // directory, and the first segment of its pages' URLs.
    tracks: string[];
    // The parts of the mathematics, in reading order. A math note names the one it belongs to as
    // its `part`, and its place within it as its `order`, and rests only on the notes before it.
    // Without parts, the notes are listed by title and may rest on one another in any order.
    parts?: string[];
    // The documents an entry may hold besides its `index`, by file name, in
    // the order they are written, with the title each takes when its
    // frontmatter gives none.
    documents?: Record<string, string>;
    // Where the documents live, relative to the project root.
    contentDir?: string;
    // The URL prefix the site is served under, as SvelteKit's `paths.base`.
    base?: string;
    // The titles of the pages that list each track, the math notes and the
    // archive, which links to them (`../../guide/`) read as `%title`. A track's
    // id, capitalized, by default.
    sectionTitles?: Record<string, string>;
    // The import specifier of the component a statement is spread into.
    statementComponent?: string;
    // Where a document's dates come from when its frontmatter is silent. Git
    // history, then file times, by default.
    dates?: DateProvider;
}

export const DEFAULT_DOCUMENTS: Record<string, string> = {
    math: 'Mathematics',
    implementation: 'Implementation',
    plan: 'Plan',
    writeup: 'Writeup',
};

const MARKDOWN = /\.(md|svx)$/;

// The queries' module: `runtime.js` beside this file once built, `runtime.ts` when run from source.
const RUNTIME = new URL(
    `./runtime${path.extname(fileURLToPath(import.meta.url))}`,
    import.meta.url,
);
const RESERVED = ['math', 'archive'];

type Place =
    | { kind: 'landing' }
    | { kind: 'page'; track: string; slug: string }
    | { kind: 'math'; slug: string }
    | { kind: 'entry'; slug: string }
    | { kind: 'entry-document'; slug: string; name: string }
    | { kind: 'workflow'; slug: string };

// A project's documentation, under `content/`:
//
//     landing.{md,svx}                       the home page's prose
//     <track>/<slug>/index.{md,svx}          a page: what the library is
//     math/<slug>/index.{md,svx}             a note of mathematics
//     archive/<slug>/index.{md,svx}          an entry: one piece of development
//     archive/<slug>/<name>.{md,svx}         its documents (`math`, `plan`, ...)
//     archive/<slug>/workflow.json           its stages, as the workflow tool
//                                            records them
//
// Pages say what is, and are rewritten as the library changes; an entry keeps
// what was proposed and why, and is not rewritten once it is done. The two
// point at each other: an entry lists the `pages` it changed, and a page shows
// the entries that list it.
//
// Frontmatter: every document takes `title`, `summary`, `depends_on` and
// `katex_macros`. A page also needs an `order` within its track, and a math
// note a `part` and an `order` within it; an entry may list the `pages` it
// changed, the earlier entries it `revises`, and what it `amends` in entries
// that were done. A page that
// moved lists the keys it had under `formerly`, so that an entry, frozen once
// done, still names it by the key it had then. A bare slug
// in `depends_on` names a math note, in `revises` an entry; anything else is
// written as a key, such as `concepts/graph` or `archive/normal/math`.
//
// The math notes are read in order, part by part, and each rests only on the
// notes before it: a note's `depends_on` names math notes alone, and none at
// its own place or after it. A page's `depends_on` likewise names no page of
// its own track at its place or after it.
//
// Each document numbers its own equations and statements, as mesearch's do.
export function docsPreset(options: SitePresetOptions): Preset {
    const contentDir = (options.contentDir ?? 'content').replace(/\/+$/, '');
    const base = options.base ?? '';
    const tracks = [...options.tracks];
    const parts = [...(options.parts ?? [])];
    const documentTitles = options.documents ?? DEFAULT_DOCUMENTS;
    const statementComponent = options.statementComponent ?? '$lib/components/Statement.svelte';
    let dates = options.dates;

    for (const track of tracks) {
        if (RESERVED.includes(track) || !/^[a-z0-9-]+$/.test(track)) {
            throw new Error(`docs preset: '${track}' cannot be a track.`);
        }
    }
    for (const name of Object.keys(documentTitles)) {
        if (name == 'index' || !/^[a-z0-9-]+$/.test(name)) {
            throw new Error(`docs preset: '${name}' cannot name an entry's document.`);
        }
    }

    // Links are written the way the files sit on disk --- `../../math/retraction/`,
    // `../normal/math.md` --- or as site paths.
    const links = fileLinks({ contentDir, base, homeNames: ['landing'] });
    const { url } = links;

    // The sections are pages of the site that no document makes.
    const sections = new Map(
        [...tracks, 'math', 'archive'].map((id) => [
            id,
            options.sectionTitles?.[id] ??
                { math: 'Mathematics', archive: 'Archive' }[id] ??
                id.slice(0, 1).toUpperCase() + id.slice(1),
        ]),
    );

    const placeOf = (id: string): Place | undefined => {
        if (!id.startsWith(contentDir + '/')) return undefined;
        const parts = id.slice(contentDir.length + 1).split('/');
        const [first, slug, file] = parts;
        if (parts.length == 1 && /^landing\.(md|svx)$/.test(first!)) return { kind: 'landing' };
        if (parts.length != 3 || !slug || !file) return undefined;
        const name = /^([a-z0-9-]+)\.(md|svx)$/.exec(file)?.[1];
        if (first == 'archive') {
            if (file == 'workflow.json') return { kind: 'workflow', slug };
            if (name == 'index') return { kind: 'entry', slug };
            if (name && name in documentTitles) return { kind: 'entry-document', slug, name };
            return undefined;
        }
        if (name != 'index') return undefined;
        if (first == 'math') return { kind: 'math', slug };
        if (tracks.includes(first!)) return { kind: 'page', track: first!, slug };
        return undefined;
    };

    const documents = (store: Store) => store.collection<SiteDocument>('documents');
    const written = (store: Store) => store.collection<Written>('written');

    const landing: Doctype = {
        name: 'landing',
        claims: (file) => placeOf(file.id)?.kind == 'landing',
        initialize(store, file) {
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Landing');
            store.addDoc(
                docRecord(file.id, 'landing', {
                    macros: fm.katexMacros(),
                    headings: parseHeadings(file, { depth: 3, mathDelimiters: true }),
                }),
            );
            store.addPage({ pathname: '', doc: file.id, formats: { title: 'Home', full: 'Home' } });
            store.collection<string>('site').set('landing', file.id);
            numberContents(store, file, '');
            reportProblems(store, fm);
        },
    };

    // Whatever is common to every kind of document, registered once.
    function register(store: Store, file: SourceFile, entry: SiteDocument, fm: Frontmatter) {
        store.addDoc(
            docRecord(file.id, entry.kind, {
                macros: entry.katexMacros,
                headings: parseHeadings(file, { depth: 3, mathDelimiters: true }),
            }),
        );
        store.addPage({
            pathname: entry.key,
            doc: file.id,
            formats: { title: entry.title, full: entry.title },
        });
        store.scopes.set(entry.key, file.id);
        store.scopeNames.set(file.id, `${entry.kind} '${entry.key}'`);
        documents(store).set(entry.key, entry);
        written(store).set(entry.key, {
            summary: summaryOf(file, fm),
            dependsOn: fm.optionalStrings('depends_on') ?? [],
            pages: fm.optionalStrings('pages') ?? [],
            revises: fm.optionalStrings('revises') ?? [],
            amends: fm.optionalStrings('amends') ?? [],
            formerly: fm.optionalStrings('formerly') ?? [],
        });
        numberContents(store, file, entry.key);
        reportProblems(store, fm);
    }

    // The fields every kind shares, with the dates from git when the
    // frontmatter does not give them.
    function common(store: Store, file: SourceFile, fm: Frontmatter, key: string) {
        dates ??= gitDates(store.root, contentDir);
        const known = dates(isIndex(file.id) ? path.posix.dirname(file.id) : file.id);
        const created = fm.optionalDate('created') ?? known?.created ?? new Date(0);
        const updated = fm.optionalDate('updated') ?? known?.updated ?? created;
        return {
            key,
            filename: file.id,
            summary: '',
            created,
            updated: updated < created ? created : updated,
            dependsOn: [] as string[],
            readingMinutes: readingMinutes(file.mdast.children),
            katexMacros: fm.katexMacros(),
        };
    }

    const titleOf = (fm: Frontmatter, file: SourceFile, fallback: string) => {
        if (fm.has('title')) return fm.requiredString('title') || fallback;
        return firstHeading(file) || fallback;
    };

    const page: Doctype = {
        name: 'page',
        claims: (file) => placeOf(file.id)?.kind == 'page',
        initialize(store, file) {
            const place = placeOf(file.id) as Extract<Place, { kind: 'page' }>;
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Page');
            const order = fm.raw('order');
            if (typeof order != 'number') fm.reject('order', 'a number');
            const key = `${place.track}/${place.slug}`;
            const entry: SitePage = {
                ...common(store, file, fm, key),
                kind: 'page',
                track: place.track,
                slug: place.slug,
                title: titleOf(fm, file, place.slug),
                order: typeof order == 'number' ? order : Infinity,
                entries: [],
            };
            register(store, file, entry, fm);
        },
    };

    const math: Doctype = {
        name: 'math',
        claims: (file) => placeOf(file.id)?.kind == 'math',
        initialize(store, file) {
            const place = placeOf(file.id) as Extract<Place, { kind: 'math' }>;
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Math note');
            const part = fm.raw('part');
            const order = fm.raw('order');
            // A note is placed only where the mathematics has parts.
            if (parts.length) {
                if (typeof part != 'string' || !parts.includes(part)) {
                    fm.reject('part', `one of the parts of the mathematics (${parts.join(', ')})`);
                }
                if (typeof order != 'number') fm.reject('order', 'a number');
            }
            const entry: SiteMath = {
                ...common(store, file, fm, `math/${place.slug}`),
                kind: 'math',
                slug: place.slug,
                title: titleOf(fm, file, place.slug),
                part: typeof part == 'string' ? part : '',
                order: typeof order == 'number' ? order : Infinity,
            };
            register(store, file, entry, fm);
        },
    };

    const entry: Doctype = {
        name: 'entry',
        claims: (file) => placeOf(file.id)?.kind == 'entry',
        initialize(store, file) {
            const place = placeOf(file.id) as Extract<Place, { kind: 'entry' }>;
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Entry');
            const folder = path.posix.dirname(file.id);
            const workflow = readWorkflow(store, `${folder}/workflow.json`);
            const record: SiteEntry = {
                ...common(store, file, fm, `archive/${place.slug}`),
                kind: 'entry',
                slug: place.slug,
                title: titleOf(fm, file, place.slug),
                status: statusOf(workflow),
                workflow,
                documents: Object.keys(documentTitles)
                    .filter((name) => findSibling(store, folder, name))
                    .map((name) => `archive/${place.slug}/${name}`),
                pages: [],
                revises: [],
                revisedBy: [],
                amends: [],
                amendedBy: [],
            };
            register(store, file, record, fm);
        },
    };

    const entryDocument: Doctype = {
        name: 'entry-document',
        claims: (file) => placeOf(file.id)?.kind == 'entry-document',
        initialize(store, file) {
            const place = placeOf(file.id) as Extract<Place, { kind: 'entry-document' }>;
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Entry document');
            const folder = path.posix.dirname(file.id);
            const index = findSibling(store, folder, 'index');
            if (!index) {
                store.error(
                    file.id,
                    `${file.id}: an entry's document needs an \`index\` beside it.`,
                );
            }
            const record: SiteEntryDocument = {
                ...common(store, file, fm, `archive/${place.slug}/${place.name}`),
                kind: 'entry-document',
                entry: `archive/${place.slug}`,
                name: place.name,
                // Named by its stage ("Mathematics", "Plan"), not by its first heading, which
                // names a section of it ("The problem"); only its own `title` overrides that.
                title: fm.has('title')
                    ? fm.requiredString('title') || documentTitles[place.name]!
                    : documentTitles[place.name]!,
                amendedBy: [],
            };
            // Read here rather than from the entry's record, which may not be
            // registered yet: files are visited in name order.
            const entryTitle = index ? store.file(index).frontmatter.title : undefined;
            register(store, file, record, fm);
            if (typeof entryTitle == 'string' && entryTitle) {
                store.pages.get(record.key)!.formats.full = `${entryTitle}: ${record.title}`;
            }
        },
    };

    // Read by the entry; claimed so that the dev server watches it.
    const workflow: Doctype = {
        name: 'workflow',
        claims: (file) => placeOf(file.id)?.kind == 'workflow',
    };

    // Each document numbers its own equations and statements, from one, in the
    // order a reader meets them.
    function numberContents(store: Store, file: SourceFile, key: string) {
        numberDocument(store, file, {
            page: key,
            isComponent: (specifier) => specifier == statementComponent,
            statementId: (slug) => `statement:${slug}`,
        });
    }

    // A key as a frontmatter list writes it: whole (`concepts/graph`), or as a
    // bare slug within `folder`.
    function resolveKey(
        store: Store,
        from: SiteDocument,
        ref: string,
        field: string,
        folder: string,
        kinds: SiteDocument['kind'][],
    ): string | undefined {
        const cleaned = ref.replace(/^\/+|\/+$/g, '');
        const key = cleaned.includes('/') ? cleaned : `${folder}/${cleaned}`;
        const target = documents(store).get(key);
        if (target && kinds.includes(target.kind)) return key;
        // A page that moved answers to the keys it had.
        if (!target && kinds.includes('page')) {
            for (const [moved, raw] of written(store)) {
                if (raw.formerly.includes(key) && documents(store).get(moved)?.kind == 'page') {
                    return moved;
                }
            }
        }
        store.error(
            from.filename,
            `${from.filename}: \`${field}\` entry '${ref}' names no ${kinds.join(' or ')}.`,
        );
        return undefined;
    }

    function finalize(store: Store) {
        const all = documents(store);
        const allKinds: SiteDocument['kind'][] = ['page', 'math', 'entry', 'entry-document'];
        for (const record of all.values()) {
            const raw = written(store).get(record.key)!;
            record.summary = raw.summary(store);
            record.dependsOn = unique(
                raw.dependsOn
                    .map((ref) => resolveKey(store, record, ref, 'depends_on', 'math', allKinds))
                    .filter((key): key is string => !!key && key != record.key),
            );
            if (record.kind == 'entry') {
                record.pages = unique(
                    raw.pages
                        .map((ref) => resolveKey(store, record, ref, 'pages', '', ['page']))
                        .filter((key): key is string => !!key),
                );
                record.revises = unique(
                    raw.revises
                        .map((ref) =>
                            resolveKey(store, record, ref, 'revises', 'archive', ['entry']),
                        )
                        .filter((key): key is string => !!key && key != record.key),
                );
                record.amends = unique(
                    raw.amends.filter((ref) => amendedEntry(store, record, ref) !== undefined),
                );
            }
            if (record.kind != 'entry' && raw.amends.length) {
                store.error(
                    record.filename,
                    `${record.filename}: only an entry's \`index\` lists what it \`amends\`.`,
                );
            }
            if (raw.formerly.length && record.kind != 'page') {
                store.error(
                    record.filename,
                    `${record.filename}: only a page lists the keys it had under \`formerly\`.`,
                );
            }
            if (record.kind != 'entry' && (raw.pages.length || raw.revises.length)) {
                store.error(
                    record.filename,
                    `${record.filename}: only an entry's \`index\` lists \`pages\` or \`revises\`.`,
                );
            }
        }
        // The reverse directions, newest entry first.
        const entries = [...all.values()]
            .filter((record): record is SiteEntry => record.kind == 'entry')
            .sort(
                (a, b) => b.created.valueOf() - a.created.valueOf() || a.key.localeCompare(b.key),
            );
        for (const record of entries) {
            for (const key of record.pages) (all.get(key) as SitePage).entries.push(record.key);
            for (const key of record.revises)
                (all.get(key) as SiteEntry).revisedBy.push(record.key);
            for (const key of record.amends) {
                const amended = all.get(amendedEntry(store, record, key)!) as SiteEntry;
                if (!amended.amendedBy.includes(record.key)) amended.amendedBy.push(record.key);
                const document = all.get(key);
                if (document?.kind == 'entry-document') document.amendedBy.push(record.key);
            }
        }
        checkOrder(store, [...all.values()]);
        store.collection<Graph>('graph').set('graph', graphOf(store, [...all.values()]));
    }

    // The entry an `amends` item names, by key: `archive/<slug>/<name>` is one of its documents,
    // and `archive/<slug>/statements/<name>` one of its statements.
    function amendedEntry(store: Store, from: SiteDocument, ref: string): string | undefined {
        const all = documents(store);
        const statement = /^(archive\/[a-z0-9-]+)\/statements\/([a-z0-9-]+)$/.exec(ref);
        const entry = statement ? statement[1]! : ref.split('/').slice(0, 2).join('/');
        const named = statement
            ? hasFile(store, `${contentDir}/${ref}.md`)
            : all.get(ref)?.kind == 'entry-document';
        if (named && all.get(entry)?.kind == 'entry' && entry != from.key) return entry;
        store.error(
            from.filename,
            `${from.filename}: \`amends\` entry '${ref}' names no document or statement of another entry.`,
        );
        return undefined;
    }

    // The math notes in reading order: by part, then by `order`, then by key.
    const noteOrder = (a: SiteMath, b: SiteMath) =>
        parts.indexOf(a.part) - parts.indexOf(b.part) ||
        a.order - b.order ||
        a.key.localeCompare(b.key);

    // The notes are a story read in order, each resting only on the notes before it, and a
    // track's pages likewise.
    function checkOrder(store: Store, records: SiteDocument[]) {
        const byKey = new Map(records.map((record) => [record.key, record]));
        // A note without a place has been reported already, and is held to nothing here.
        const notes = records
            .filter((record): record is SiteMath => record.kind == 'math')
            .filter((note) => parts.includes(note.part) && Number.isFinite(note.order))
            .sort(noteOrder);
        const placed = new Set(notes.map((note) => note.key));
        const place = (note: SiteMath) => `${note.part} ${note.order}`;
        notes.forEach((note, i) => {
            const before = notes[i - 1];
            if (before && before.part == note.part && before.order == note.order) {
                store.error(
                    note.filename,
                    `${note.filename}: '${before.key}' is at ${place(note)} too; two notes cannot stand at one place.`,
                );
            }
            for (const key of note.dependsOn) {
                const dependency = byKey.get(key)!;
                if (dependency.kind != 'math') {
                    store.error(
                        note.filename,
                        `${note.filename}: \`depends_on\` names '${key}', which is no math note; a note rests on the notes before it alone.`,
                    );
                } else if (placed.has(key) && noteOrder(dependency, note) >= 0) {
                    store.error(
                        note.filename,
                        `${note.filename}: \`depends_on\` names '${key}', which stands at ${place(dependency)}, not before ${place(note)}.`,
                    );
                }
            }
        });
        for (const page of records) {
            if (page.kind != 'page') continue;
            for (const key of page.dependsOn) {
                const dependency = byKey.get(key)!;
                if (dependency.kind != 'page' || dependency.track != page.track) continue;
                if (dependency.order >= page.order) {
                    store.error(
                        page.filename,
                        `${page.filename}: \`depends_on\` names '${key}', which does not come before it in its track.`,
                    );
                }
            }
        }
    }

    function graphOf(store: Store, records: SiteDocument[]): Graph {
        const nodes = records
            .filter((record) => record.kind == 'math' || record.kind == 'entry-document')
            .map((record) => record.key);
        const isNode = new Set(nodes);
        const edges: GraphEdge[] = [];
        const solid = new Set<string>();
        const dashed = new Set<string>();
        const pair = (a: string, b: string) => `${a}\0${b}`;
        for (const record of records) {
            if (!isNode.has(record.key)) continue;
            for (const dependency of record.dependsOn) {
                if (!isNode.has(dependency) || solid.has(pair(dependency, record.key))) continue;
                solid.add(pair(dependency, record.key));
                edges.push({ from: dependency, to: record.key, style: 'solid', via: 'depends_on' });
            }
        }
        for (const record of records) {
            if (!isNode.has(record.key)) continue;
            const sources = [...store.docs.keys()].filter(
                (id) => store.pathnameOf(id) == record.key,
            );
            for (const source of sources) {
                for (const ref of store.refsOf(source)) {
                    if (ref.resolver != 'page') continue;
                    const to = (ref.target as PageTarget).pathname;
                    if (!isNode.has(to) || to == record.key) continue;
                    const seen = [solid, dashed].some(
                        (set) => set.has(pair(record.key, to)) || set.has(pair(to, record.key)),
                    );
                    if (seen) continue;
                    dashed.add(pair(record.key, to));
                    edges.push({ from: record.key, to, style: 'dashed', via: 'link' });
                }
            }
        }
        return { nodes, edges };
    }

    // A link to a section's own page: a track, the math notes, the archive.
    const sectionLinks: Resolver<PageTarget> = {
        ...pageLinks(links),
        name: 'section',
        matchLink(href, store, doc) {
            if (!links.match(href)) return undefined;
            const location = links.locate(store, doc, href);
            return location && sections.has(location.pathname) ? href : undefined;
        },
        resolve(store, doc, written) {
            const { pathname, hash } = links.locate(store, doc, written)!;
            const title = sections.get(pathname)!;
            return { pathname, hash, formats: { title, full: title }, url: url(pathname, hash) };
        },
    };

    return {
        name: 'docs',
        contentDir,
        include: (id) =>
            MARKDOWN.test(id) || id.endsWith('.bib') || placeOf(id)?.kind == 'workflow',
        doctypes: [
            landing,
            page,
            math,
            entry,
            entryDocument,
            workflow,
            bibtexDoctype(),
            { name: 'site', claims: () => false, finalize },
        ],
        resolvers: [
            equations({ url: (page, slug) => url(page, `#eq:${slug}`) }),
            statements({ url: (page, slug) => url(page, `#statement:${slug}`) }),
            citations({ url: (key) => `#cite:${key}` }),
            sectionLinks,
            pageLinks(links),
        ],
        headingDepth: 3,
        runtime: RUNTIME,
        snapshot: (store): SiteSnapshot => ({
            landing: store.collection<string>('site').get('landing'),
            tracks,
            parts,
            documents: [...documents(store).values()],
            graph: store.collection<Graph>('graph').get('graph') ?? { nodes: [], edges: [] },
            headings: Object.fromEntries([...store.docs].map(([id, doc]) => [id, doc.headings])),
            bibliography: bibliographies(store),
        }),
    };
}

// What a document's frontmatter lists, before every document is known.
interface Written {
    summary(store: Store): string;
    dependsOn: string[];
    pages: string[];
    revises: string[];
    amends: string[];
    /** A page's keys before it moved. */
    formerly: string[];
}

// The frontmatter's `summary`, or else the first paragraph, flattened once its
// references are resolved.
function summaryOf(file: SourceFile, fm: Frontmatter): (store: Store) => string {
    if (fm.has('summary')) {
        const summary = fm.requiredString('summary');
        return () => summary;
    }
    const paragraph = file.mdast.children.find((node) => node.type == 'paragraph');
    const nodes: SourceFile['mdast']['children'] = paragraph ? [paragraph] : [];
    return (store) => plainText(nodes, referenceText(store, file.id));
}

function readWorkflow(store: Store, id: string): WorkflowRecord | undefined {
    let raw: string;
    try {
        raw = store.file(id).raw;
    } catch {
        store.error(id, `${id}: an entry needs a \`workflow.json\`; \`wf start\` writes one.`);
        return undefined;
    }
    try {
        const parsed = JSON.parse(raw) as Partial<WorkflowRecord>;
        if (typeof parsed.kind != 'string' || typeof parsed.stage != 'string') {
            throw new Error('`kind` and `stage` must be strings');
        }
        return {
            ...parsed,
            events: Array.isArray(parsed.events) ? parsed.events : [],
        } as WorkflowRecord;
    } catch (error) {
        store.error(id, `${id}: does not parse as a workflow record: ${(error as Error).message}.`);
        return undefined;
    }
}

function statusOf(workflow: WorkflowRecord | undefined): EntryStatus {
    if (workflow?.stage == 'done') return 'done';
    if (workflow?.stage == 'abandoned') return 'abandoned';
    return 'active';
}

function hasFile(store: Store, id: string): boolean {
    try {
        store.file(id);
        return true;
    } catch {
        return false;
    }
}

const isIndex = (id: string) => /(^|\/)index\.(md|svx)$/.test(id);

const unique = <T>(items: T[]) => [...new Set(items)];
