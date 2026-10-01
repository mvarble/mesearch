import type { Component } from 'svelte';
import loaders from '$cms/loaders';

const component = async (filename: string | undefined) =>
    filename && loaders[filename] ? (await loaders[filename]()).default : undefined;

// The site's description, and every document's, as components: the home page
// shows the first and the graph's panel the others.
export const load = async ({ data }) => {
    const descriptions: Record<string, Component> = {};
    await Promise.all(
        data.documents.map(async (doc) => {
            const loaded = await component(doc.descriptionFilename);
            if (loaded) descriptions[doc.key] = loaded;
        }),
    );
    return { ...data, Description: await component(data.description), descriptions };
};
