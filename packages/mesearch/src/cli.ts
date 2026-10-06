#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { initProject } from './init.ts';
import { packageDir } from './paths.ts';
import { exportOptions, findRoot, openProject, type Project } from './project.ts';

const USAGE = `
mesearch --- an opinionated site for a library of notes.

  mesearch init [dir]     scaffold a project: content/, config, stylesheet, AGENTS.md, agent skills, CI
  mesearch dev            serve the site, updating as documents change
  mesearch build          write the static site

Init options
      --force         overwrite the project's own files that already exist

Run init again after updating mesearch: it writes whatever is missing and
brings the agent skills, which are mesearch's, up to date. AGENTS.md and the
rest of the project's own files are left as they are.

Dev options
  -p, --port <n>      port to listen on
      --host [addr]   expose the server on the network
      --open          open a browser once the server is up

Build options
  -o, --out <dir>     where to write the site   (default: build)
      --base <path>   URL prefix the site is served under, overriding the config
      --force         overwrite an output directory mesearch did not write

  -h, --help          show this message
  -v, --version       show the version

Run inside a project: the nearest directory up from here whose package.json
depends on @mvarble/mesearch, or that has a content/ folder.
`.trim();

const OPTIONS = {
    out: { type: 'string', short: 'o' },
    base: { type: 'string' },
    force: { type: 'boolean', default: false },
    port: { type: 'string', short: 'p' },
    host: { type: 'string' },
    open: { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
    version: { type: 'boolean', short: 'v', default: false },
} as const;

async function main() {
    const { values, positionals } = parseArgs({ options: OPTIONS, allowPositionals: true });
    if (values.help) return console.log(USAGE);
    if (values.version) return console.log(version());

    const [command, ...rest] = positionals;
    if (command == 'init') {
        const dir = path.resolve(rest[0] ?? '.');
        initProject(dir, { force: values.force });
        return;
    }
    if (command != 'dev' && command != 'build') {
        console.error(USAGE);
        throw new Error(
            command ? `mesearch: no command \`${command}\`.` : 'mesearch: name a command.',
        );
    }

    const root = findRoot(process.cwd());
    if (!fs.existsSync(path.join(root, 'content'))) {
        throw new Error(
            `mesearch: \`${root}\` has no content/ folder. Run \`mesearch init\` to make one.`,
        );
    }

    const options = {
        watch: command == 'dev',
        outDir: values.out ? path.resolve(values.out) : undefined,
        base: values.base,
    };
    exportOptions(options);
    const project = await openProject(root, options);
    const configFile = scaffold(project);
    // SvelteKit reads `svelte.config.js` from the working directory, so that
    // is where the scaffolding has to be.
    process.chdir(project.workDir);

    if (command == 'dev') await dev(project, configFile, values);
    else await build(project, configFile, values.force);
}

// `.mesearch/`: what makes a directory of documents look like a SvelteKit
// project, rewritten on every run so that it always matches this version.
function scaffold(project: Project): string {
    fs.mkdirSync(project.workDir, { recursive: true });
    const kit = JSON.stringify(pathToFileURL(path.join(packageDir, 'dist', 'kit.js')).href);
    const root = JSON.stringify(project.root);
    const header = '// Written by mesearch on every run; edits here are lost.\n';
    const write = (name: string, contents: string) =>
        fs.writeFileSync(path.join(project.workDir, name), contents);
    write('package.json', JSON.stringify({ private: true, type: 'module' }, null, 4) + '\n');
    write(
        'svelte.config.js',
        `${header}import { svelteConfig } from ${kit};\n\nexport default await svelteConfig(${root});\n`,
    );
    write(
        'vite.config.js',
        `${header}import { viteConfig } from ${kit};\n\nexport default await viteConfig(${root});\n`,
    );
    write('.gitignore', '*\n');
    return path.join(project.workDir, 'vite.config.js');
}

async function dev(
    project: Project,
    configFile: string,
    values: { port?: string; host?: string; open?: boolean },
) {
    const { createServer } = await import('vite');
    const server = await createServer({
        configFile,
        server: {
            port: values.port ? Number(values.port) : undefined,
            host: values.host,
            open: values.open,
            // Only when a port was asked for. Otherwise Vite moves to the next
            // free one, and a tab still open on the old port looks frozen.
            strictPort: values.port !== undefined,
        },
    });
    try {
        await server.listen();
    } catch (error) {
        await server.close();
        throw error;
    }
    console.log(`mesearch: serving ${project.config.title} from ${project.root}`);
    server.printUrls();
}

// Marks a directory as ours, so that a mistyped `--out` cannot quietly delete
// somebody's work: the build empties its output directory, and it will only do
// that to a directory that is empty or that a previous build made.
const MARKER = '.mesearch-build';

async function build(project: Project, configFile: string, force: boolean) {
    const outDir = project.outDir;
    const entries = fs.existsSync(outDir) ? fs.readdirSync(outDir) : [];
    if (entries.length > 0 && !entries.includes(MARKER) && !force) {
        throw new Error(
            `mesearch: \`${outDir}\` is not empty and was not written by mesearch.\n` +
                'Building would erase it. Pass --force if that is what you want.',
        );
    }

    const { createBuilder } = await import('vite');
    // `null` lets the config decide between Vite's builders, as `vite build`
    // does. SvelteKit relies on the legacy one, driving its own server and
    // client passes; forcing the new one builds the server for the browser.
    const builder = await createBuilder({ configFile, logLevel: 'warn' }, null);
    await builder.buildApp();
    fs.writeFileSync(path.join(outDir, MARKER), '');
    console.log(`mesearch: wrote ${path.relative(project.root, outDir) || '.'}/`);
}

function version(): string {
    const manifest = fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8');
    return (JSON.parse(manifest) as { version: string }).version;
}

main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
});
