import { cms } from '$cms';

import { markdownOf } from '../../lib/server/markdown';
import { SITE } from '$site';
import type { RequestHandler } from '../../lib/kit';

export const prerender = true;

export const GET: RequestHandler = () => {
    const header = `# ${SITE.name}\n\n> ${SITE.description}\n`;
    const body = cms
        .all()
        .map((doc) => `\n---\n\n<!-- document: ${doc.key} -->\n\n${markdownOf(doc)}`);
    return new Response(header + body.join(''), {
        headers: { 'content-type': 'text/plain; charset=utf-8' },
    });
};
