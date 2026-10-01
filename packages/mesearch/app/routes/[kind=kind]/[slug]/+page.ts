import { error } from '@sveltejs/kit';
import loaders from '$cms/loaders';

export const load = async ({ data }) => {
    const loader = loaders[data.filename];
    if (!loader) error(404, `${data.filename} is not a document.`);
    return { ...data, Content: (await loader()).default };
};
