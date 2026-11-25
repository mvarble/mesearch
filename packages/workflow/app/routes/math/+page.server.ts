import { cms } from '$cms';

import { linkOf } from '../../lib/documents';
import { documentMap } from '../../lib/server/map';
import { MATH_PARTS } from '$site';
import type { PageServerLoad } from '../../lib/kit';

// The math notes in reading order, part by part and numbered through, and the map they make with
// the archive's documents that build on them. A site without parts lists its notes by title.
export const load: PageServerLoad = () => ({
    notes: cms.math.list().map(linkOf),
    parts: MATH_PARTS.map((part) => {
        const notes = cms.math.list(part.id);
        return {
            ...part,
            notes: notes.map(linkOf),
            start: notes.length ? cms.math.position(notes[0]!.key) : 1,
        };
    }),
    map: documentMap(),
});
