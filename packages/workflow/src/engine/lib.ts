// The workflow's model: entries, their stages and documents, and the rules for which files may
// change at which stage. `cli.ts` is the command line over it.
//
// Everything here takes the repository root explicitly, so that the tests can run it against
// throwaway repositories. What differs between projects (kinds, stages, the code, the layout)
// comes from the project's `workflow.config.ts`, which `useConfig` sets before anything runs: the
// command line sets it once per command.
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import type { Area, StageConfig, WorkflowConfig } from './config.ts';

export type { Area } from './config.ts';

// ---------------------------------------------------------------------------
// Configuration

export type Kind = string;
export type Stage = string;
export type Terminal = 'done' | 'abandoned';

let current: WorkflowConfig | undefined;

export function useConfig(config: WorkflowConfig) {
    current = config;
}

export function config(): WorkflowConfig {
    if (!current) throw new WorkflowError('no workflow config is in use.');
    return current;
}

// The layout, from the config.
export const CONTENT = () => config().content ?? 'site/content';
export const ARCHIVE = () => `${CONTENT()}/archive`;
export const MATH = () => {
    const math = config().math ?? 'math';
    return math === false ? undefined : `${CONTENT()}/${math}`;
};
export const ACTIVE = '.workflow/active';
export const MANAGED = '.workflow/managed.json';
export const SKILLS = '.agents/skills';

export const kinds = (): Record<Kind, Stage[]> =>
    Object.fromEntries(Object.entries(config().kinds).map(([kind, { stages }]) => [kind, stages]));
export const stagesOf = (kind: Kind): Stage[] => config().kinds[kind]?.stages ?? [];
export const stageConfig = (stage: Stage): StageConfig => config().stages[stage] ?? {};
export const isKind = (value: string): value is Kind => Object.hasOwn(config().kinds, value);
export const hasDocument = (stage: Stage) => !!stageConfig(stage).document;
export const skillOf = (stage: Stage) => stageConfig(stage).skill ?? `/wf-${stage}`;
export const unlocksOf = (stage: Stage): Area[] => stageConfig(stage).unlocks ?? [];

// ---------------------------------------------------------------------------
// Records

export interface Approval {
    date: string;
    commit: string;
    // The approved document's hash, for the stages that have one.
    hash?: string;
    // Set when the entry was reopened at or before this stage; the stage has to be approved again
    // before the entry moves past it.
    stale?: boolean;
}

export interface WorkflowEvent {
    date: string;
    action: 'start' | 'approve' | 'reopen' | 'abandon' | 'resume' | 'amend';
    // The stage the event is about. An amendment of a statement has none.
    stage?: Stage;
    reason?: string;
    commit?: string;
    // An amendment: what was changed, as the amending entry lists it under `amends`, and the
    // entry that changed it.
    document?: string;
    by?: string;
}

export interface Workflow {
    kind: Kind;
    stage: Stage | Terminal;
    started: string;
    finished?: string;
    events: WorkflowEvent[];
    approvals: Partial<Record<Stage, Approval>>;
}

export class WorkflowError extends Error {}

export const today = () => new Date().toISOString().slice(0, 10);

export const entryDir = (slug: string) => `${ARCHIVE()}/${slug}`;
export const workflowFile = (slug: string) => `${entryDir(slug)}/workflow.json`;

export function readWorkflow(root: string, slug: string): Workflow {
    const file = path.join(root, workflowFile(slug));
    let parsed: Workflow;
    try {
        parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as Workflow;
    } catch (error) {
        throw new WorkflowError(
            `${workflowFile(slug)}: cannot be read (${(error as Error).message}).`,
        );
    }
    if (!isKind(parsed.kind)) {
        throw new WorkflowError(`${workflowFile(slug)}: unknown kind '${parsed.kind}'.`);
    }
    const stages: string[] = [...stagesOf(parsed.kind), 'done', 'abandoned'];
    if (!stages.includes(parsed.stage)) {
        throw new WorkflowError(
            `${workflowFile(slug)}: '${parsed.stage}' is not a stage of a ${parsed.kind}.`,
        );
    }
    parsed.events ??= [];
    parsed.approvals ??= {};
    return parsed;
}

export function writeWorkflow(root: string, slug: string, workflow: Workflow) {
    const file = path.join(root, workflowFile(slug));
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(workflow, null, 4) + '\n');
}

export function activeSlug(root: string): string | undefined {
    const file = path.join(root, ACTIVE);
    if (!fs.existsSync(file)) return undefined;
    const slug = fs.readFileSync(file, 'utf8').trim();
    return slug || undefined;
}

