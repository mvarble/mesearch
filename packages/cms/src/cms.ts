import { fileURLToPath } from 'node:url';
import { uneval } from 'devalue';
import type { Plugin, ViteDevServer } from 'vite';

import { documentMacros, type KatexMacros } from '@mvarble/mesearch-markdown/katex';

import { buildStore, type Preset } from './core/build.ts';
import { allFacts, diffFacts } from './core/facts.ts';
import { toAbsolute, toId } from './core/paths.ts';
import { matchLink, type LinkNode, type MathNode } from './core/resolver.ts';
import type { Store } from './core/store.ts';

export interface CmsOptions {
    preset: Preset;
    // The project root every document id is relative to. The working directory
    // by default.
    root?: string;
    // The site-wide KaTeX macros, folded under every document's own.
    macros?: KatexMacros;
    // What the queries are imported as: `import { cms } from '<virtualId>'`.
    virtualId?: string;
    // Prefixes everything printed.
    label?: string;
}

export interface Cms {
    readonly root: string;
    readonly preset: Preset;
    // Built on first use; rebuilt by the dev server as content changes.
    readonly store: Store;
    build(): Store;
    // The Vite plugins: one that keeps the store current and serves the
    // queries, and one that appends `export const cms` to documents that have
    // something injected.
    vite(): Plugin[];
    // For mdsvex: rewrites references from what the store resolved, and gives
    // headings the ids the store's outline links to.
    remark: () => (tree: unknown, vfile: unknown) => void;
    // For `rehypeKatex`: the macros a document renders with.
    macrosFor(vfile: unknown): KatexMacros;
}

const RUNTIME_ID = 'virtual:mesearch-cms/runtime';
const here = fileURLToPath(import.meta.url);

// What was last printed for each root, so that the several passes of one build
// --- and the several copies of the config a SvelteKit build evaluates --- do
// not repeat themselves.
const lastReported = new Map<string, string>();

