// The Vite plugins of a project's documentation site: the content database with the docs preset,
// SvelteKit with mdsvex, and `$site`, which hands the app shipped in this package what is the
// project's own. A site's `vite.config.ts` is then
//
//     export default defineConfig({ plugins: await docsSite() });
//
// The site lives in `site/` of the repository it documents, and is laid out by convention:
//
//     src/lib/site.ts                 its structure: SITE, TRACKS, MATH, ARCHIVE, DOCUMENTS, ...
//     src/lib/components/Logo.svelte  its logo, as `<Logo variant="icon" | "lockup" />`
//     src/lib/server/site.ts          optional: `hooks`, its own additions to the shared pages
//     katex.config.ts                 its KaTeX macros, as `{ macros }`
//     ../workflow.config.ts           the workflow, whose kinds and stages the archive shows
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { createCms } from '@mvarble/mesearch-cms';
import {
    quotingHighlighter,
    rehypeHeadingAnchors,
    rehypeKatex,
    rehypeMathBox,
    remarkCallouts,
    type PluginEntry,
} from '@mvarble/mesearch-markdown';
import { mdsvex } from 'mdsvex';
import remarkMath from 'remark-math';
import type { Plugin } from 'vite';

import type { WorkflowConfig } from '../engine/config.ts';
import { docsPreset } from './preset/index.ts';

export interface DocsSiteOptions {
    /** The site's directory, `site/` of the repository; the working directory by default. */
    root?: string;
    /** Where the documents are, from `root`: `$SITE_CONTENT`, else `content`. */
    contentDir?: string;
    /** The URL prefix the site is served under: `$BASE_PATH`, else the root of its domain. */
    base?: string;
    /** The site's own Markdown plugins, run after the shared ones. */
    remarkPlugins?: PluginEntry[];
    rehypePlugins?: PluginEntry[];
}

// What a site's `src/lib/site.ts` holds, as far as the build reads it.
interface SiteModule {
    SITE: { name: string; repo: string; branch?: string };
    TRACKS: { id: string; title: string }[];
    MATH: { id: string; title: string };
    MATH_PARTS?: { id: string }[];
    ARCHIVE: { id: string; title: string };
    DOCUMENTS: readonly { name: string; title: string }[];
    [name: string]: unknown;
}

// The app ships as Svelte source inside this package, which Vite would otherwise try to
// pre-bundle as if it were a library, and leave unprocessed on the server, where it reads `$cms`,
// `$site` and `$app`. Svelte itself is never pre-bundled, so that the app and the project's
// documents share one runtime.
const PACKAGE = '@mvarble/mesearch-workflow';
const NOT_PREBUNDLED = [
    PACKAGE,
    '@mvarble/mesearch-cms',
    '@mvarble/mesearch-markdown',
    '@mvarble/mesearch-ui',
    'svelte',
];

