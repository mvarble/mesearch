import fs from 'node:fs';
import path from 'node:path';

import { cms } from '$cms';

import { hrefOf, linkOf, type DocumentLink } from '../documents';
import { questionsIn, type OpenQuestion } from '../questions';

export interface OpenEntryData {
    link: DocumentLink;
    kind: string;
    stage: string;
    approvals: Record<string, { stale?: boolean }>;
    questions: OpenQuestion[];
}

// The entries in progress, with what is still open in each. The content database reads from
// `site/`, which is where its filenames start.
export function openEntries(): OpenEntryData[] {
    return cms.archive
        .list()
        .filter((entry) => entry.status == 'active' && entry.workflow)
        .map((entry) => ({
            link: linkOf(entry),
            kind: entry.workflow!.kind,
            stage: entry.workflow!.stage,
            approvals: entry.workflow!.approvals as Record<string, { stale?: boolean }>,
            questions: [entry, ...cms.archive.documents(entry.key)].flatMap((doc) =>
                questionsIn(
                    fs.readFileSync(path.resolve(process.cwd(), doc.filename), 'utf8'),
                    hrefOf(doc.key),
                ),
            ),
        }));
}
