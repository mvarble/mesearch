// The queries a documentation site's `load` functions call, over the snapshot the Vite
// plugin inlines into the virtual module. Nothing here touches the filesystem.
import { buildOutline, citationLabel } from '@mvarble/mesearch-cms/runtime';

import type {
    GraphEdge,
    SiteDocument,
    SiteEntry,
    SiteEntryDocument,
    SiteMath,
    SitePage,
    SiteSnapshot,
} from './types.ts';

export type * from './types.ts';
export { citationLabel };

export function bind(snapshot: SiteSnapshot) {
    const byKey = new Map(snapshot.documents.map((record) => [record.key, record]));
    const byFilename = new Map(snapshot.documents.map((record) => [record.filename, record]));
    const rank = new Map(snapshot.tracks.map((track, i) => [track, i]));
    const ofKind = <K extends SiteDocument['kind']>(kind: K) =>
        snapshot.documents.filter(
            (record): record is Extract<SiteDocument, { kind: K }> => record.kind == kind,
        );

    // Tracks in their order, then each track's pages by `order`.
    const pages = ofKind('page').toSorted(
        (a, b) =>
            rank.get(a.track)! - rank.get(b.track)! ||
            a.order - b.order ||
            a.key.localeCompare(b.key),
    );
    // In reading order: part by part, and by `order` within a part. Without parts, by title.
    const partRank = new Map(snapshot.parts.map((id, i) => [id, i]));
    const math = snapshot.parts.length
        ? ofKind('math').toSorted(
              (a, b) =>
                  (partRank.get(a.part) ?? Infinity) - (partRank.get(b.part) ?? Infinity) ||
                  a.order - b.order ||
                  a.key.localeCompare(b.key),
          )
        : ofKind('math').toSorted((a, b) => a.title.localeCompare(b.title));
    // Newest first.
    const entries = ofKind('entry').toSorted(
        (a, b) => b.created.valueOf() - a.created.valueOf() || a.key.localeCompare(b.key),
    );

    // Everything, in reading order: the tracks, the math notes, the archive.
    const ordered = (): SiteDocument[] => [
        ...pages,
        ...math,
        ...entries.flatMap((entry) => [entry, ...lookup(entry.documents)]),
    ];

    const lookup = <T extends SiteDocument = SiteDocument>(keys: string[]) =>
        keys.map((key) => byKey.get(key)).filter((record): record is T => !!record);
    const edges = (match: (edge: GraphEdge) => boolean) => snapshot.graph.edges.filter(match);

    return {
        // The home page's prose, by filename.
        landing: () => snapshot.landing,
        tracks: () => snapshot.tracks,
        // Any document, by key or by filename.
        get: (key: string) => byKey.get(key),
        byFilename: (filename: string) => byFilename.get(filename),
        // Everything, in reading order: the tracks, the math notes, the archive.
        all: ordered,
        pages: {
            list: (track?: string): SitePage[] =>
                track === undefined ? pages : pages.filter((page) => page.track == track),
            get: (key: string) => {
                const record = byKey.get(key);
                return record?.kind == 'page' ? record : undefined;
            },
            // The pages before and after one within its track.
            neighbours: (key: string): { prev?: SitePage; next?: SitePage } => {
                const record = byKey.get(key);
                if (record?.kind != 'page') return {};
                const siblings = pages.filter((page) => page.track == record.track);
                const i = siblings.findIndex((page) => page.key == key);
                return { prev: siblings[i - 1], next: siblings[i + 1] };
            },
        },
        math: {
            // Every note in reading order, or those of one part.
            list: (part?: string): SiteMath[] =>
                part === undefined ? math : math.filter((note) => note.part == part),
            parts: () => snapshot.parts,
            // A note's place in the whole order, from one.
            position: (key: string) => math.findIndex((note) => note.key == key) + 1,
            // The notes before and after one, across the parts.
            neighbours: (key: string): { prev?: SiteMath; next?: SiteMath } => {
                const i = math.findIndex((note) => note.key == key);
                return i < 0 ? {} : { prev: math[i - 1], next: math[i + 1] };
            },
            get: (key: string) => {
                const record = byKey.get(key);
                return record?.kind == 'math' ? record : undefined;
            },
        },
        archive: {
            list: (): SiteEntry[] => entries,
            get: (key: string) => {
                const record = byKey.get(key);
                return record?.kind == 'entry' ? record : undefined;
            },
            documents: (key: string): SiteEntryDocument[] => {
                const record = byKey.get(key);
                return record?.kind == 'entry' ? lookup<SiteEntryDocument>(record.documents) : [];
            },
        },
        graph: () => snapshot.graph,
        // What a document builds on, directly.
        prerequisites: (key: string) => lookup(byKey.get(key)?.dependsOn ?? []),
        // The documents that build on it, in reading order.
        dependents: (key: string) => ordered().filter((record) => record.dependsOn.includes(key)),
        // What it is loosely related to by a link, either way.
        related: (key: string) =>
            lookup([
                ...edges((edge) => edge.style == 'dashed' && edge.from == key).map((e) => e.to),
                ...edges((edge) => edge.style == 'dashed' && edge.to == key).map((e) => e.from),
            ]),
        headings: (filename: string) => snapshot.headings[filename] ?? [],
        outline: (filename: string) => buildOutline(snapshot.headings[filename] ?? []),
        // The references a page cites, for the list at its end.
        bibliography: (key: string) => snapshot.bibliography[key] ?? [],
    };
}

export type SiteCms = ReturnType<typeof bind>;
