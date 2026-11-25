import { error } from '@sveltejs/kit';
import { cms } from '$cms';

import { markdownOf } from '../../lib/server/markdown';
import type { EntryGenerator, RequestHandler } from '../../lib/kit';

export const prerender = true;
export const trailingSlash = 'never';

export const entries: EntryGenerator = () => cms.all().map((doc) => ({ key: doc.key }));

// Every document as Markdown, at its URL with `.md` in place of the trailing slash.
export const GET: RequestHandler = ({ params }) => {
    const doc = cms.get(params.key);
    if (!doc) error(404);
    return new Response(markdownOf(doc), {
        headers: { 'content-type': 'text/markdown; charset=utf-8' },
    });
};
