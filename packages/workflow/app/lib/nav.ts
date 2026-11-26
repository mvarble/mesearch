// The navigation every page shows: each track's pages, the math notes, and the archive's entries.
// A site's `+layout.server.ts` builds it with `navigation()` and may add to it, as skoro lists
// each crate's page under its page of the crates. The math notes are listed by part where the
// mathematics has parts, each part linking to its first note and holding the rest; the archive
// lists its entries, each holding its documents, and is folded away outside the archive.
import { cms } from '$cms';
import { ARCHIVE, MATH, MATH_PARTS, NAV, TRACKS } from '$site';

import { resolve } from '$app/paths';
import { linkOf, type DocumentLink } from './documents';

/**
 * A link in the navigation. `sub` indents it under the item before it, and `code` sets its title
 * in the monospace face, as for a crate's page. An item with `children` (a part of the
 * mathematics, an entry of the archive) is a group, which the sidebar unfolds only while the
 * reader is on one of its children, or anywhere under `within`.
 */
export type NavItem = Pick<DocumentLink, 'key' | 'title' | 'href' | 'status'> & {
    sub?: boolean;
    code?: boolean;
    children?: NavItem[];
    within?: string;
};

export interface NavSection {
    id: string;
    title: string;
    short: string;
    href: string;
    items: NavItem[];
    // Whether the sidebar lists the items only while the reader is under `href`.
    folded?: boolean;
}

export interface NavigationOptions {
    /** Rewrites the items of one track, as by inserting links under one of its pages. */
    items?: (track: string, items: NavItem[]) => NavItem[];
}

// The tracks in their order, with the math notes placed before the track `NAV.mathBefore` names
// (after the last track when it names none, or one that is not there), and the archive last.
export function navigation(options: NavigationOptions = {}): NavSection[] {
    const tracks: NavSection[] = TRACKS.map((track) => {
        const items = cms.pages.list(track.id).map(linkOf);
        return {
            ...track,
            href: resolve('/[track=track]', { track: track.id }),
            items: options.items ? options.items(track.id, items) : items,
        };
    });
    const math: NavSection = {
        ...MATH,
        href: resolve('/math'),
        items: MATH_PARTS.length
            ? MATH_PARTS.flatMap((part) => {
                  const notes = cms.math.list(part.id).map(linkOf);
                  const first = notes[0];
                  return first
                      ? [
                            {
                                key: `math-part/${part.id}`,
                                title: part.title,
                                href: first.href,
                                children: notes,
                            },
                        ]
                      : [];
              })
            : cms.math.list().map(linkOf),
    };
    const at = NAV.mathBefore ? tracks.findIndex((track) => track.id == NAV.mathBefore) : -1;
    if (at < 0) tracks.push(math);
    else tracks.splice(at, 0, math);
    return [
        ...tracks,
        {
            ...ARCHIVE,
            href: resolve('/archive'),
            folded: true,
            items: cms.archive.list().map((entry) => {
                const link = linkOf(entry);
                const children = cms.archive.documents(entry.key).map(linkOf);
                return children.length ? { ...link, children, within: link.href } : link;
            }),
        },
    ];
}

// Where the site is hosted, when the build knows it (`SITE_URL=https://example.org`): a link
// preview, such as LinkedIn's, takes only an absolute URL for its image.
export const siteOrigin = () => (process.env.SITE_URL ?? '').replace(/\/$/, '');