export function setActive(root: string, slug: string | undefined) {
    const file = path.join(root, ACTIVE);
    if (slug === undefined) {
        fs.rmSync(file, { force: true });
        return;
    }
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, slug + '\n');
}

export function listEntries(root: string): string[] {
    const dir = path.join(root, ARCHIVE());
    if (!fs.existsSync(dir)) return [];
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort();
}

// The file holding a stage's document: `.svx` when there is one, else `.md`.
export function documentPath(root: string, slug: string, stage: Stage): string {
    const svx = `${entryDir(slug)}/${stage}.svx`;
    return fs.existsSync(path.join(root, svx)) ? svx : `${entryDir(slug)}/${stage}.md`;
}

// A checklist's boxes are ticked at a later stage. The checklist is otherwise frozen, so its hash
// is taken with every box unticked.
export function documentHash(root: string, file: string, stage: Stage): string | undefined {
    const abs = path.join(root, file);
    if (!fs.existsSync(abs)) return undefined;
    let text = fs.readFileSync(abs, 'utf8');
    if (stageConfig(stage).checklist) text = text.replace(/^(\s*[-*] )\[[xX]\]/gm, '$1[ ]');
    return createHash('sha256').update(text).digest('hex');
}

export function checkboxes(text: string) {
    const ticked = (text.match(/^\s*[-*] \[[xX]\]/gm) ?? []).length;
    const open = (text.match(/^\s*[-*] \[ \]/gm) ?? []).length;
    return { ticked, open, total: ticked + open };
}

// The stages of an entry reached so far, in order: those approved at some point (stale or not),
// then the current one.
export function reached(workflow: Workflow): Stage[] {
    const stages = stagesOf(workflow.kind);
    if (workflow.stage == 'done') return stages;
    const out = stages.filter((stage) => workflow.approvals[stage]);
    if (workflow.stage != 'abandoned' && !out.includes(workflow.stage)) out.push(workflow.stage);
    return out;
}

export function unlocked(workflow: Workflow): Set<Area> {
    return new Set(reached(workflow).flatMap(unlocksOf));
}

// ---------------------------------------------------------------------------
// Managed files: what `mesearch-wf sync` wrote, which is the package's and not the project's.

export interface Manifest {
    package: string;
    version: string;
    // Path from the root → sha256 of its contents, line endings aside.
    files: Record<string, string>;
}

export const contentHash = (text: string) =>
    createHash('sha256').update(text.replaceAll('\r\n', '\n')).digest('hex');

export function readManifest(root: string): Manifest | undefined {
    const file = path.join(root, MANAGED);
    if (!fs.existsSync(file)) return undefined;
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8')) as Manifest;
    } catch {
        return undefined;
    }
}

// ---------------------------------------------------------------------------
// Paths

export type Place =
    | { area: 'workflow' }
    | { area: 'entry'; slug: string; stage?: Stage }
    | { area: Area }
    | { area: 'free' };

// What a repository-relative path is, as far as the rules are concerned.
export function placeOf(rel: string): Place {
    rel = rel.split(path.sep).join('/');
    const archive = ARCHIVE();
    if (rel == ACTIVE || rel.startsWith('.workflow/')) return { area: 'workflow' };
    if (rel.startsWith(archive + '/')) {
        const [slug, file, ...rest] = rel.slice(archive.length + 1).split('/');
        if (!slug || !file) return { area: 'free' };
        if (file == 'workflow.json' && !rest.length) return { area: 'workflow' };
        const name = /^([a-z]+)\.(md|svx)$/.exec(file)?.[1];
        const stage = !rest.length && name && hasDocument(name) ? name : undefined;
        return { area: 'entry', slug, ...(stage ? { stage } : {}) };
    }
    if ((config().free ?? []).some((prefix) => rel.startsWith(prefix))) return { area: 'free' };
    const math = MATH();
    if (math && rel.startsWith(math + '/')) return { area: 'math' };
    if (rel.startsWith(CONTENT() + '/')) return { area: 'pages' };
    if (config().code.some((pattern) => pattern.test(rel))) return { area: 'code' };
    return { area: 'free' };
}

// What an entry may amend in another: a done entry's stage documents and its statements, to keep
// a reference in them true. The key is how the amending entry lists the file under `amends` in its
// `index.md`: its path under the content directory, without its extension.
export function amendKey(rel: string): string | undefined {
    rel = rel.split(path.sep).join('/');
    const archive = ARCHIVE();
    if (!rel.startsWith(archive + '/')) return undefined;
    const [slug, file, ...rest] = rel.slice(archive.length + 1).split('/');
    if (!slug || !file) return undefined;
    if (!rest.length) {
        const name = /^([a-z]+)\.(md|svx)$/.exec(file)?.[1];
        return name && hasDocument(name) ? `archive/${slug}/${name}` : undefined;
    }
    const statement =
        file == 'statements' && rest.length == 1 && /^([a-z0-9-]+)\.md$/.exec(rest[0]!);
    return statement ? `archive/${slug}/statements/${statement[1]}` : undefined;
}

