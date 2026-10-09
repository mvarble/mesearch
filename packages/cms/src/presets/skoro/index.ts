import path from 'node:path';
import type { RootContent } from 'mdast';

import { docRecord, type Doctype, type Preset } from '../../core/build.ts';
import { Frontmatter } from '../../core/frontmatter.ts';
import type { SourceFile } from '../../core/source.ts';
import { bibliographies, readBibliography } from '../../core/bibtex.ts';
import { registerStatement } from '../../core/statements.ts';
import type { Store } from '../../core/store.ts';
import { parseHeadings, walkDocument, type WalkTarget } from '../../core/walk.ts';
import {
    citations,
    equations,
    pageLinks,
    statements,
    TAG,
    type PageTarget,
} from '../../resolvers/index.ts';
import { gitDates, type DateProvider } from '../mesearch/dates.ts';
import { firstHeading, plainText, referenceText, wordCount } from '../text.ts';
import type {
    EntryStatus,
    Graph,
    GraphEdge,
    SkoroDocument,
    SkoroEntry,
    SkoroEntryDocument,
    SkoroMath,
    SkoroPage,
    SkoroSnapshot,
    WorkflowRecord,
} from './types.ts';

export type * from './types.ts';
export type { SkoroCms } from './runtime.ts';

export interface SkoroPresetOptions {
    // The tracks of pages, in reading order. Each is a folder under the content
    // directory, and the first segment of its pages' URLs.
    tracks: string[];
    // The documents an entry may hold besides its `index`, by file name, in
    // the order they are written, with the title each takes when its
    // frontmatter gives none.
    documents?: Record<string, string>;
    // Where the documents live, relative to the project root.
    contentDir?: string;
    // The URL prefix the site is served under, as SvelteKit's `paths.base`.
    base?: string;
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
const BIBTEX = /\.bib$/;
const RESERVED = ['math', 'archive'];

type Place =
    | { kind: 'landing' }
    | { kind: 'page'; track: string; slug: string }
    | { kind: 'math'; slug: string }
    | { kind: 'entry'; slug: string }
    | { kind: 'entry-document'; slug: string; name: string }
    | { kind: 'workflow'; slug: string };

// skoro's documentation, under `content/`:
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
// `katex_macros`. A page also needs an `order` within its track; an entry may
// list the `pages` it changed and the earlier entries it `revises`. A bare slug
// in `depends_on` names a math note, in `revises` an entry; anything else is
// written as a key, such as `concepts/graph` or `archive/normal/math`.
//
// Each document numbers its own equations and statements, as mesearch's do.
export function skoroPreset(options: SkoroPresetOptions): Preset {
    const contentDir = (options.contentDir ?? 'content').replace(/\/+$/, '');
    const base = options.base ?? '';
    const tracks = [...options.tracks];
    const documentTitles = options.documents ?? DEFAULT_DOCUMENTS;
    const statementComponent = options.statementComponent ?? '$lib/components/Statement.svelte';
    let dates = options.dates;

    for (const track of tracks) {
        if (RESERVED.includes(track) || !/^[a-z0-9-]+$/.test(track)) {
            throw new Error(`skoro preset: '${track}' cannot be a track.`);
        }
    }
    for (const name of Object.keys(documentTitles)) {
        if (name == 'index' || !/^[a-z0-9-]+$/.test(name)) {
            throw new Error(`skoro preset: '${name}' cannot name an entry's document.`);
        }
    }

    const url = (pathname: string, hash = '') => `${base}/${pathname ? pathname + '/' : ''}${hash}`;

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

    const documents = (store: Store) => store.collection<SkoroDocument>('documents');
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
            report(store, fm);
        },
    };

    // Whatever is common to every kind of document, registered once.
    function register(store: Store, file: SourceFile, entry: SkoroDocument, fm: Frontmatter) {
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
        });
        numberContents(store, file, entry.key);
        report(store, fm);
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
            readingMinutes: Math.max(1, Math.round(wordCount(file.mdast.children) / 230)),
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
            const entry: SkoroPage = {
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
            const entry: SkoroMath = {
                ...common(store, file, fm, `math/${place.slug}`),
                kind: 'math',
                slug: place.slug,
                title: titleOf(fm, file, place.slug),
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
            const record: SkoroEntry = {
                ...common(store, file, fm, `archive/${place.slug}`),
                kind: 'entry',
                slug: place.slug,
                title: titleOf(fm, file, place.slug),
                status: statusOf(workflow),
                workflow,
                documents: Object.keys(documentTitles)
                    .filter((name) => findDocument(store, folder, name))
                    .map((name) => `archive/${place.slug}/${name}`),
                pages: [],
                revises: [],
                revisedBy: [],
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
            const index = findDocument(store, folder, 'index');
            if (!index) {
                store.error(
                    file.id,
                    `${file.id}: an entry's document needs an \`index\` beside it.`,
                );
            }
            const record: SkoroEntryDocument = {
                ...common(store, file, fm, `archive/${place.slug}/${place.name}`),
                kind: 'entry-document',
                entry: `archive/${place.slug}`,
                name: place.name,
                title: titleOf(fm, file, documentTitles[place.name]!),
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

    const bibliography: Doctype = {
        name: 'bibtex',
        claims: (file) => BIBTEX.test(file.id),
        initialize: (store, file) => readBibliography(store, file),
    };

    // Each document numbers its own equations and statements, from one, in the
    // order a reader meets them.
    function numberContents(store: Store, file: SourceFile, key: string) {
        let count = 0;
        const next = () => String(++count);
        const walk = (file: SourceFile, target: WalkTarget) =>
            walkDocument(file, target, {
                isComponent: (specifier) => specifier == statementComponent,
                onMath(tex, at) {
                    for (const [, eq] of tex.matchAll(TAG)) {
                        store.addAnchor({
                            kind: 'equation',
                            scope: at.scope,
                            slug: eq!,
                            label: next(),
                            source: at.doc,
                            page: at.page,
                        });
                    }
                },
                onImport(id, at) {
                    registerStatement(store, id, at, {
                        next,
                        walk,
                        id: (slug) => `statement:${slug}`,
                    });
                },
            });
        walk(file, { doc: file.id, scope: file.id, page: key, host: file.id });
    }

    // A key as a frontmatter list writes it: whole (`concepts/graph`), or as a
    // bare slug within `folder`.
    function resolveKey(
        store: Store,
        from: SkoroDocument,
        ref: string,
        field: string,
        folder: string,
        kinds: SkoroDocument['kind'][],
    ): string | undefined {
        const cleaned = ref.replace(/^\/+|\/+$/g, '');
        const key = cleaned.includes('/') ? cleaned : `${folder}/${cleaned}`;
        const target = documents(store).get(key);
        if (target && kinds.includes(target.kind)) return key;
        store.error(
            from.filename,
            `${from.filename}: \`${field}\` entry '${ref}' names no ${kinds.join(' or ')}.`,
        );
        return undefined;
    }

    function finalize(store: Store) {
        const all = documents(store);
        const allKinds: SkoroDocument['kind'][] = ['page', 'math', 'entry', 'entry-document'];
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
            } else if (raw.pages.length || raw.revises.length) {
                store.error(
                    record.filename,
                    `${record.filename}: only an entry's \`index\` lists \`pages\` or \`revises\`.`,
                );
            }
        }
        // The reverse directions, newest entry first.
        const entries = [...all.values()]
            .filter((record): record is SkoroEntry => record.kind == 'entry')
            .sort(
                (a, b) => b.created.valueOf() - a.created.valueOf() || a.key.localeCompare(b.key),
            );
        for (const record of entries) {
            for (const key of record.pages) (all.get(key) as SkoroPage).entries.push(record.key);
            for (const key of record.revises)
                (all.get(key) as SkoroEntry).revisedBy.push(record.key);
        }
        store.collection<Graph>('graph').set('graph', graphOf(store, [...all.values()]));
    }

    function graphOf(store: Store, records: SkoroDocument[]): Graph {
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

    // The page a link names. Links are written the way the files sit on disk ---
    // `../../math/retraction/`, `../normal/math.md` --- or as site paths.
    function locate(store: Store, from: string, href: string) {
        const hashAt = href.search(/[?#]/);
        const target = hashAt < 0 ? href : href.slice(0, hashAt);
        const hash = hashAt < 0 ? '' : href.slice(hashAt).replace(/^\?[^#]*/, '');
        let rel: string;
        if (target.startsWith('/')) {
            const withoutBase =
                base && target.startsWith(base + '/') ? target.slice(base.length) : target;
            rel = withoutBase.replace(/^\/+/, '');
        } else {
            const file = path.posix.normalize(path.posix.join(path.posix.dirname(from), target));
            rel = path.posix.relative(contentDir, file);
            if (rel.startsWith('..')) return undefined;
        }
        const pathname = rel
            .replace(/\/+$/, '')
            .replace(/(^|\/)index\.(md|svx)$/, '')
            .replace(/\.(md|svx)$/, '')
            .replace(/^(\.|landing)$/, '');
        return { pathname, hash };
    }

    return {
        name: 'skoro',
        contentDir,
        include: (id) => MARKDOWN.test(id) || BIBTEX.test(id) || placeOf(id)?.kind == 'workflow',
        doctypes: [
            landing,
            page,
            math,
            entry,
            entryDocument,
            workflow,
            bibliography,
            { name: 'site', claims: () => false, finalize },
        ],
        resolvers: [
            equations({ url: (page, slug) => url(page, `#eq:${slug}`) }),
            statements({ url: (page, slug) => url(page, `#statement:${slug}`) }),
            citations({ url: (key) => `#cite:${key}` }),
            pageLinks({
                match: (href) =>
                    !!href &&
                    !/^[a-z][a-z0-9+.-]*:/i.test(href) &&
                    !href.startsWith('#') &&
                    !/\.(?!md$|svx$)[a-z0-9]+$/i.test(href.replace(/[?#].*$/, '')),
                locate: (store, doc, href) => locate(store, doc.id, href),
                url,
            }),
        ],
        headingDepth: 3,
        runtime: '@mvarble/mesearch-cms/presets/skoro/runtime',
        snapshot: (store): SkoroSnapshot => ({
            landing: store.collection<string>('site').get('landing'),
            tracks,
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
}

// The frontmatter's `summary`, or else the first paragraph, flattened once its
// references are resolved.
function summaryOf(file: SourceFile, fm: Frontmatter): (store: Store) => string {
    if (fm.has('summary')) {
        const summary = fm.requiredString('summary');
        return () => summary;
    }
    const paragraph = file.mdast.children.find((node) => node.type == 'paragraph');
    const nodes: RootContent[] = paragraph ? [paragraph] : [];
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

function findDocument(store: Store, folder: string, name: string): string | undefined {
    for (const extension of ['md', 'svx']) {
        const id = `${folder}/${name}.${extension}`;
        if (store.hasFile(id)) return id;
    }
    return undefined;
}

const isIndex = (id: string) => /(^|\/)index\.(md|svx)$/.test(id);

function report(store: Store, fm: Frontmatter) {
    for (const problem of fm.problems) store.error(fm.filename, problem);
    fm.problems.length = 0;
}

const unique = <T>(items: T[]) => [...new Set(items)];
