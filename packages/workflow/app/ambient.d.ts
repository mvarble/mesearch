// The modules the app reads from the project, which `docsSite()` serves. A site's `src/app.d.ts`
// takes these with `/// <reference types="@mvarble/mesearch-workflow/ambient" />`.

declare module '$site' {
    import type { Component } from 'svelte';

    interface Section {
        id: string;
        title: string;
        short: string;
        blurb: string;
    }

    export const SITE: {
        name: string;
        tagline: string;
        description: string;
        repo: string;
        branch: string;
        version: string;
    };
    export const TRACKS: Section[];
    export const MATH: Section;
    export const MATH_PARTS: { id: string; title: string; blurb: string }[];
    /** `about`, when given, is the paragraph the archive's page opens with. */
    export const ARCHIVE: Section & { about?: string };
    export const DOCUMENTS: readonly { name: string; title: string }[];
    export const KIND_LABELS: Record<string, string>;
    export const STATUS_LABELS: Record<string, string>;
    export const STAGES: Record<string, string[]>;
    export const STAGE_LABELS: Record<string, string>;
    export const STAGE_COMMANDS: Record<string, string>;
    /** `about` follows "Every document below links to its Markdown source." in `llms.txt`. */
    export const LLMS: { about: string };
    /** `mathBefore`: the track the math notes are listed before; after the last by default. */
    export const NAV: { mathBefore?: string };
    export const THEME_KEY: string;
    export const katex: { macros?: Record<string, string>; [option: string]: unknown };
    export const Logo: Component<{ variant: 'icon' | 'lockup' }>;
}

declare module '$site/server' {
    import type { SiteHooks } from '@mvarble/mesearch-workflow';
    export const hooks: SiteHooks;
}

// The content database, which `docsSite()` serves under these names.
declare module '$cms' {
    import type { SiteCms } from '@mvarble/mesearch-workflow/preset';
    export const cms: SiteCms;
}

declare module '$cms/loaders' {
    import type { Component } from 'svelte';
    const loaders: Record<string, () => Promise<{ default: Component }>>;
    export default loaders;
}

declare module '*.svx' {
    import type { Component } from 'svelte';
    const component: Component;
    export default component;
    export const metadata: Record<string, unknown>;
}

declare module '*.md' {
    import type { Component } from 'svelte';
    const component: Component;
    export default component;
    export const metadata: Record<string, unknown>;
}
