import path from 'node:path';
import type { Plugin } from 'vite';

import { appDir, packageDir } from './paths.ts';

// Packages a site must share with mesearch rather than resolve for itself. Two
// copies of Svelte make two runtimes, and the first component rendered by the
// other one fails; SvelteKit's generated files import its runtime by name.
const PINNED = ['svelte', '@sveltejs/kit', 'esm-env', 'devalue'];

const isPinned = (id: string) => PINNED.some((name) => id == name || id.startsWith(name + '/'));

// Neither relative, nor absolute, nor a URL, nor a virtual id.
const BARE_IMPORT = /^(?![a-zA-Z]:)[\w@](?!.*:\/\/)/;

const isInside = (dir: string, file: string) => file == dir || file.startsWith(dir + path.sep);

// A site's documents live in its own `docs/`, and SvelteKit's generated files
// in `.mesearch/` --- neither of which has mesearch's dependencies above it
// when a package manager keeps them private, as pnpm does.
//
// So the packages that must be shared are always resolved as if mesearch
// imported them, and any other bare import that the project cannot resolve
// is tried from mesearch too. A document's own imports --- a `three` the
// project installed, say --- still resolve from the project first.
export function pinDependencies(): Plugin[] {
    // Resolved as if one of the app's own files imported them --- not merely
    // from somewhere inside the package --- because that is what decides,
    // during development, whether Vite hands out its pre-bundled copy. Any
    // other importer gets the package's raw source: a second Svelte runtime.
    const importer = path.join(appDir, 'routes', '+layout.svelte');
    return [
        {
            name: 'mesearch:pin',
            enforce: 'pre',
            async resolveId(id, from, options) {
                if (!from || !isPinned(id) || id.includes('\0')) return null;
                const file = from.replace(/[?#].*$/, '');
                if (isInside(packageDir, file)) return null;
                return this.resolve(id, importer, { ...options, skipSelf: true });
            },
        },
        {
            name: 'mesearch:fallback',
            enforce: 'post',
            async resolveId(id, from, options) {
                if (!from || !BARE_IMPORT.test(id) || id.includes('\0')) return null;
                if (isInside(packageDir, from.replace(/[?#].*$/, ''))) return null;
                return this.resolve(id, importer, { ...options, skipSelf: true });
            },
        },
    ];
}
