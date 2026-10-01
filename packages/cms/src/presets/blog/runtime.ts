// The queries a blog's `load` functions call, over the snapshot the Vite plugin
// inlines into the virtual module. Nothing here touches the filesystem: it is
// bundled into the server build and runs wherever that runs.
import { buildOutline } from '../../model/outline.ts';
import { live } from '../../runtime.ts';
import type { BlogSnapshot, Post, PostInfo, Sequence, SequenceChild } from './types.ts';

export type * from './types.ts';
export { citationLabel } from '../../resolvers/citation.ts';

const info = (post: Post): PostInfo => ({
    title: post.title,
    created: post.created,
    edited: post.edited,
    pathname: post.pathname,
    descriptionFilename: post.descriptionFilename,
    imageFilename: post.imageFilename,
    tags: post.tags,
});

// Most recently edited first. The sort is stable, so ties keep the order the
// content was scanned in.
const latest = <T extends { edited: Date }>(items: T[], limit?: number) =>
    items
        .toSorted((a, b) => b.edited.valueOf() - a.edited.valueOf())
        .slice(0, limit ?? items.length);

const contains = (children: SequenceChild[], filename: string): boolean =>
    children.some((child) => child.filename == filename || contains(child.children, filename));

export function bind(snapshot: BlogSnapshot) {
    return {
        posts: {
            list: ({ limit }: { limit?: number } = {}) => latest(snapshot.posts, limit).map(info),
            get: (pathname: string): Post | undefined =>
                snapshot.posts.find((post) => post.pathname == pathname),
        },
        sequences: {
            list: ({ limit }: { limit?: number } = {}) =>
                latest(snapshot.sequences, limit).map(info),
            get: (slug: string): Sequence | undefined =>
                snapshot.sequences.find((sequence) => sequence.slug == slug),
            // The sequence a document belongs to, whether as its root or as
            // one of its pages.
            containing: (filename: string): Sequence | undefined =>
                snapshot.sequences.find(
                    (sequence) =>
                        sequence.filename == filename || contains(sequence.children, filename),
                ),
        },
        pages: {
            get: (pathname: string) => {
                const filename = snapshot.pages[pathname];
                return filename === undefined ? undefined : { pathname, filename };
            },
        },
        headings: (filename: string) => snapshot.headings[filename] ?? [],
        // A page's headings as the tree a table of contents renders.
        outline: (filename: string) => buildOutline(snapshot.headings[filename] ?? []),
        citations: {
            list: () => snapshot.citations,
        },
        // The references a page cites, for the list at its end.
        bibliography: (pathname: string) => snapshot.bibliography[pathname] ?? [],
    };
}

export type BlogCms = ReturnType<typeof bind>;

export const bindLive = (current: () => BlogSnapshot) => live(bind, current);
