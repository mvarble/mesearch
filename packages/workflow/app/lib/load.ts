import loaders from '$cms/loaders';
import type { Component } from 'svelte';

// A document's body is a compiled component, which cannot travel as data from the server: each
// document route's `+page.ts` attaches it here, by the filename the server load sent.
export async function withComponent<T extends { doc: { filename: string } }>(
    data: T,
): Promise<T & { component: Component }> {
    const load = loaders[data.doc.filename];
    if (!load) throw new Error(`No component for ${data.doc.filename}.`);
    return { ...data, component: (await load()).default };
}
