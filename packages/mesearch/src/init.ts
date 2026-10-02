import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import { packageDir, skillsDir, templatesDir } from './paths.ts';

export interface InitOptions {
    // Overwrite files that already exist.
    force?: boolean;
}

// Versions of the tools a project lints and formats with, matching this
// workspace's own.
const DEV_DEPENDENCIES: Record<string, string> = {
    '@eslint/js': '^10.0.1',
    eslint: '^10.4.1',
    'eslint-config-prettier': '^10.1.8',
    'eslint-plugin-svelte': '^3.23.0',
    globals: '^17.6.0',
    prettier: '^3.9.6',
    'prettier-plugin-svelte': '^4.1.1',
    typescript: '^6.0.3',
    'typescript-eslint': '^8.71.0',
};

const SCRIPTS: Record<string, string> = {
    dev: 'mesearch dev',
    build: 'mesearch build',
    lint: 'prettier --check . && eslint .',
    format: 'prettier --write .',
};

// `mesearch init`: everything a project needs, written only where nothing is
// already, so it is safe to run in a project that has some of it.
export function initProject(dir: string, options: InitOptions = {}) {
    fs.mkdirSync(dir, { recursive: true });
    const written: string[] = [];
    const skipped: string[] = [];
    const title = titleFrom(dir);
    const date = new Date().toISOString().slice(0, 10);
    const fill = (text: string) => text.replaceAll('{{title}}', title).replaceAll('{{date}}', date);

    const write = (name: string, contents: string) => {
        const file = path.join(dir, name);
        if (fs.existsSync(file) && !options.force) {
            skipped.push(name);
            return;
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, contents);
        written.push(name);
    };

    for (const name of listFiles(templatesDir)) {
        write(name, fill(fs.readFileSync(path.join(templatesDir, name), 'utf8')));
    }
    write('content/sequences/.gitkeep', '');
    installSkills(dir, write, written, skipped, options.force);
    write('mesearch.css', userStylesheet());
    write(
        'tsconfig.json',
        JSON.stringify({ extends: '@mvarble/mesearch/tsconfig.json' }, null, 4) + '\n',
    );
    write('prettier.config.js', PRETTIER);
    write('eslint.config.js', ESLINT);

    updatePackageJson(dir, title, written);
    addLines(
        dir,
        '.prettierignore',
        ['build/', '.mesearch/', '.agents/', '.claude/', 'pnpm-lock.yaml', 'package-lock.json'],
        written,
    );
    addLines(dir, '.gitignore', ['node_modules/', '.mesearch/', 'build/'], written);

    for (const name of written) console.log(`  wrote    ${name}`);
    for (const name of skipped) console.log(`  kept     ${name} (exists; --force to overwrite)`);
    console.log(
        `\nmesearch: ${path.relative(process.cwd(), dir) || '.'} is ready.\n` +
            'Install the dependencies (`pnpm install`, or npm or yarn), then `pnpm dev` to start writing.',
    );
}

// Where harnesses look for a project's skills. `.agents/skills/` is the Agent
// Skills convention, which most read. Those that only read a directory of their
// own are given a link to each skill there.
const SKILLS_DIR = '.agents/skills';
const LINKED_SKILLS_DIRS = ['.claude/skills'];

// The skills an agent writes documents with: `/explain` and `/explain-concept`.
// Each is a folder with a `SKILL.md` and the shared `authoring.md`.
function installSkills(
    dir: string,
    write: (name: string, contents: string) => void,
    written: string[],
    skipped: string[],
    force = false,
) {
    const authoring = fs.readFileSync(path.join(skillsDir, 'authoring.md'), 'utf8');
    const skills = fs
        .readdirSync(skillsDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name);

    for (const skill of skills) {
        for (const name of listFiles(path.join(skillsDir, skill))) {
            write(
                `${SKILLS_DIR}/${skill}/${name}`,
                fs.readFileSync(path.join(skillsDir, skill, name), 'utf8'),
            );
        }
        write(`${SKILLS_DIR}/${skill}/authoring.md`, authoring);

        for (const linked of LINKED_SKILLS_DIRS) {
            const name = `${linked}/${skill}`;
            const link = path.join(dir, name);
            const stat = fs.lstatSync(link, { throwIfNoEntry: false });
            // Only a link is ever replaced: a folder there is somebody's own.
            if (stat && !(force && stat.isSymbolicLink())) {
                if (!stat.isSymbolicLink()) console.log(`  kept     ${name} (exists)`);
                else skipped.push(name);
                continue;
            }
            if (stat) fs.unlinkSync(link);
            fs.mkdirSync(path.dirname(link), { recursive: true });
            const target = path.join(dir, SKILLS_DIR, skill);
            try {
                fs.symlinkSync(path.relative(path.dirname(link), target), link, 'dir');
            } catch {
                // Where links cannot be made (Windows without the privilege), a copy.
                fs.cpSync(target, link, { recursive: true });
            }
            written.push(name);
        }
    }
}

