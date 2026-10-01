// Modules served by mesearch's Vite plugins.

declare module '$cms' {
    export const cms: import('@mvarble/mesearch-cms/presets/mesearch').MesearchCms;
}

declare module '$cms/loaders' {
    const loaders: Record<string, () => Promise<{ default: import('svelte').Component }>>;
    export default loaders;
}

declare module '$site' {
    const site: {
        title: string;
        author?: string;
        lang: string;
        base: string;
        katexMacros: Record<string, string>;
        graph: { charge: number; linkDistance: number; gravity: number };
    };
    export default site;
}

declare module '$site/user-styles';
