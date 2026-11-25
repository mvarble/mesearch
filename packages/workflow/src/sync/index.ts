// `mesearch-wf sync`: writes into a project what is this package's rather than the project's, and
// records it in `.workflow/managed.json`, which `bin/wf guard` and `bin/wf check` hold it to.
//
//     bin/wf                          runs the engine
//     .workflow/engine/*.js           the engine, vendored: the guard runs before anything is installed
//     .agents/skills/wf-*/            the workflow's skills, written from `workflow.config.ts`
//     .agents/reference/mesearch/     the procedure, the documentation's conventions, the markup
//     site/src/routes/..., ...        the documentation site's shared routes and components
//
// A file this version no longer ships is removed, unless it was changed since it was written.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import {
    emptyReport,
    installFolders,
    installSkills,
    listFiles,
    markup,
    type Files,
    type InstallReport,
} from '@mvarble/mesearch-cms/agents';

import { CONFIG_FILE, type WorkflowConfig } from '../engine/config.ts';
import { contentHash, MANAGED, SKILLS, type Manifest } from '../engine/lib.ts';
import { renderSkill, renderWorkflow } from './render.ts';
import { packageDir, siteFiles } from './site.ts';

export const PACKAGE = '@mvarble/mesearch-workflow';
export const REFERENCE_DIR = '.agents/reference/mesearch';
export const ENGINE_DIR = '.workflow/engine';

export const version = (): string =>
    (
        JSON.parse(fs.readFileSync(path.join(packageDir, 'package.json'), 'utf8')) as {
            version: string;
        }
    ).version;

export async function loadConfig(root: string): Promise<WorkflowConfig> {
    const file = path.join(root, CONFIG_FILE);
    if (!fs.existsSync(file)) {
        throw new Error(`${CONFIG_FILE} is missing at ${root}; \`mesearch-wf init\` writes one.`);
    }
    return ((await import(pathToFileURL(file).href)) as { default: WorkflowConfig }).default;
}

// The engine, as `tsc` built it into `dist/engine/`, without its source maps.
function engineFiles(): Files {
    const dist = path.join(packageDir, 'dist/engine');
    if (!fs.existsSync(dist)) throw new Error(`${dist} is missing: build ${PACKAGE} first.`);
    return new Map(
        listFiles(dist)
            .filter((name) => name.endsWith('.js'))
            .map((name) => [
                name,
                fs
                    .readFileSync(path.join(dist, name), 'utf8')
                    .replace(/\n\/\/# sourceMappingURL=.*\n?$/, '\n'),
            ]),
    );
}

const BIN_WF = `#!/bin/sh
# The development workflow's command line; see .agents/reference/mesearch/workflow.md. The engine
# is @mvarble/mesearch-workflow's, vendored by \`mesearch-wf sync\` so that it runs before anything
# is installed.
exec node "$(dirname "$0")/../${ENGINE_DIR}/main.js" "$@"
`;

// Everything this version manages in a project with this config, by kind of install.
export function managedFiles(root: string, config: WorkflowConfig) {
    const skillsDir = path.join(packageDir, 'agents/skills');
    const skills = new Map<string, Files>(
        fs
            .readdirSync(skillsDir)
            .sort()
            .map((skill) => {
                const files = new Map(
                    [...filesOf(path.join(skillsDir, skill))].map(([name, text]) => [
                        name,
                        renderSkill(text, config),
                    ]),
                );
                return [skill, files];
            }),
    );
    const referenceDir = path.join(packageDir, 'agents/reference');
    const reference: Files = new Map([
        [
            'workflow.md',
            renderWorkflow(fs.readFileSync(path.join(referenceDir, 'workflow.md'), 'utf8'), config),
        ],
        ['authoring.md', fs.readFileSync(path.join(referenceDir, 'authoring.md'), 'utf8')],
        ['markup.md', markup()],
    ]);
    const single = new Map<string, string>([['bin/wf', BIN_WF]]);
    if (fs.existsSync(path.join(root, 'site'))) {
        for (const [rel, text] of siteFiles()) single.set(rel, text);
    }
    return {
        skills,
        folders: new Map<string, Files>([
            [ENGINE_DIR, engineFiles()],
            [REFERENCE_DIR, reference],
        ]),
        single,
    };
}

function filesOf(dir: string): Files {
    return new Map(
        listFiles(dir).map((name) => [name, fs.readFileSync(path.join(dir, name), 'utf8')]),
    );
}

// Every managed file, by path from the root.
function flatten(managed: ReturnType<typeof managedFiles>): Map<string, string> {
    const all = new Map<string, string>();
    for (const [skill, files] of managed.skills) {
        for (const [name, text] of files) all.set(`${SKILLS}/${skill}/${name}`, text);
    }
    for (const [dir, files] of managed.folders) {
        for (const [name, text] of files) all.set(`${dir}/${name}`, text);
    }
    for (const [rel, text] of managed.single) all.set(rel, text);
    return all;
}

export interface SyncReport extends InstallReport {
    removed: string[];
}

// Brings the project's managed files to this version's, and records them.
export async function sync(root: string): Promise<SyncReport> {
    const config = await loadConfig(root);
    const managed = managedFiles(root, config);
    const all = flatten(managed);
    const report: SyncReport = { ...emptyReport(), removed: [] };

    // What an earlier version managed and this one does not: removed when it is as it was written.
    const before = readManifest(root);
    for (const [rel, hash] of Object.entries(before?.files ?? {})) {
        if (all.has(rel)) continue;
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) continue;
        if (contentHash(fs.readFileSync(file, 'utf8')) == hash) {
            fs.rmSync(file);
            report.removed.push(rel);
        } else report.kept.push(rel);
    }

    installSkills(root, managed.skills, {}, report);
    installFolders(root, managed.folders, report);
    for (const [rel, text] of managed.single) {
        const file = path.join(root, rel);
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : undefined;
        if (current?.replaceAll('\r\n', '\n') === text) continue;
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, text);
        (current === undefined ? report.written : report.updated).push(rel);
    }
    fs.chmodSync(path.join(root, 'bin/wf'), 0o755);

    const manifest: Manifest = {
        package: PACKAGE,
        version: version(),
        files: Object.fromEntries([...all].sort().map(([rel, text]) => [rel, contentHash(text)])),
    };
    fs.mkdirSync(path.join(root, path.dirname(MANAGED)), { recursive: true });
    fs.writeFileSync(path.join(root, MANAGED), JSON.stringify(manifest, null, 4) + '\n');
    return report;
}

// What `sync` would change: managed files that differ from this version's, or are missing.
export async function outdated(root: string): Promise<string[]> {
    const config = await loadConfig(root);
    const all = flatten(managedFiles(root, config));
    const before = readManifest(root);
    const stale = [...all]
        .filter(([rel, text]) => {
            const file = path.join(root, rel);
            return (
                !fs.existsSync(file) ||
                contentHash(fs.readFileSync(file, 'utf8')) != contentHash(text)
            );
        })
        .map(([rel]) => rel);
    const dropped = Object.keys(before?.files ?? {}).filter(
        (rel) => !all.has(rel) && fs.existsSync(path.join(root, rel)),
    );
    return [...stale, ...dropped].sort();
}

function readManifest(root: string): Manifest | undefined {
    const file = path.join(root, MANAGED);
    return fs.existsSync(file)
        ? (JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest)
        : undefined;
}
