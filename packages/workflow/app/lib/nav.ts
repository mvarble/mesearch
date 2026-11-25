// The navigation every page shows: each track's pages, the math notes, and the archive's entries.
// A site's `+layout.server.ts` builds it with `navigation()` and may add to it, as skoro lists
// each crate's page under its page of the crates.
import { cms } from '$cms';
import { ARCHIVE, MATH, NAV, TRACKS } from '$site';

import { resolve } from '$app/paths';
import { linkOf, type DocumentLink } from './documents';

/**
 * A link in the navigation. `sub` indents it under the item before it, and `code` sets its title
 * in the monospace face, as for a crate's page.
 */
export type NavItem = Pick<DocumentLink, 'key' | 'title' | 'href' | 'status'> & {
    sub?: boolean;
    code?: boolean;
};

export interface NavSection {
    id: string;
    title: string;
    short: string;
    href: string;
    items: NavItem[];
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
        items: cms.math.list().map(linkOf),
    };
    const at = NAV.mathBefore ? tracks.findIndex((track) => track.id == NAV.mathBefore) : -1;
    if (at < 0) tracks.push(math);
    else tracks.splice(at, 0, math);
    return [
        ...tracks,
        { ...ARCHIVE, href: resolve('/archive'), items: cms.archive.list().map(linkOf) },
    ];
}

// Where the site is hosted, when the build knows it (`SITE_URL=https://example.org`): a link
// preview, such as LinkedIn's, takes only an absolute URL for its image.
export const siteOrigin = () => (process.env.SITE_URL ?? '').replace(/\/$/, '');
