import type { Handle } from '@sveltejs/kit';
import site from '$site';

// The shell's `lang` comes from the site's config.
export const handle: Handle = ({ event, resolve }) =>
    resolve(event, {
        transformPageChunk: ({ html }) => html.replace('%mesearch.lang%', site.lang),
    });
