import { cms } from '$cms';

import { documentData } from '../../../lib/server/document';
import type { EntryGenerator, PageServerLoad } from '../../../lib/kit';

export const entries: EntryGenerator = () =>
    cms.archive.list().map((entry) => ({ entry: entry.slug }));

export const load: PageServerLoad = ({ params }) => documentData(`archive/${params.entry}`);