// The entry an `amends` key names, and the stage of the document, when it is one.
export function amendTarget(
    key: string,
): { slug: string; stage?: Stage; name?: string } | undefined {
    const document = /^archive\/([a-z0-9-]+)\/([a-z]+)$/.exec(key);
    if (document && hasDocument(document[2]!)) {
        return { slug: document[1]!, stage: document[2]! };
    }
    const statement = /^archive\/([a-z0-9-]+)\/statements\/([a-z0-9-]+)$/.exec(key);
    return statement ? { slug: statement[1]!, name: statement[2]! } : undefined;
}

// The file an `amends` key names.
export function amendPath(root: string, key: string): string | undefined {
    const target = amendTarget(key);
    if (!target) return undefined;
    return target.stage
        ? documentPath(root, target.slug, target.stage)
        : `${entryDir(target.slug)}/statements/${target.name}.md`;
}

// What the entry being worked on may change in the others.
export interface Amending {
    // Whether an entry is done: only a done entry is amended.
    isDone(slug: string): boolean;
    // What the entry lists under `amends`. An edit about to be made is not held to the list, which
    // is written as the publish goes; a branch's history is.
    amends: string[];
}

// Why `rel` may not be changed while `slug` (if any) is the entry being worked on, or undefined
// when it may. `editing` is set for a single edit about to be made, as opposed to a change already
// in a branch's history: an edit may only touch the current stage's document, while the history
// may hold any stage's. `managed` is what `mesearch-wf sync` wrote, which no edit changes.
export function refusal(
    rel: string,
    subject: { slug: string; workflow: Workflow } | undefined,
    editing: boolean,
    amending?: Amending,
    managed?: Manifest,
): string | undefined {
    rel = rel.split(path.sep).join('/');
    // Claude Code reaches the skills through `.claude/skills`, a link to `.agents/skills`.
    const canonical = rel.replace(/^\.claude\/skills\//, `${SKILLS}/`);
    if (editing && managed && Object.hasOwn(managed.files, canonical)) {
        return (
            `${canonical} is managed by ${managed.package} ${managed.version}: change it there, then ` +
            'run `mesearch-wf sync`.'
        );
    }
    const place = placeOf(rel);
    switch (place.area) {
        case 'free':
            return undefined;
        case 'workflow':
            return editing ? `${rel} is written by \`bin/wf\` alone.` : undefined;
        case 'entry': {
            if (!subject) {
                return editing
                    ? `${rel} belongs to entry '${place.slug}', which is not active on this branch.`
                    : undefined;
            }
            if (place.slug != subject.slug) {
                const key = amendKey(rel);
                const publishing = reached(subject.workflow).includes('publish');
                if (key && amending?.isDone(place.slug) && publishing) {
                    if (editing || amending.amends.includes(key)) return undefined;
                    return (
                        `${rel} belongs to entry '${place.slug}', which is done; list it as ` +
                        `'${key}' under \`amends\` in ${entryDir(subject.slug)}/index.md.`
                    );
                }
                if (key && amending?.isDone(place.slug)) {
                    return (
                        `${rel} belongs to entry '${place.slug}', which is done; '${subject.slug}' ` +
                        'may amend it only at its publish stage, to keep a reference in it true.'
                    );
                }
                return `${rel} belongs to entry '${place.slug}', but this branch works on '${subject.slug}'.`;
            }
            if (!editing || !place.stage) return undefined;
            const { workflow } = subject;
            if (!stagesOf(workflow.kind).includes(place.stage)) {
                return `a ${workflow.kind} has no ${place.stage} stage.`;
            }
            if (place.stage == workflow.stage) return undefined;
            if (stageConfig(place.stage).editableDuring?.includes(workflow.stage)) return undefined;
            return (
                `${rel} is the ${place.stage} document, and the entry is at ${workflow.stage}. ` +
                `To change it, ask for \`/wf-reopen ${place.stage}\`.`
            );
        }
        default: {
            const area = place.area;
            if (!subject) {
                return area == 'code'
                    ? `${rel} is code, and no entry is active: start one with \`/wf-start\`.`
                    : undefined;
            }
            if (unlocked(subject.workflow).has(area)) return undefined;
            const opener = stagesOf(subject.workflow.kind).filter((stage) =>
                unlocksOf(stage).includes(area),
            );
            if (!opener.length) {
                return `${rel} is ${describe(area)}, which a ${subject.workflow.kind} does not change.`;
            }
            return (
                `${rel} is ${describe(area)}, which opens at the ` +
                `${opener.join(' or ')} stage; '${subject.slug}' is at ${subject.workflow.stage}.`
            );
        }
    }
}

const describe = (area: Area) =>
    ({ math: 'a math note', code: 'code', pages: 'a documentation page' })[area];

// ---------------------------------------------------------------------------
// Git

export function git(root: string, ...args: string[]): string {
    return execFileSync('git', args, {
        cwd: root,
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
}

export function tryGit(root: string, ...args: string[]): string | undefined {
    try {
        return git(root, ...args);
    } catch {
        return undefined;
    }
}

export function repoRoot(cwd: string): string {
    const root = tryGit(cwd, 'rev-parse', '--show-toplevel');
    if (!root) throw new WorkflowError('not inside a git repository.');
    return root;
}

export const currentBranch = (root: string) => tryGit(root, 'branch', '--show-current') ?? '';
export const headCommit = (root: string) => tryGit(root, 'rev-parse', '--short', 'HEAD') ?? '';

export function isCommitted(root: string, rel: string): boolean {
    return git(root, 'status', '--porcelain', '--', rel) == '';
}

// Every path that differs from `base`: committed since the merge base, staged, unstaged, or
// untracked. Undefined when `base` does not resolve.
export function changedSince(root: string, base: string): string[] | undefined {
    const mergeBase = tryGit(root, 'merge-base', base, 'HEAD');
    if (!mergeBase) return undefined;
    const lines = [
        git(root, 'diff', '--name-only', mergeBase),
        git(root, 'ls-files', '--others', '--exclude-standard'),
    ].join('\n');
    return [...new Set(lines.split('\n').filter(Boolean))].sort();
}

// The default base: the remote's main branch, else the local one.
export function defaultBase(root: string): string | undefined {
    for (const ref of ['origin/main', 'main']) {
        if (tryGit(root, 'rev-parse', '--verify', '--quiet', ref)) return ref;
    }
    return undefined;
}

// ---------------------------------------------------------------------------
// Frontmatter, read only as far as the workflow needs: a list field such as
// `pages: [guide/first-model]`, written inline, as a block, or as a bracketed list spread over
// several lines, as Prettier writes one too long for a line.

export function frontmatterList(text: string, field: string): string[] | undefined {
    const block = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text)?.[1];
    if (!block) return undefined;
    const lines = block.split(/\r?\n/);
    const at = lines.findIndex((line) => line.startsWith(`${field}:`));
    if (at < 0) return undefined;
    const value = lines[at]!.slice(field.length + 1).trim();
    const unquote = (item: string) => item.trim().replace(/^(['"])(.*)\1$/, '$2');
    // A bracketed list opens on the field's line or, indented, on the next one, and runs to the
    // line that closes it.
    const opens = value.startsWith('[')
        ? at
        : !value && /^\s+\[/.test(lines[at + 1] ?? '')
          ? at + 1
          : -1;
    if (opens >= 0) {
        let flow = opens == at ? value : lines[opens]!.trim();
        for (let i = opens + 1; !flow.includes(']') && i < lines.length; i++) {
            flow += ' ' + lines[i]!.trim();
        }
        const inner = flow.replace(/^\[/, '').replace(/\].*$/, '').trim();
        return inner ? inner.split(',').map(unquote).filter(Boolean) : [];
    }
    if (value) return [unquote(value)];
    const items: string[] = [];
    for (const line of lines.slice(at + 1)) {
        const item = /^\s+-\s+(.*)$/.exec(line);
        if (!item) break;
        items.push(unquote(item[1]!));
    }
    return items;
}

// The page a documentation path belongs to, as `<track>/<slug>`, if it is one.
export function pageKey(rel: string): string | undefined {
    const match = new RegExp(`^${CONTENT()}/([^/]+)/([^/]+)/`).exec(rel);
    const math = config().math ?? 'math';
    if (!match || match[1] == math || match[1] == 'archive') return undefined;
    return `${match[1]}/${match[2]}`;
}

export function pageExists(root: string, key: string): boolean {
    return ['md', 'svx'].some((ext) =>
        fs.existsSync(path.join(root, CONTENT(), key, `index.${ext}`)),
    );
}

export const hasTodo = (text: string) => /^>\s*\[!TODO\]/m.test(text);
