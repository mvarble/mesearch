import { error } from '@sveltejs/kit';
import { cms } from '$cms';

import { linkOf } from '../../lib/documents';
import { TRACKS } from '$site';
import type { EntryGenerator, PageServerLoad } from '../../lib/kit';

export const entries: EntryGenerator = () => TRACKS.map((t) => ({ track: t.id }));

export const load: PageServerLoad = ({ params }) => {
    const track = TRACKS.find((t) => t.id == params.track);
    if (!track) error(404, `No section named ${params.track}.`);
    return { track, pages: cms.pages.list(track.id).map(linkOf) };
};