export function createCms(options: CmsOptions): Cms {
    const root = options.root ?? process.cwd();
    const { preset } = options;
    const virtualId = options.virtualId ?? 'virtual:mesearch-cms';
    const resolvedVirtualId = `\0${virtualId}`;
    const label = options.label ?? 'cms';
    // The dev server's queries read the live snapshot through here: the module
    // runner evaluates the virtual module in this same process, but in its own
    // module instance, so a shared global is the one thing both can see.
    const bridge = Symbol.for(`mesearch-cms:${root}:${virtualId}`);

    let store: Store | undefined;
    let facts = new Map<string, string>();
    let snapshot: unknown;
    let snapshotCode = '';
    let watching = false;

    function build(): Store {
        store = buildStore({ root, preset, macros: options.macros });
        facts = allFacts(store);
        snapshot = preset.snapshot(store);
        snapshotCode = uneval(snapshot);
        report(store);
        return store;
    }

    const current = () => store ?? build();

    function report(store: Store) {
        const messages = [...new Set(store.diagnostics.map((d) => d.message))];
        const signature = messages.join('\n');
        const previous = lastReported.get(root);
        lastReported.set(root, signature);
        if (signature == previous && !(watching && messages.length)) return;
        if (messages.length == 0) {
            if (previous) console.log(`${label}: content is consistent again`);
            return;
        }
        for (const message of messages) console.error(`${label}: ${message}`);
    }

    (globalThis as Record<symbol, unknown>)[bridge] = () => {
        current();
        return snapshot;
    };

    const isContent = (id: string) => {
        const rel = toId(root, id);
        return (
            !rel.startsWith('..') &&
            (rel + '/').startsWith(preset.contentDir.replace(/\/?$/, '/')) &&
            preset.include(rel)
        );
    };

    function vite(): Plugin[] {
        let server: ViteDevServer | undefined;
        let command: 'build' | 'serve' = 'build';
        let pending: NodeJS.Timeout | undefined;

        // Re-transform the documents whose output depends on what just changed.
        // Vite only invalidates the file that was edited, but a label is a
        // function of position, and a page's title is substituted into every
        // link to it: comparing each document's facts before and after says
        // exactly which documents those are.
        function rebuild() {
            const before = facts;
            const beforeSnapshot = snapshotCode;
            build();
            const changed = diffFacts(before, facts);
            if (!server || (changed.length == 0 && beforeSnapshot == snapshotCode)) return;
            for (const environment of Object.values(server.environments)) {
                const graph = environment.moduleGraph;
                for (const id of changed) {
                    const module = graph.getModuleById(toAbsolute(root, id));
                    if (module) graph.invalidateModule(module);
                }
                const virtual = graph.getModuleById(resolvedVirtualId);
                if (virtual) graph.invalidateModule(virtual);
            }
            server.hot.send({ type: 'full-reload' });
        }

        return [
            {
                name: 'mesearch-cms',
                enforce: 'pre',
                configResolved(config) {
                    command = config.command;
                    watching = command == 'serve';
                },
                configureServer(devServer) {
                    server = devServer;
                    server.watcher.add(toAbsolute(root, preset.contentDir));
                },
                buildStart() {
                    current();
                },
                // `watchChange` rather than `handleHotUpdate`: Vite only
                // dispatches the latter for edits, so a created or deleted
                // document would never reach the content layer. A single save
                // can emit several events --- adding a statement is usually a
                // create plus an edit to the page importing it --- so they are
                // coalesced into one rebuild.
                watchChange(id) {
                    if (!isContent(id)) return;
                    if (pending) clearTimeout(pending);
                    pending = setTimeout(() => {
                        pending = undefined;
                        rebuild();
                    }, 10);
                },
                async resolveId(id) {
                    if (id == virtualId) return resolvedVirtualId;
                    // Resolved from inside this package, so a site need not
                    // depend on it directly for the import to be found.
                    if (id == RUNTIME_ID)
                        return this.resolve(preset.runtime, here, { skipSelf: true });
                    return null;
                },
                load(id) {
                    if (id != resolvedVirtualId) return null;
                    const consumer = (this as { environment?: { config?: { consumer?: string } } })
                        .environment?.config?.consumer;
                    if (consumer == 'client') {
                        throw new Error(
                            `${label}: \`${virtualId}\` is server-only; import it from a ` +
                                '`+page.server` or `+layout.server` module.',
                        );
                    }
                    current();
                    if (command == 'serve') {
                        return (
                            `import { bindLive } from ${JSON.stringify(RUNTIME_ID)};\n` +
                            `export const cms = bindLive(() => globalThis[Symbol.for(${JSON.stringify(bridge.description)})]());\n`
                        );
                    }
                    return (
                        `import { bind } from ${JSON.stringify(RUNTIME_ID)};\n` +
                        `export const cms = bind(${snapshotCode});\n`
                    );
                },
            },
            {
                name: 'mesearch-cms:inject',
                enforce: 'post',
                transform(code, id) {
                    if (id.includes('?') || !isContent(id)) return null;
                    const injection = current().injection(toId(root, id));
                    if (!injection) return null;
                    return {
                        code: `${code}\nexport const cms = ${JSON.stringify(injection)};\n`,
                        map: null,
                    };
                },
            },
        ];
    }

    const remark = () => (tree: unknown, vfile: unknown) => {
        const filename = (vfile as { filename?: string }).filename;
        if (!filename) return;
        const store = current();
        const id = toId(root, filename);
        const doc = store.docs.get(id);
        if (!doc) return;

        type Node = {
            type: string;
            children?: Node[];
            depth?: number;
            data?: Record<string, unknown>;
        };
        const top = (tree as Node).children ?? [];

        // Headings get their ids by position among the same top-level headings
        // the store recorded. The two texts need not agree --- a heading with
        // math in it reaches the renderer as KaTeX markup --- so matching by
        // text would quietly produce anchors nothing links to.
        const headings = top.filter(
            (node) => node.type == 'heading' && (node.depth ?? 0) <= preset.headingDepth,
        );
        if (headings.length != doc.headings.length && doc.headings.length) {
            console.warn(
                `${label}: ${id}\n    found ${headings.length} headings to anchor, expected ` +
                    `${doc.headings.length}; some table-of-contents links may miss`,
            );
        }
        headings.forEach((node, i) => {
            const heading = doc.headings[i];
            if (!heading) return;
            node.data ??= {};
            node.data.hProperties = { ...(node.data.hProperties as object), id: heading.slug };
        });

        const nodes = top.toReversed();
        while (nodes.length > 0) {
            const node = nodes.pop()!;
            if (node.children?.length) nodes.push(...node.children.toReversed());
            if (node.type == 'math') {
                const math = node as unknown as MathNode;
                for (const resolver of preset.resolvers) {
                    if (!resolver.rewriteMath) continue;
                    for (const written of resolver.matchMath?.(math.value) ?? []) {
                        const ref = store.ref(id, resolver.name, written);
                        if (ref) resolver.rewriteMath(math, written, ref.target);
                    }
                }
            }
            if (node.type == 'link') {
                const link = node as unknown as LinkNode;
                const match = matchLink(preset.resolvers, link.url, store, doc);
                if (!match?.resolver.rewriteLink) continue;
                const ref = store.ref(id, match.resolver.name, match.written);
                if (ref) match.resolver.rewriteLink(link, ref.target);
            }
        }
    };

    function macrosFor(vfile: unknown): KatexMacros {
        const filename = (vfile as { filename?: string }).filename;
        const store = current();
        const id = filename ? toId(root, filename) : undefined;
        if (id && store.docs.has(id)) return store.foldedMacros(id);
        return { ...store.siteMacros, ...documentMacros(vfile) };
    }

    return {
        root,
        preset,
        get store() {
            return current();
        },
        build,
        vite,
        remark,
        macrosFor,
    };
}
