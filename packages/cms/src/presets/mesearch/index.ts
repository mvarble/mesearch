import path from 'node:path';
import type { RootContent } from 'mdast';

import { docRecord, type Doctype, type Preset } from '../../core/build.ts';
import { Frontmatter } from '../../core/frontmatter.ts';
import type { SourceFile } from '../../core/source.ts';
import { bibliographies, readBibliography } from '../../core/bibtex.ts';
import { registerStatement } from '../../core/statements.ts';
import type { Store } from '../../core/store.ts';
import { parseHeadings, walkDocument, type WalkTarget } from '../../core/walk.ts';
import { firstHeading, plainText, referenceText, wordCount } from '../text.ts';
import {
    citations,
    equations,
    pageLinks,
    statements,
    TAG,
    type PageTarget,
} from '../../resolvers/index.ts';
import { gitDates, type DateProvider } from './dates.ts';
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
export { gitDates, type DateProvider, type Dates } from './dates.ts';

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
const BIBTEX = /\.bib$/;

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

    const url = (pathname: string, hash = '') => `${base}/${pathname ? pathname + '/' : ''}${hash}`;

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
            const descriptionFilename = siblingDescription(store, folder);

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
                readingMinutes: Math.max(1, Math.round(wordCount(file.mdast.children) / 230)),
                katexMacros: macros,
            };
            // Resolved once every document is known.
            store.collection<Written>('written').set(key, {
                dependsOn: fm.optionalStrings('depends_on') ?? [],
                documents: kind == 'sequence' ? (fm.optionalStrings('documents') ?? []) : [],
            });
            report(store, fm);

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
            let count = 0;
            const next = () => String(++count);
            const walk = (file: SourceFile, target: WalkTarget) =>
                walkDocument(file, target, {
                    isComponent: (specifier) => specifier == STATEMENT_COMPONENT,
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
        },
        finalize: (store) => finalize(store),
    };

    const bibliography: Doctype = {
        name: 'bibtex',
        claims: (file) => BIBTEX.test(file.id),
        initialize: (store, file) => readBibliography(store, file),
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
        include: (id) => MARKDOWN.test(id) || BIBTEX.test(id),
        doctypes: [site, document, bibliography],
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
            pageLinks({
                // Anything that is not an external URL, a bare fragment, a file
                // such as a figure, or a reference another resolver claims.
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
        runtime: '@mvarble/mesearch-cms/presets/mesearch/runtime',
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

    // The page a link names. Links are written the way the files sit on disk ---
    // `../other-concept/`, `../../writeups/x/index.md` --- or as site paths
    // (`/concepts/x/`), so both are tried.
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
            .replace(/(^|\/)(index|description)\.(md|svx)$/, '')
            .replace(/\.(md|svx)$/, '')
            .replace(/^\.$/, '');
        return { pathname, hash };
    }
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
    nodes: RootContent[];
}

function siblingDescription(store: Store, folder: string): string | undefined {
    for (const extension of ['md', 'svx']) {
        const id = `${folder}/description.${extension}`;
        try {
            store.file(id);
            return id;
        } catch {
            // Not this extension.
        }
    }
    return undefined;
}

function report(store: Store, fm: Frontmatter) {
    for (const problem of fm.problems) store.error(fm.filename, problem);
    fm.problems.length = 0;
}

const capitalize = (text: string) => text.slice(0, 1).toUpperCase() + text.slice(1);
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const unique = <T>(items: T[]) => [...new Set(items)];
