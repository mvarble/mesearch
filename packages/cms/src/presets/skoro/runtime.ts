// The queries a skoro site's `load` functions call, over the snapshot the Vite
// plugin inlines into the virtual module. Nothing here touches the filesystem.
import { buildOutline } from '../../model/outline.ts';
import { citationLabel } from '../../resolvers/citation.ts';
import { live } from '../../runtime.ts';
import type {
    GraphEdge,
    SkoroDocument,
    SkoroEntry,
    SkoroEntryDocument,
    SkoroMath,
    SkoroPage,
    SkoroSnapshot,
} from './types.ts';

export type * from './types.ts';
export { citationLabel };

export function bind(snapshot: SkoroSnapshot) {
    const byKey = new Map(snapshot.documents.map((record) => [record.key, record]));
    const byFilename = new Map(snapshot.documents.map((record) => [record.filename, record]));
    const rank = new Map(snapshot.tracks.map((track, i) => [track, i]));
    const ofKind = <K extends SkoroDocument['kind']>(kind: K) =>
        snapshot.documents.filter(
            (record): record is Extract<SkoroDocument, { kind: K }> => record.kind == kind,
        );

    // Tracks in their order, then each track's pages by `order`.
    const pages = ofKind('page').toSorted(
        (a, b) =>
            rank.get(a.track)! - rank.get(b.track)! ||
            a.order - b.order ||
            a.key.localeCompare(b.key),
    );
    const math = ofKind('math').toSorted((a, b) => a.title.localeCompare(b.title));
    // Newest first.
    const entries = ofKind('entry').toSorted(
        (a, b) => b.created.valueOf() - a.created.valueOf() || a.key.localeCompare(b.key),
    );

    // Everything, in reading order: the tracks, the math notes, the archive.
    const ordered = (): SkoroDocument[] => [
        ...pages,
        ...math,
        ...entries.flatMap((entry) => [entry, ...lookup(entry.documents)]),
    ];

    const lookup = <T extends SkoroDocument = SkoroDocument>(keys: string[]) =>
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
            list: (track?: string): SkoroPage[] =>
                track === undefined ? pages : pages.filter((page) => page.track == track),
            get: (key: string) => {
                const record = byKey.get(key);
                return record?.kind == 'page' ? record : undefined;
            },
            // The pages before and after one within its track.
            neighbours: (key: string): { prev?: SkoroPage; next?: SkoroPage } => {
                const record = byKey.get(key);
                if (record?.kind != 'page') return {};
                const siblings = pages.filter((page) => page.track == record.track);
                const i = siblings.findIndex((page) => page.key == key);
                return { prev: siblings[i - 1], next: siblings[i + 1] };
            },
        },
        math: {
            list: (): SkoroMath[] => math,
            get: (key: string) => {
                const record = byKey.get(key);
                return record?.kind == 'math' ? record : undefined;
            },
        },
        archive: {
            list: (): SkoroEntry[] => entries,
            get: (key: string) => {
                const record = byKey.get(key);
                return record?.kind == 'entry' ? record : undefined;
            },
            documents: (key: string): SkoroEntryDocument[] => {
                const record = byKey.get(key);
                return record?.kind == 'entry' ? lookup<SkoroEntryDocument>(record.documents) : [];
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

export type SkoroCms = ReturnType<typeof bind>;

export const bindLive = (current: () => SkoroSnapshot) => live(bind, current);