// Adds mesearch's scripts and dependencies to the project's manifest, making
// one if there is none, and never replacing what is already there.
function updatePackageJson(dir: string, title: string, written: string[]) {
    const file = path.join(dir, 'package.json');
    const exists = fs.existsSync(file);
    const manifest = exists
        ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>)
        : {
              name: slugify(title) || 'mesearch-site',
              private: true,
          };
    const own = JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
        version: string;
    };

    manifest.type ??= 'module';
    const scripts = (manifest.scripts ??= {}) as Record<string, string>;
    for (const [name, command] of Object.entries(SCRIPTS)) scripts[name] ??= command;
    const dependencies = (manifest.dependencies ??= {}) as Record<string, string>;
    const devDependencies = (manifest.devDependencies ??= {}) as Record<string, string>;
    if (!dependencies['@mvarble/mesearch'] && !devDependencies['@mvarble/mesearch']) {
        dependencies['@mvarble/mesearch'] = `^${own.version}`;
    }
    for (const [name, version] of Object.entries(DEV_DEPENDENCIES)) {
        if (!dependencies[name]) devDependencies[name] ??= version;
    }
    const contents = JSON.stringify(manifest, null, 4) + '\n';
    if (exists && contents == fs.readFileSync(file, 'utf8')) return;
    fs.writeFileSync(file, contents);
    written.push(exists ? 'package.json (scripts and dependencies added)' : 'package.json');
}

// Adds to an ignore file the entries it lacks, making the file if there is
// none, so that a project made by an earlier version picks up new ones.
function addLines(dir: string, name: string, entries: string[], written: string[]) {
    const file = path.join(dir, name);
    const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    const lines = current.split(/\r?\n/);
    const missing = entries.filter(
        (entry) => !lines.includes(entry) && !lines.includes(entry.replace(/\/$/, '')),
    );
    if (!missing.length) return;
    const prefix = current && !current.endsWith('\n') ? '\n' : '';
    fs.writeFileSync(file, current + prefix + missing.join('\n') + '\n');
    written.push(current ? `${name} (entries added)` : name);
}

// The UI library's stylesheet of variables.
export function tokensFile(): string {
    const ui = createRequire(import.meta.url).resolve('@mvarble/mesearch-ui/package.json');
    return path.join(path.dirname(ui), 'dist', 'styles', 'tokens.css');
}

// `mesearch.css`: every variable the site is styled with, commented out, so
// that overriding one is a matter of uncommenting it. Generated from the
// stylesheet the site actually uses, so the list cannot fall out of date.
export function userStylesheet(): string {
    const tokens = fs.readFileSync(tokensFile(), 'utf8');
    const body = tokens
        // The file's own preamble is replaced by the one below.
        .replace(/^\/\*[\s\S]*?\*\/\s*/, '')
        // Every declaration, however many lines its value runs to.
        .replace(
            /^(\s*)(--[\w-]+\s*:[^;]*;)/gm,
            (_, indent: string, declaration: string) =>
                declaration
                    .split('\n')
                    .map((line, i) =>
                        i == 0 ? `${indent}/* ${line}` : `${indent}   ${line.trim()}`,
                    )
                    .join('\n') + ' */',
        )
        .replace(/^(\s*)(color-scheme\s*:[^;]*;)/gm, '$1/* $2 */');
    return `/* mesearch.css: this site's own styles, loaded after mesearch's.
 *
 * Every variable mesearch styles the site with is listed below, commented out
 * and set to its default. Uncomment one to change it: the first block is the
 * light theme, the second the dark. Anything else written here applies too,
 * so this is also where to restyle a particular element.
 *
 * To use a different typeface, load it here and point a font variable at it:
 *
 *     @import url('https://fonts.googleapis.com/css2?family=EB+Garamond:ital,wght@0,400..800;1,400..800&display=swap');
 *
 *     :root {
 *         --font-serif: 'EB Garamond', Georgia, serif;
 *     }
 *
 * An \`@import\` has to come before every other rule in the file. A font
 * installed with npm (\`pnpm add @fontsource/eb-garamond\`) can be imported
 * the same way: \`@import '@fontsource/eb-garamond';\`.
 */

${body.trimEnd()}
`;
}

function listFiles(dir: string, prefix = ''): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
        const name = prefix ? `${prefix}/${entry.name}` : entry.name;
        return entry.isDirectory() ? listFiles(path.join(dir, entry.name), name) : [name];
    });
}

// A title from the directory's name: `probability-notes` → `Probability notes`.
function titleFrom(dir: string): string {
    const words = path.basename(path.resolve(dir)).replace(/[-_]+/g, ' ').trim();
    return words ? words[0]!.toUpperCase() + words.slice(1) : 'Notes';
}

const slugify = (text: string) =>
    text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

const PRETTIER = `/** @type {import("prettier").Config} */
const config = {
    useTabs: false,
    singleQuote: true,
    trailingComma: 'all',
    tabWidth: 4,
    printWidth: 100,
    plugins: ['prettier-plugin-svelte'],
    overrides: [{ files: '*.svelte', options: { parser: 'svelte' } }],
};

export default config;
`;

const ESLINT = `import prettier from 'eslint-config-prettier';
import path from 'node:path';
import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';
import { defineConfig, includeIgnoreFile } from 'eslint/config';

const gitignorePath = path.resolve(import.meta.dirname, '.gitignore');

export default defineConfig(
    includeIgnoreFile(gitignorePath),
    js.configs.recommended,
    ts.configs.recommended,
    svelte.configs.recommended,
    prettier,
    svelte.configs.prettier,
    {
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
        rules: {
            'no-undef': 'off',
        },
    },
    {
        files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
        languageOptions: {
            parserOptions: {
                extraFileExtensions: ['.svelte'],
                parser: ts.parser,
            },
        },
    },
    {
        rules: {
            'comma-dangle': [2, 'always-multiline'],
        },
    },
);
`;
