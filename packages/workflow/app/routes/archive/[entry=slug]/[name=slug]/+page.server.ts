import { cms } from '$cms';

import { documentData } from '../../../../lib/server/document';
import type { EntryGenerator, PageServerLoad } from '../../../../lib/kit';

export const entries: EntryGenerator = () =>
    cms.archive
        .list()
        .flatMap((entry) =>
            cms.archive.documents(entry.key).map((doc) => ({ entry: entry.slug, name: doc.name })),
        );

export const load: PageServerLoad = ({ params }) =>
    documentData(`archive/${params.entry}/${params.name}`);
