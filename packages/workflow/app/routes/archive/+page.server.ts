import { cms } from '$cms';

import { linkOf } from '../../lib/documents';
import { documentMap } from '../../lib/server/map';
import type { PageServerLoad } from '../../lib/kit';

// Entries in progress first, then those done, then those set aside; newest first within each. The
// map is the one on the Mathematics page: the archive's documents are part of it.
export const load: PageServerLoad = () => {
    const entries = cms.archive.list();
    const group = (status: string) => entries.filter((e) => e.status == status).map(linkOf);
    return {
        active: group('active'),
        done: group('done'),
        abandoned: group('abandoned'),
        map: documentMap(),
    };
};
