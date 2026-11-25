// The files a documentation site holds that are this package's: a route for every page the app
// ships, and the components and modules its documents import by their `$lib` paths. Each is a
// wrapper of a few lines around what the package ships, so that it changes only when the set of
// pages does, and is written by `mesearch-wf sync`.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { listFiles } from '@mvarble/mesearch-cms/agents';

const PACKAGE = '@mvarble/mesearch-workflow';

// `dist/sync/site.js` (or `src/sync/site.ts`) sits two directories below the package root.
export const packageDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../..');
export const appDir = path.join(packageDir, 'app');

// What a site's documents import from `$lib`, by path within `src/lib`: the components a
// document shows, and the spec types its figures are written in.
const DOCUMENT_COMPONENTS = ['Statement', 'Proof', 'ModelGraph', 'ImageFigure', 'TrackCard'];
const DOCUMENT_MODULES = ['graph/spec.ts'];

const HEADER = 'Managed by @mvarble/mesearch-workflow, which `mesearch-wf sync` writes it from.';

const svelteWrapper = (from: string, props: string, use: string) =>
    [
        `<!-- ${HEADER} -->`,
        '<script lang="ts">',
        `    import Component from '${from}';`,
        '',
        `    let ${props} = $props();`,
        '</script>',
        '',
        use,
        '',
    ].join('\n');

const moduleWrapper = (from: string) => `// ${HEADER}\nexport * from '${from}';\n`;

// The site's managed files, by path from the repository root (the site is in `site/`).
export function siteFiles(): Map<string, string> {
    const files = new Map<string, string>();
    const routes = path.join(appDir, 'routes');
    for (const rel of listFiles(routes)) {
        const from = `${PACKAGE}/app/routes/${rel}`;
        const target = `site/src/routes/${rel}`;
        if (rel.endsWith('.svelte')) {
            files.set(target, svelteWrapper(from, '{ data }', '<Component {data} />'));
        } else if (rel.endsWith('.ts')) {
            files.set(target, moduleWrapper(from));
        }
    }
    for (const rel of listFiles(path.join(appDir, 'params'))) {
        files.set(`site/src/params/${rel}`, moduleWrapper(`${PACKAGE}/app/params/${rel}`));
    }
    for (const name of DOCUMENT_COMPONENTS) {
        const from = `${PACKAGE}/app/lib/components/${name}.svelte`;
        if (!fs.existsSync(path.join(appDir, 'lib/components', `${name}.svelte`))) continue;
        files.set(
            `site/src/lib/components/${name}.svelte`,
            svelteWrapper(from, 'props', '<Component {...props} />'),
        );
    }
    for (const rel of DOCUMENT_MODULES) {
        files.set(`site/src/lib/${rel}`, moduleWrapper(`${PACKAGE}/app/lib/${rel}`));
    }
    return files;
}
