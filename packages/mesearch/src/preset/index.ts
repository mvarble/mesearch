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
    type SourceFile,
    type Store,
} from '@mvarble/mesearch-cms';

import {
    FOLDERS,
    type Graph,
    type GraphEdge,
    type Kind,
    type MesearchDocument,
    type MesearchSequence,
    type MesearchSnapshot,
} from './types.ts';

export type * from './types.ts';
export { FOLDERS } from './types.ts';
export type { MesearchCms } from './runtime.ts';
export { gitDates, type DateProvider, type Dates } from '@mvarble/mesearch-cms';

export interface MesearchPresetOptions {
    // Where the documents live, relative to the project root.
    contentDir?: string;
    // The URL prefix the site is served under, as SvelteKit's `paths.base`:
    // empty, or starting with a slash and not ending in one.
    base?: string;
    // Where a document's dates come from when its frontmatter is silent. Git
    // history, then file times, by default.
    dates?: DateProvider;
}

const MARKDOWN = /\.(md|svx)$/;

// The queries' module: `runtime.js` beside this file once built, `runtime.ts`
// when run from source.
const RUNTIME = new URL(
    `./runtime${path.extname(fileURLToPath(import.meta.url))}`,
    import.meta.url,
);

// What a document imports to render a statement: `<Statement {...theorem} />`.
export const STATEMENT_COMPONENT = '@mvarble/mesearch/Statement.svelte';
const KINDS: Kind[] = ['concept', 'writeup', 'sequence'];

