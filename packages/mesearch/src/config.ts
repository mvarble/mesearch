import fs from 'node:fs';
import path from 'node:path';

import { CONFIG_FILES } from './paths.ts';

export interface GraphConfig {
    // Repulsion between every pair of nodes. More negative spreads them out.
    charge?: number;
    // The resting length of a solid edge; a dashed one rests twice as long.
    linkDistance?: number;
    // The pull towards the centre that keeps unconnected nodes in view.
    gravity?: number;
}

export interface MesearchConfig {
    // The site's name: the browser tab, the home page, the monogram.
    title?: string;
    author?: string;
    lang?: string;
    // The URL prefix the site is served from, such as '/math'. Empty for a
    // site at the root of its domain.
    base?: string;
    // KaTeX macros every document gets, over mesearch's own table and under
    // each document's frontmatter.
    katexMacros?: Record<string, string>;
    graph?: GraphConfig;
}

// Typed identity, so an editor can check `mesearch.config.ts`.
export const defineConfig = (config: MesearchConfig) => config;

export interface ResolvedConfig {
    title: string;
    author?: string;
    lang: string;
    base: string;
    katexMacros: Record<string, string>;
    graph: Required<GraphConfig>;
    // The file it came from, if any.
    file?: string;
}

export function findConfigFile(root: string): string | undefined {
    return CONFIG_FILES.map((name) => path.join(root, name)).find((file) => fs.existsSync(file));
}

// Loads `mesearch.config.ts` through Vite's module runner, so the config can be
// TypeScript and can import whatever the project has installed.
export async function loadConfig(root: string): Promise<ResolvedConfig> {
    const file = findConfigFile(root);
    let raw: unknown = {};
    if (file) {
        const { runnerImport } = await import('vite');
        const { module } = await runnerImport<{ default?: unknown }>(file, {
            configFile: false,
            root,
            logLevel: 'error',
        });
        raw = module.default ?? {};
    }
    return validate(raw, file, path.basename(root));
}

// Every problem with the config at once, rather than the first.
export function validate(
    raw: unknown,
    file: string | undefined,
    fallbackTitle: string,
): ResolvedConfig {
    const where = file ? path.basename(file) : 'the config';
    const problems: string[] = [];
    const config = (raw && typeof raw == 'object' ? raw : {}) as Record<string, unknown>;
    if (raw && typeof raw != 'object') problems.push(`${where} must export an object.`);

    const string = (field: string): string | undefined => {
        const value = config[field];
        if (value === undefined) return undefined;
        if (typeof value != 'string') problems.push(`${where}: \`${field}\` must be a string.`);
        return typeof value == 'string' ? value : undefined;
    };
    const number = (object: Record<string, unknown>, field: string, fallback: number) => {
        const value = object[field];
        if (value === undefined) return fallback;
        if (typeof value != 'number' || !Number.isFinite(value)) {
            problems.push(`${where}: \`graph.${field}\` must be a number.`);
            return fallback;
        }
        return value;
    };

    let base = string('base') ?? '';
    if (base == '/') base = '';
    if (base && (!base.startsWith('/') || base.endsWith('/'))) {
        problems.push(
            `${where}: \`base\` must start with a slash and not end with one, as in '/notes'.`,
        );
    }

    const macros = config.katexMacros ?? {};
    if (
        typeof macros != 'object' ||
        Array.isArray(macros) ||
        Object.values(macros as object).some((value) => typeof value != 'string')
    ) {
        problems.push(`${where}: \`katexMacros\` must map macro names to strings.`);
    }

    const graph = (config.graph ?? {}) as Record<string, unknown>;
    if (typeof graph != 'object') problems.push(`${where}: \`graph\` must be an object.`);

    const resolved: ResolvedConfig = {
        title: string('title') ?? fallbackTitle,
        author: string('author'),
        lang: string('lang') ?? 'en',
        base,
        katexMacros: typeof macros == 'object' ? (macros as Record<string, string>) : {},
        graph: {
            charge: number(graph, 'charge', -900),
            linkDistance: number(graph, 'linkDistance', 80),
            gravity: number(graph, 'gravity', 0.02),
        },
        file,
    };
    if (problems.length) throw new Error(problems.map((p) => `mesearch: ${p}`).join('\n'));
    return resolved;
}