export async function docsSite(options: DocsSiteOptions = {}): Promise<Plugin[]> {
    const root = path.resolve(options.root ?? process.cwd());
    const repo = path.dirname(root);
    const files = {
        site: path.join(root, 'src/lib/site.ts'),
        logo: path.join(root, 'src/lib/components/Logo.svelte'),
        hooks: path.join(root, 'src/lib/server/site.ts'),
        katex: path.join(root, 'katex.config.ts'),
        workflow: path.join(repo, 'workflow.config.ts'),
    };
    const load = async <T>(file: string): Promise<T> =>
        (await import(pathToFileURL(file).href)) as T;
    const site = await load<SiteModule>(files.site);
    const katex = (await load<{ default: { macros?: Record<string, string> } }>(files.katex))
        .default;
    const workflow = fs.existsSync(files.workflow)
        ? (await load<{ default: WorkflowConfig }>(files.workflow)).default
        : undefined;

    const base = (options.base ?? process.env.BASE_PATH ?? '') as '' | `/${string}`;
    const cms = createCms({
        preset: docsPreset({
            contentDir: options.contentDir ?? process.env.SITE_CONTENT ?? 'content',
            tracks: site.TRACKS.map((track) => track.id),
            parts: (site.MATH_PARTS ?? []).map((part) => part.id),
            documents: Object.fromEntries(site.DOCUMENTS.map((doc) => [doc.name, doc.title])),
            sectionTitles: Object.fromEntries(
                [...site.TRACKS, site.MATH, site.ARCHIVE].map((section) => [
                    section.id,
                    section.title,
                ]),
            ),
            base,
        }),
        macros: katex.macros,
        virtualId: '$cms',
    });

    // The content database and SvelteKit may be typed against another copy of Vite than this
    // package's, whose `Plugin` types do not line up even where the plugins do.
    return [
        ...(cms.vite() as unknown as Plugin[]),
        sitePlugin(files, site, workflow),
        {
            name: 'mesearch-workflow:config',
            config: () => ({
                optimizeDeps: { exclude: NOT_PREBUNDLED },
                ssr: { noExternal: [PACKAGE], optimizeDeps: { exclude: NOT_PREBUNDLED } },
                // File references quote from anywhere in the repository.
                server: { fs: { allow: [repo] } },
                // A math-heavy page is one chunk of pre-rendered KaTeX markup, large by nature.
                build: { chunkSizeWarningLimit: 1000 },
            }),
        },
        ...((await sveltekit({
            compilerOptions: {
                // Runes mode for the site and this package's app, but not for other libraries.
                runes: ({ filename }: { filename: string }) =>
                    filename.split(/[/\\]/).includes('node_modules') && !filename.includes(PACKAGE)
                        ? undefined
                        : true,
                // mdsvex 0.12 still emits `<script context="module">` for frontmatter.
                warningFilter: (warning: { code: string }) =>
                    warning.code != 'script_context_deprecated',
            },
            adapter: adapter({ strict: true }),
            paths: { base, relative: false },
            prerender: {
                entries: ['*', '/llms.txt', '/llms-full.txt'],
                // A collection with no documents yet (no math notes, an empty archive) leaves its
                // document route with nothing to render.
                handleUnseenRoutes: 'ignore',
            },
            preprocess: [
                mdsvex({
                    remarkPlugins: [
                        remarkMath,
                        remarkCallouts,
                        cms.remark,
                        ...(options.remarkPlugins ?? []),
                    ],
                    // mdsvex runs an older unified than the shared plugins are typed against.
                    rehypePlugins: [
                        rehypeHeadingAnchors,
                        [rehypeKatex, { macros: cms.macrosFor }],
                        [rehypeMathBox, { liftTags: true }],
                        ...(options.rehypePlugins ?? []),
                    ] as PluginEntry[],
                    highlight: {
                        highlighter: quotingHighlighter({
                            root: repo,
                            repoUrl: site.SITE.repo,
                            branch: site.SITE.branch ?? 'main',
                        }),
                    },
                    extensions: ['.svx', '.md'],
                }),
            ],
            extensions: ['.svelte', '.svx', '.md'],
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)) as unknown as Plugin[]),
    ];
}

const SITE_ID = '$site';
const SERVER_ID = '$site/server';

// `$site`: the site's structure, with the defaults of what it may leave out, its logo, its macros,
// and the workflow's kinds and stages. `$site/server`: its hooks, or none.
function sitePlugin(
    files: Record<'site' | 'logo' | 'hooks' | 'katex', string>,
    site: SiteModule,
    workflow: WorkflowConfig | undefined,
): Plugin {
    const json = (value: unknown) => JSON.stringify(value);
    const capitalized = (word: string) => word.slice(0, 1).toUpperCase() + word.slice(1);
    const slug = (text: string) =>
        text
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');
    const kinds = workflow?.kinds ?? {};
    const stages = Object.keys(workflow?.stages ?? {});
    const defaults: Record<string, unknown> = {
        MATH_PARTS: [],
        NAV: {},
        THEME_KEY: `${slug(site.SITE.name)}:theme`,
        LLMS: {
            about:
                `The pages say what ${site.SITE.name} is now; the Archive keeps how each part ` +
                'came to be, and may describe what has since changed.',
        },
        KIND_LABELS: Object.fromEntries(
            Object.keys(kinds).map((kind) => [kind, capitalized(kind)]),
        ),
        STATUS_LABELS: { active: 'In progress', done: 'Done', abandoned: 'Abandoned' },
        STAGES: Object.fromEntries(
            Object.entries(kinds).map(([kind, { stages }]) => [kind, stages]),
        ),
        STAGE_LABELS: Object.fromEntries(stages.map((stage) => [stage, capitalized(stage)])),
        STAGE_COMMANDS: Object.fromEntries(
            stages.map((stage) => [stage, workflow!.stages[stage]!.skill ?? `/wf-${stage}`]),
        ),
    };
    const required = ['SITE', 'TRACKS', 'MATH', 'ARCHIVE', 'DOCUMENTS'];
    return {
        name: 'mesearch-workflow:site',
        enforce: 'pre',
        resolveId(id) {
            if (id == SITE_ID || id == SERVER_ID) return `\0${id}`;
            return null;
        },
        load(id) {
            if (id == `\0${SITE_ID}`) {
                const own = (name: string) => Object.hasOwn(site, name);
                for (const name of required) {
                    if (!own(name)) throw new Error(`${files.site} exports no \`${name}\`.`);
                }
                const from = json(files.site);
                return [
                    `export { ${[...required, ...Object.keys(defaults).filter(own)].join(', ')} } from ${from};`,
                    ...Object.entries(defaults)
                        .filter(([name]) => !own(name))
                        .map(([name, value]) => `export const ${name} = ${json(value)};`),
                    `export { default as katex } from ${json(files.katex)};`,
                    `export { default as Logo } from ${json(files.logo)};`,
                ].join('\n');
            }
            if (id == `\0${SERVER_ID}`) {
                return fs.existsSync(files.hooks)
                    ? `export { hooks } from ${json(files.hooks)};`
                    : 'export const hooks = {};';
            }
            return null;
        },
    };
}
