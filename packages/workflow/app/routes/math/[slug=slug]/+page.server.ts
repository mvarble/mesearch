import { cms } from '$cms';

import { documentData } from '../../../lib/server/document';
import type { EntryGenerator, PageServerLoad } from '../../../lib/kit';

export const entries: EntryGenerator = () => cms.math.list().map((note) => ({ slug: note.slug }));

export const load: PageServerLoad = ({ params }) => documentData(`math/${params.slug}`);
