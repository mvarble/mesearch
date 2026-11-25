import loaders from '$cms/loaders';

// The landing prose is a document like any other, attached as a component.
export const load = async ({ data }: { data: { landing?: string } }) => ({
    ...data,
    component: data.landing ? (await loaders[data.landing]!()).default : undefined,
});
