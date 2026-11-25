import { cms } from '$cms';

import { resolve } from '$app/paths';
import { markdownHrefOf } from '../../lib/documents';
import { ARCHIVE, LLMS, MATH, SITE, TRACKS } from '$site';
import type { RequestHandler } from '../../lib/kit';

export const prerender = true;

// The index format of https://llmstxt.org: a title, a one-paragraph summary, then one section per
// track, the math notes and the archive, listing each document's Markdown with its summary. Links
// are absolute when the build knows where the site is hosted (`SITE_URL=https://example.org`),
// and root-relative otherwise.
export const GET: RequestHandler = () => {
    const origin = (process.env.SITE_URL ?? '').replace(/\/$/, '');
    const link = (key: string) => `${origin}${markdownHrefOf(key)}`;
    const lines = [
        `# ${SITE.name}`,
        '',
        `> ${SITE.description}`,
        '',
        `Every document below links to its Markdown source. ${LLMS.about} ` +
            `Everything concatenated: ${origin}${resolve('/llms-full.txt')}`,
        `Source: ${SITE.repo}`,
    ];
    const section = (
        title: string,
        blurb: string,
        docs: { key: string; title: string; summary: string }[],
    ) => {
        lines.push('', `## ${title}`, '', blurb, '');
        for (const doc of docs) lines.push(`- [${doc.title}](${link(doc.key)}): ${doc.summary}`);
    };
    for (const track of TRACKS) section(track.title, track.blurb, cms.pages.list(track.id));
    section(MATH.title, MATH.blurb, cms.math.list());
    section(
        ARCHIVE.title,
        ARCHIVE.blurb,
        cms.archive.list().flatMap((entry) => [
            { ...entry, summary: `(${entry.status}) ${entry.summary}` },
            ...cms.archive.documents(entry.key).map((doc) => ({
                ...doc,
                title: `${entry.title}: ${doc.title}`,
            })),
        ]),
    );
    return new Response(lines.join('\n') + '\n', {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
};
