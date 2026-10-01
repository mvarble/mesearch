import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Config } from '@sveltejs/kit';
import type { Plugin, UserConfig } from 'vite';

import { markdownPreprocessors } from '@mvarble/mesearch-markdown';

import { rehypeDemoteHeadings } from './headings.ts';
import { appDir, packageDir } from './paths.ts';
import { openProject, type Project } from './project.ts';
import { pinDependencies } from './resolve.ts';

// The SvelteKit config a project is built with. A project has no
// `svelte.config.js` of its own: the CLI writes one into `.mesearch/` that only
// calls this.
export async function svelteConfig(root: string): Promise<Config> {
    const project = await openProject(root);
    const { cms, config } = project;
    const staticDir = path.join(root, 'static');
    return {
        extensions: ['.svelte', '.svx', '.md'],
        preprocess: markdownPreprocessors({
            remarkPlugins: [cms.remark],
            rehypePlugins: [rehypeDemoteHeadings],
            katex: { macros: cms.macrosFor, label: 'mesearch', watch: project.watch },
            mathBox: { liftTags: true },
            watch: project.watch,
        }),
        compilerOptions: {
            // mesearch's own components are written in runes mode; a
            // project's documents and components are left to Svelte to
            // detect, so either style works there.
            runes: ({ filename }) => (filename && isInside(appDir, filename) ? true : undefined),
        },
        kit: {
            adapter: adapter({ pages: project.outDir, assets: project.outDir, strict: true }),
            outDir: path.join(project.workDir, 'kit'),
            files: {
                routes: path.join(appDir, 'routes'),
                lib: path.join(appDir, 'lib'),
                params: path.join(appDir, 'params'),
                appTemplate: path.join(appDir, 'app.html'),
                errorTemplate: path.join(appDir, 'error.html'),
                hooks: {
                    client: path.join(appDir, 'hooks.client'),
                    server: path.join(appDir, 'hooks.server'),
                    universal: path.join(appDir, 'hooks'),
                },
                serviceWorker: path.join(appDir, 'service-worker'),
                assets: fs.existsSync(staticDir) ? staticDir : path.join(appDir, 'static'),
            },
            paths: { base: config.base as '' | `/${string}` },
            alias: { $docs: project.docsDir },
            prerender: {
                entries: ['*'],
                // A broken link in a document is the author's to fix, not a
                // reason to refuse to build the rest of the site.
                handleHttpError: 'warn',
                handleMissingId: 'warn',
            },
        },
    };
}

// The Vite config. The CLI writes a `vite.config.js` into `.mesearch/` that
// only calls this, so that SvelteKit --- which re-reads the config file for
// its own builds --- sees exactly what the CLI does.
export async function viteConfig(root: string): Promise<UserConfig> {
    const project = await openProject(root);
    return {
        root: project.workDir,
        cacheDir: path.join(project.workDir, 'vite'),
        envDir: root,
        plugins: [...project.cms.vite(), sitePlugin(project), ...pinDependencies(), sveltekit()],
        server: {
            fs: { allow: [root, packageDir, ...dependencyRoots()] },
        },
        optimizeDeps: {
            // The app ships as Svelte source inside this package, which Vite
            // would otherwise try to pre-bundle as if it were a library. And
            // Svelte itself is never pre-bundled: a project's documents reach
            // it from outside this package, the app from inside, and a
            // pre-bundled copy for one and the source for the other would be
            // two runtimes.
            exclude: [
                '@mvarble/mesearch',
                '@mvarble/mesearch-cms',
                '@mvarble/mesearch-markdown',
                '@mvarble/mesearch-ui',
                'svelte',
            ],
        },
        ssr: { noExternal: ['@mvarble/mesearch', '@mvarble/mesearch-ui'] },
        build: {
            chunkSizeWarningLimit: 2000,
            // A report on how long each plugin took is for whoever works on
            // mesearch, not for someone building their notes.
            rolldownOptions: { checks: { pluginTimings: false } },
        },
    };
}

const require = createRequire(import.meta.url);

const SITE_ID = '$site';
const USER_CSS_ID = '$site/user-styles';

// What the app needs to know about the site that is not content: its title
// and base, the graph's tuning, and the project's own stylesheet.
function sitePlugin(project: Project): Plugin {
    return {
        name: 'mesearch:site',
        enforce: 'pre',
        resolveId(id) {
            if (id == SITE_ID || id == USER_CSS_ID) return `\0${id}`;
            return null;
        },
        load(id) {
            if (id == `\0${SITE_ID}`) {
                const { title, author, lang, base, graph, katexMacros } = project.config;
                const site = { title, author, lang, base, graph, katexMacros };
                return `export default ${JSON.stringify(site)};\n`;
            }
            if (id == `\0${USER_CSS_ID}`) {
                return project.userCss ? `import ${JSON.stringify(project.userCss)};\n` : '';
            }
            return null;
        },
        configureServer(server) {
            // Outside Vite's root, so watched explicitly. A change to the
            // config means a different site, so the server starts over.
            const config = project.config.file;
            if (config) {
                server.watcher.add(config);
                server.watcher.on('change', (file) => {
                    if (path.resolve(file) == config) {
                        console.log('mesearch: the config changed, restarting');
                        void server.restart();
                    }
                });
            }
            const css = path.join(project.root, 'mesearch.css');
            server.watcher.add(css);
            server.watcher.on('add', (file) => {
                if (path.resolve(file) == css && !project.userCss) {
                    console.log('mesearch: found mesearch.css, restarting');
                    void server.restart();
                }
            });
        },
    };
}

const isInside = (dir: string, file: string) => file == dir || file.startsWith(dir + path.sep);

// Packages whose files --- fonts, mostly --- the dev server serves directly.
// Under pnpm they sit beside this package rather than inside it.
function dependencyRoots(): string[] {
    const roots = new Set<string>();
    const add = (from: NodeJS.Require, name: string) => {
        try {
            const root = path.dirname(from.resolve(`${name}/package.json`));
            roots.add(root);
            return root;
        } catch {
            // Not installed where expected; Vite will say so if it matters.
            return undefined;
        }
    };
    add(require, 'katex');
    // The fonts are the UI package's dependencies, found from there.
    const ui = add(require, '@mvarble/mesearch-ui');
    if (ui) {
        const fromUi = createRequire(path.join(ui, 'package.json'));
        for (const name of [
            'katex',
            '@fontsource-variable/inter',
            '@fontsource-variable/source-serif-4',
            '@fontsource/fira-mono',
        ]) {
            add(fromUi, name);
        }
    }
    return [...roots];
}
