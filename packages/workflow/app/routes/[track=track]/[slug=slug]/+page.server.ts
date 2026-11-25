import { cms } from '$cms';

import { documentData } from '../../../lib/server/document';
import type { EntryGenerator, PageServerLoad } from '../../../lib/kit';

export const entries: EntryGenerator = () =>
    cms.pages.list().map((page) => ({ track: page.track, slug: page.slug }));

export const load: PageServerLoad = ({ params }) => documentData(`${params.track}/${params.slug}`);
