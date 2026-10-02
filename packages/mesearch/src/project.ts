import fs from 'node:fs';
import path from 'node:path';

import { createCms, type Cms } from '@mvarble/mesearch-cms';
import { mesearchPreset } from '@mvarble/mesearch-cms/presets/mesearch';

import { loadConfig, type ResolvedConfig } from './config.ts';
import { BUILD_DIR, CONTENT_DIR, USER_CSS, WORK_DIR } from './paths.ts';

export interface Project {
    root: string;
    contentDir: string;
    workDir: string;
    config: ResolvedConfig;
    cms: Cms;
    // `mesearch.css`, when the project has one.
    userCss?: string;
    // Where `mesearch build` writes; set by the CLI.
    outDir: string;
    watch: boolean;
}

export interface ProjectOptions {
    outDir?: string;
    base?: string;
    watch?: boolean;
}

// The CLI's options also travel through the environment: SvelteKit prerenders
// in a child process, which reads the project afresh and has to agree with
// the parent about where the site goes and what it is served under.
export const ENV = { outDir: 'MESEARCH_OUT_DIR', base: 'MESEARCH_BASE', watch: 'MESEARCH_WATCH' };

export function exportOptions(options: ProjectOptions) {
    if (options.outDir !== undefined) process.env[ENV.outDir] = path.resolve(options.outDir);
    if (options.base !== undefined) process.env[ENV.base] = options.base;
    if (options.watch !== undefined) process.env[ENV.watch] = options.watch ? '1' : '';
}

// The project a directory belongs to: the nearest one up the tree with a
// `package.json` that depends on mesearch, or with a `content/` folder, or else
// the directory itself.
export function findRoot(from: string): string {
    for (let dir = path.resolve(from); ; dir = path.dirname(dir)) {
        const manifest = path.join(dir, 'package.json');
        if (fs.existsSync(manifest)) {
            try {
                const data = JSON.parse(fs.readFileSync(manifest, 'utf8')) as Record<
                    string,
                    unknown
                >;
                const deps = {
                    ...(data.dependencies as object),
                    ...(data.devDependencies as object),
                };
                if ('@mvarble/mesearch' in deps) return dir;
            } catch {
                // An unreadable manifest is not this project's.
            }
        }
        if (fs.existsSync(path.join(dir, CONTENT_DIR))) return dir;
        if (path.dirname(dir) == dir) return path.resolve(from);
    }
}

// The SvelteKit config, the Vite config and the CLI all need the one content
// store, so that what the markdown pipeline resolves and what the routes query
// are the same. They are loaded as separate module instances --- Vite bundles
// its config file, SvelteKit imports its own --- so the project is shared
// through a global keyed by its root.
const KEY = (root: string) => Symbol.for(`mesearch:project:${root}`);

export async function openProject(root: string, given: ProjectOptions = {}): Promise<Project> {
    const options: ProjectOptions = {
        outDir: given.outDir ?? process.env[ENV.outDir],
        base: given.base ?? process.env[ENV.base],
        watch: given.watch ?? !!process.env[ENV.watch],
    };
    const registry = globalThis as Record<symbol, Promise<Project> | undefined>;
    const existing = registry[KEY(root)];
    if (existing) return existing;
    const project = (async (): Promise<Project> => {
        const config = await loadConfig(root);
        if (options.base !== undefined)
            config.base = options.base == '/' ? '' : options.base.replace(/\/+$/, '');
        const cms = createCms({
            root,
            preset: mesearchPreset({ contentDir: CONTENT_DIR, base: config.base }),
            macros: config.katexMacros,
            virtualId: '$cms',
            label: 'mesearch',
            reload: 'data',
        });
        const userCss = path.join(root, USER_CSS);
        return {
            root,
            contentDir: path.join(root, CONTENT_DIR),
            workDir: path.join(root, WORK_DIR),
            config,
            cms,
            userCss: fs.existsSync(userCss) ? userCss : undefined,
            outDir: path.resolve(root, options.outDir ?? BUILD_DIR),
            watch: options.watch ?? false,
        };
    })();
    registry[KEY(root)] = project;
    return project;
}

// Forget a project, so the next `openProject` reads its config afresh.
export function closeProject(root: string) {
    delete (globalThis as Record<symbol, unknown>)[KEY(root)];
}