// mesearch's opinionated layout, under `content/`:
//
//     description.{md,svx}                 the site's own description
//     concepts/<slug>/index.{md,svx}       one concept per folder
//     writeups/<slug>/index.{md,svx}       one writeup per folder
//     sequences/<slug>/index.{md,svx}      `documents:` lists writeups in order
//     */<slug>/description.{md,svx}        optional, for previews
//
// A document's frontmatter gives its `title`, `created` and `updated` dates,
// what it `depends_on`, and its `katex_macros`. Each document is its own scope:
// its equations and the statements it shows (`type: statement` documents
// spread into `<Statement>`) share one count from one, and are referred to as
// `eq:slug` or `statement:slug` from within it, or `concepts/<slug>/slug` from
// elsewhere.
//
// Every `.bib` file under `content/` adds to one bibliography. A `cite:key` link
// points at the reference list at the end of the page it is on, which holds
// exactly what that page cites.
export function mesearchPreset(options: MesearchPresetOptions = {}): Preset {
    const contentDir = (options.contentDir ?? 'content').replace(/\/+$/, '');
    const base = options.base ?? '';
    let dates = options.dates;

    const links = fileLinks({ contentDir, base, folderNames: ['index', 'description'] });
    const { url } = links;

    // `<contentDir>/<folder>/<slug>/<name>.{md,svx}`, taken apart.
    const placeOf = (id: string) => {
        const match = new RegExp(
            `^${escape(contentDir)}/(concepts|writeups|sequences)/([^/]+)/(index|description)\\.(md|svx)$`,
        ).exec(id);
        if (!match) return undefined;
        const kind = KINDS.find((kind) => FOLDERS[kind] == match[1])!;
        return { kind, slug: match[2]!, name: match[3] as 'index' | 'description' };
    };
    const isSiteDescription = (id: string) =>
        new RegExp(`^${escape(contentDir)}/description\\.(md|svx)$`).test(id);

    const documents = (store: Store) => store.collection<MesearchDocument>('documents');

    const site: Doctype = {
        name: 'site',
        claims: (file) => isSiteDescription(file.id),
        initialize(store, file) {
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, 'Site description');
            store.addDoc(docRecord(file.id, 'site', { macros: fm.katexMacros() }));
            store.addPage({ pathname: '', doc: file.id, formats: { title: 'Home', full: 'Home' } });
            store.collection<string>('site').set('description', file.id);
        },
    };

    const document: Doctype = {
        name: 'document',
        claims: (file) => placeOf(file.id)?.name == 'index',
        initialize(store, file) {
            const { kind, slug } = placeOf(file.id)!;
            const key = `${FOLDERS[kind]}/${slug}`;
            const fm = new Frontmatter(store.root, file.id, file.frontmatter, capitalize(kind));
            const folder = path.posix.dirname(file.id);
            dates ??= gitDates(store.root, contentDir);
            const known = dates(folder);

            const title = fm.has('title') ? fm.requiredString('title') : firstHeading(file);
            if (!title) fm.reject('title', 'a non-empty string');
            const created = fm.optionalDate('created') ?? known?.created ?? new Date(0);
            const updated = fm.optionalDate('updated') ?? known?.updated ?? created;
            const macros = fm.katexMacros();
            const descriptionFilename = findSibling(store, folder, 'description');

            const entry: MesearchDocument = {
                kind,
                slug,
                key,
                title: title || slug,
                filename: file.id,
                descriptionFilename,
                summary: '',
                created,
                updated: updated < created ? created : updated,
                dependsOn: [],
                sequences: [],
                readingMinutes: readingMinutes(file.mdast.children),
                katexMacros: macros,
            };
            // Resolved once every document is known.
            store.collection<Written>('written').set(key, {
                dependsOn: fm.optionalStrings('depends_on') ?? [],
                documents: kind == 'sequence' ? (fm.optionalStrings('documents') ?? []) : [],
            });
            reportProblems(store, fm);

            store.addDoc(
                docRecord(file.id, kind, {
                    macros,
                    headings: parseHeadings(file, { depth: 3, mathDelimiters: true }),
                }),
            );
            store.addPage({
                pathname: key,
                doc: file.id,
                formats: { title: entry.title, full: entry.title },
            });
            store.scopes.set(key, file.id);
            store.scopeNames.set(file.id, `${kind} '${key}'`);

            if (descriptionFilename) {
                const description = store.file(descriptionFilename);
                const dfm = new Frontmatter(
                    store.root,
                    descriptionFilename,
                    description.frontmatter,
                    'Description',
                );
                store.addDoc(
                    docRecord(descriptionFilename, 'description', {
                        scope: file.id,
                        host: file.id,
                        macroParent: file.id,
                        macros: dfm.katexMacros(),
                    }),
                );
            }
            // Written out in `finalize`, once its references are resolved.
            const paragraph = file.mdast.children.find((node) => node.type == 'paragraph');
            store.collection<Summary>('summaries').set(key, {
                doc: descriptionFilename ?? file.id,
                nodes: descriptionFilename
                    ? store.file(descriptionFilename).mdast.children
                    : paragraph
                      ? [paragraph]
                      : [],
            });

            documents(store).set(key, entry);

            // Each document numbers its own equations and statements, from one,
            // in the order a reader meets them.
            numberDocument(store, file, {
                page: key,
                isComponent: (specifier) => specifier == STATEMENT_COMPONENT,
                statementId: (slug) => `statement:${slug}`,
            });
        },
        finalize: (store) => finalize(store),
    };

    // `depends_on: [x]` names `concepts/x` or `writeups/x`; a bare slug has to
    // be unambiguous between them.
    function resolveKey(store: Store, from: MesearchDocument, written: string, field: string) {
        const cleaned = written.replace(/^\/+|\/+$/g, '');
        const all = documents(store);
        if (cleaned.includes('/')) {
            if (all.has(cleaned)) return cleaned;
        } else {
            const candidates = ['concepts', 'writeups']
                .map((folder) => `${folder}/${cleaned}`)
                .filter((key) => all.has(key));
            if (candidates.length == 1) return candidates[0];
            if (candidates.length > 1) {
                store.error(
                    from.filename,
                    `${from.filename}: \`${field}\` entry '${written}' is both ${candidates.join(' and ')}; ` +
                        'write the folder too.',
                );
                return undefined;
            }
        }
        store.error(
            from.filename,
            `${from.filename}: \`${field}\` entry '${written}' names no document.`,
        );
        return undefined;
    }

    function finalize(store: Store) {
        const all = documents(store);
        const sequences: MesearchSequence[] = [];
        for (const entry of all.values()) {
            const summary = store.collection<Summary>('summaries').get(entry.key);
            if (summary)
                entry.summary = plainText(summary.nodes, referenceText(store, summary.doc));
            const written = store.collection<Written>('written').get(entry.key)!;
            entry.dependsOn = unique(
                written.dependsOn
                    .map((ref) => resolveKey(store, entry, ref, 'depends_on'))
                    .filter((key): key is string => !!key && key != entry.key),
            );
            if (entry.kind == 'sequence') {
                const sequence = entry as MesearchSequence;
                sequence.documents = unique(
                    written.documents
                        .map((ref) => resolveKey(store, entry, ref, 'documents'))
                        .filter((key): key is string => !!key && all.get(key)?.kind != 'sequence'),
                );
                for (const key of sequence.documents) all.get(key)!.sequences.push(sequence.key);
                sequences.push(sequence);
            }
        }
        store.collection<Graph>('graph').set('graph', graphOf(store, [...all.values()], sequences));
    }

    function graphOf(
        store: Store,
        entries: MesearchDocument[],
        sequences: MesearchSequence[],
    ): Graph {
        const nodes = entries.filter((entry) => entry.kind != 'sequence').map((entry) => entry.key);
        const isNode = new Set(nodes);
        const edges: GraphEdge[] = [];
        const solid = new Set<string>();
        const pair = (a: string, b: string) => `${a}\0${b}`;
        const addSolid = (from: string, to: string, via: GraphEdge['via']) => {
            if (!isNode.has(from) || !isNode.has(to) || from == to || solid.has(pair(from, to)))
                return;
            solid.add(pair(from, to));
            edges.push({ from, to, style: 'solid', via });
        };
        for (const entry of entries) {
            for (const dependency of entry.dependsOn) addSolid(dependency, entry.key, 'depends_on');
        }
        // Neighbours in a sequence are read in that order.
        for (const sequence of sequences) {
            sequence.documents.forEach((key, i) => {
                const next = sequence.documents[i + 1];
                if (next) addSolid(key, next, 'sequence');
            });
        }
        // A link between two documents with no dependency either way relates
        // them more loosely. One dashed edge per pair, whichever way it links.
        const dashed = new Set<string>();
        for (const entry of entries) {
            if (!isNode.has(entry.key)) continue;
            // The document, its description, and the statements it shows.
            const sources = [...store.docs.keys()].filter(
                (id) => store.pathnameOf(id) == entry.key,
            );
            for (const source of sources) {
                for (const ref of store.refsOf(source)) {
                    if (ref.resolver != 'page') continue;
                    const to = (ref.target as PageTarget).pathname;
                    if (!isNode.has(to) || to == entry.key) continue;
                    if (solid.has(pair(entry.key, to)) || solid.has(pair(to, entry.key))) continue;
                    if (dashed.has(pair(entry.key, to)) || dashed.has(pair(to, entry.key)))
                        continue;
                    dashed.add(pair(entry.key, to));
                    edges.push({ from: entry.key, to, style: 'dashed', via: 'link' });
                }
            }
        }
        return { nodes, edges };
    }

    return {
        name: 'mesearch',
        contentDir,
        include: (id) => MARKDOWN.test(id) || id.endsWith('.bib'),
        doctypes: [site, document, bibtexDoctype()],
        resolvers: [
            equations({ url: (page, slug) => url(page, `#eq:${slug}`) }),
            statements({ url: (page, slug) => url(page, `#statement:${slug}`) }),
            // On the page itself, a citation jumps to the page's own list. A
            // description is shown elsewhere --- on the map --- so it points at
            // the list on its document's page.
            citations({
                url: (key, store, doc) =>
                    doc.doctype == 'description'
                        ? url(store.pathnameOf(doc.id) ?? '', `#cite:${key}`)
                        : `#cite:${key}`,
            }),
            pageLinks(links),
        ],
        headingDepth: 3,
        runtime: RUNTIME,
        snapshot: (store): MesearchSnapshot => {
            const entries = [...documents(store).values()];
            return {
                description: store.collection<string>('site').get('description'),
                documents: entries.filter((entry) => entry.kind != 'sequence'),
                sequences: entries.filter(
                    (entry): entry is MesearchSequence => entry.kind == 'sequence',
                ),
                graph: store.collection<Graph>('graph').get('graph') ?? { nodes: [], edges: [] },
                headings: Object.fromEntries(
                    [...store.docs].map(([id, doc]) => [id, doc.headings]),
                ),
                bibliography: bibliographies(store),
            };
        },
    };
}

// References as the frontmatter writes them, before every document is known.
interface Written {
    dependsOn: string[];
    documents: string[];
}

// What a document's summary is made from: its description, or else its first
// paragraph.
interface Summary {
    doc: string;
    nodes: SourceFile['mdast']['children'];
}

const capitalize = (text: string) => text.slice(0, 1).toUpperCase() + text.slice(1);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unique = <T>(items: T[]) => [...new Set(items)];
