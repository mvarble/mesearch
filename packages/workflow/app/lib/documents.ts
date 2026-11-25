import { resolve } from '$app/paths';
import type { SiteDocument } from '@mvarble/mesearch-workflow/preset';

export type {
    Heading,
    SiteDocument,
    SiteEntry,
    SiteEntryDocument,
    SiteMath,
    SitePage,
    WorkflowEvent,
} from '@mvarble/mesearch-workflow/preset';

// What the navigation and the lists of documents need of one, small enough to send with every
// page.
export interface DocumentLink {
    key: string;
    kind: SiteDocument['kind'];
    title: string;
    href: string;
    summary: string;
    status?: string;
}

// A document's URL, from its key: `<track>/<slug>`, `math/<slug>`, `archive/<slug>` or
// `archive/<slug>/<name>`.
export function hrefOf(key: string): string {
    const [first, second, third] = key.split('/') as [string, string, string?];
    if (first == 'math') return resolve('/math/[slug=slug]', { slug: second });
    if (first == 'archive') {
        return third
            ? resolve('/archive/[entry=slug]/[name=slug]', { entry: second, name: third })
            : resolve('/archive/[entry=slug]', { entry: second });
    }
    return resolve('/[track=track]/[slug=slug]', { track: first, slug: second });
}

// The Markdown version of a document.
export function markdownHrefOf(key: string): string {
    return resolve('/[...key].md', { key });
}

export function linkOf(record: SiteDocument): DocumentLink {
    return {
        key: record.key,
        kind: record.kind,
        title: record.title,
        href: hrefOf(record.key),
        summary: record.summary,
        ...(record.kind == 'entry' ? { status: record.status } : {}),
    };
}
