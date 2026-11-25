// `bin/wf`: the workflow's command line. See `.agents/reference/mesearch/workflow.md`.
import fs from 'node:fs';
import path from 'node:path';

import type { WorkflowConfig } from './config.ts';
import {
    ACTIVE,
    activeSlug,
    amendKey,
    amendPath,
    amendTarget,
    type Amending,
    changedSince,
    checkboxes,
    config,
    CONTENT,
    contentHash,
    currentBranch,
    defaultBase,
    documentHash,
    documentPath,
    entryDir,
    frontmatterList,
    git,
    hasDocument,
    hasTodo,
    headCommit,
    isCommitted,
    isKind,
    listEntries,
    pageExists,
    pageKey,
    placeOf,
    readManifest,
    readWorkflow,
    refusal,
    repoRoot,
    setActive,
    skillOf,
    stageConfig,
    stagesOf,
    today,
    tryGit,
    type Stage,
    type Workflow,
    useConfig,
    WorkflowError,
    workflowFile,
    writeWorkflow,
} from './lib.ts';

export interface Result {
    code: number;
    stdout: string;
    stderr: string;
}

const usage = () => `usage: bin/wf <command>

  status [--expect <stage>]       where the active entry stands, and what comes next
  path [<stage>]                  the file of a stage's document (the current stage's by default)
  start <slug> --kind <kind> [--title <title>] [--revises <slug>,...]
                                  open an entry on this branch; kinds: ${Object.keys(config().kinds).join(', ')}
  kinds                           the kinds of entry, their stages, and when each is used
  approve                         accept the current stage and move to the next
  reopen <stage> --reason <text>  go back to an earlier stage
  abandon --reason <text>         set the active entry aside; its documents stay
  resume <slug>                   take up an abandoned entry again
  check [--base <ref>] [--merge]  verify the rules (run by CI); --merge also requires no active entry
  guard                           a Claude Code PreToolUse hook: refuses edits the stage does not allow

At its publish stage an entry may change a done entry's documents and statements, to keep a
reference in them true; it lists them under "amends" in its index.md, and approve records each
in the amended entry's history.

approve, reopen, abandon and resume are the human's to ask for.`;

class Output {
    out: string[] = [];
    err: string[] = [];
    say = (line = '') => void this.out.push(line);
    warn = (line: string) => void this.err.push(line);
    result = (code: number): Result => ({
        code,
        stdout: this.out.length ? this.out.join('\n') + '\n' : '',
        stderr: this.err.length ? this.err.join('\n') + '\n' : '',
    });
}

export interface RunOptions {
    cwd: string;
    stdin?: string;
    // The project's `workflow.config.ts`, which `main.ts` loads from the root.
    config: WorkflowConfig;
}

export function run(argv: string[], options: RunOptions): Result {
    const io = new Output();
    useConfig(options.config);
    try {
        const [command, ...rest] = argv;
        const args = parseArgs(rest);
        const root = repoRoot(options.cwd);
        switch (command) {
            case 'kinds':
                return kindsOf(io);
            case 'status':
                return status(root, args, io);
            case 'path':
                return pathOf(root, args, io);
            case 'start':
                return start(root, args, io);
            case 'approve':
                return approve(root, args, io);
            case 'reopen':
                return reopen(root, args, io);
            case 'abandon':
                return abandon(root, args, io);
            case 'resume':
                return resume(root, args, io);
            case 'check':
                return check(root, args, io);
            case 'guard':
                return guard(root, options.stdin ?? '', io);
            case undefined:
            case 'help':
            case '--help':
                io.say(usage());
                return io.result(0);
            default:
                io.warn(`wf: no command '${command}'.\n\n${usage()}`);
                return io.result(2);
        }
    } catch (error) {
        if (!(error instanceof WorkflowError)) throw error;
        io.warn(`wf: ${error.message}`);
        return io.result(1);
    }
}

interface Args {
    positional: string[];
    flags: Record<string, string | true>;
}

function parseArgs(argv: string[]): Args {
    const args: Args = { positional: [], flags: {} };
    for (let i = 0; i < argv.length; i++) {
        const arg = argv[i]!;
        if (!arg.startsWith('--')) {
            args.positional.push(arg);
            continue;
        }
        const [name, inline] = arg.slice(2).split(/=(.*)/s);
        const next = argv[i + 1];
        if (inline !== undefined) args.flags[name!] = inline;
        else if (next !== undefined && !next.startsWith('--')) {
            args.flags[name!] = next;
            i++;
        } else args.flags[name!] = true;
    }
    return args;
}

const flag = (args: Args, name: string) =>
    typeof args.flags[name] == 'string' ? (args.flags[name] as string) : undefined;

function requireActive(root: string): { slug: string; workflow: Workflow } {
    const slug = activeSlug(root);
    if (!slug) {
        throw new WorkflowError('no entry is active on this branch; start one with `/wf-start`.');
    }
    return { slug, workflow: readWorkflow(root, slug) };
}

function stageOf(workflow: Workflow): Stage {
    if (workflow.stage == 'done' || workflow.stage == 'abandoned') {
        throw new WorkflowError(`the entry is ${workflow.stage}.`);
    }
    return workflow.stage;
}

// What `wf-start` and the reference documents say of the kinds: one line each.
function kindsOf(io: Output): Result {
    for (const [kind, { stages, describe }] of Object.entries(config().kinds)) {
        io.say(`${kind}: ${stages.join(' → ')}`);
        io.say(`    ${describe}`);
    }
    return io.result(0);
}

// ---------------------------------------------------------------------------
// status, path

function status(root: string, args: Args, io: Output): Result {
    const expect = flag(args, 'expect');
    const slug = activeSlug(root);
    if (!slug) {
        if (expect) {
            io.warn(
                `wf: this step needs an entry at the ${expect} stage, and none is active on this ` +
                    'branch. Start one with `/wf-start`.',
            );
            return io.result(3);
        }
        io.say('No entry is active on this branch. Start one with `/wf-start <slug> <kind>`.');
        const entries = listEntries(root);
        if (entries.length) {
            io.say();
            io.say('Entries:');
            for (const entry of entries) {
                try {
                    const workflow = readWorkflow(root, entry);
                    io.say(`  ${entry.padEnd(28)} ${workflow.kind.padEnd(9)} ${workflow.stage}`);
                } catch (error) {
                    io.say(`  ${entry.padEnd(28)} (${(error as Error).message})`);
                }
            }
        }
        return io.result(0);
    }

    const workflow = readWorkflow(root, slug);
    if (expect && workflow.stage != expect) {
        io.warn(
            `wf: this step is for the ${expect} stage, but '${slug}' is at ${workflow.stage}. ` +
                (workflow.stage in config().stages
                    ? `The step for it is ${skillOf(workflow.stage)}.`
                    : ''),
        );
        return io.result(3);
    }

    const stages = stagesOf(workflow.kind);
    const line = stages
        .map((stage) => {
            if (stage == workflow.stage) return `[${stage}]`;
            const approval = workflow.approvals[stage];
            if (approval && !approval.stale) return `${stage} ✓`;
            if (approval?.stale) return `${stage} (reopened)`;
            return stage;
        })
        .join(' → ');
    io.say(`Entry:    ${slug} (${workflow.kind}), ${entryDir(slug)}/`);
    io.say(`Stage:    ${line}`);
    const stage = workflow.stage as Stage;
    if (hasDocument(stage)) io.say(`Document: ${documentPath(root, slug, stage)}`);
    for (const list of stages.filter((stage) => stageConfig(stage).checklist)) {
        const file = path.join(root, documentPath(root, slug, list));
        if (!fs.existsSync(file)) continue;
        const boxes = checkboxes(fs.readFileSync(file, 'utf8'));
        const label = `${list[0]!.toUpperCase()}${list.slice(1)}:`.padEnd(9);
        io.say(`${label} ${boxes.ticked} of ${boxes.total} done`);
    }
    io.say(
        `Next:     work with ${skillOf(stage)}; when it is right, \`/wf-approve\` moves on` +
            (stage == stages.at(-1) ? ' and finishes the entry.' : ` to ${nextStage(workflow)}.`),
    );
    return io.result(0);
}

function nextStage(workflow: Workflow): string {
    const stages = stagesOf(workflow.kind);
    return stages[stages.indexOf(workflow.stage as Stage) + 1] ?? 'done';
}

function pathOf(root: string, args: Args, io: Output): Result {
    const { slug, workflow } = requireActive(root);
    const stage = (args.positional[0] ?? workflow.stage) as Stage;
    if (!hasDocument(stage) || !stagesOf(workflow.kind).includes(stage)) {
        throw new WorkflowError(`the ${stage} stage of a ${workflow.kind} has no document.`);
    }
    io.say(documentPath(root, slug, stage));
    return io.result(0);
}

// ---------------------------------------------------------------------------
// start

function start(root: string, args: Args, io: Output): Result {
    const [slug] = args.positional;
    const kind = flag(args, 'kind');
    if (!slug || !kind) throw new WorkflowError('usage: wf start <slug> --kind <kind>');
    if (!isKind(kind)) {
        throw new WorkflowError(
            `'${kind}' is not a kind; one of ${Object.keys(config().kinds).join(', ')}.`,
        );
    }
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
        throw new WorkflowError(`'${slug}' is not a slug: lowercase words joined by hyphens.`);
    }
    const active = activeSlug(root);
    if (active) {
        const workflow = readWorkflow(root, active);
        throw new WorkflowError(
            `'${active}' is active on this branch (at ${workflow.stage}). Finish it, abandon it, ` +
                'or start the new entry on another branch.',
        );
    }
    const branch = currentBranch(root);
    if (branch == 'main') {
        throw new WorkflowError('entries are worked on in a branch of their own, not on main.');
    }
    if (fs.existsSync(path.join(root, entryDir(slug)))) {
        throw new WorkflowError(
            `${entryDir(slug)} exists already. An abandoned entry is taken up with \`wf resume\`; ` +
                'a finished one is revised by a new entry with `--revises`.',
        );
    }
    const revises = (flag(args, 'revises') ?? '').split(',').filter(Boolean);
    for (const earlier of revises) {
        if (!fs.existsSync(path.join(root, workflowFile(earlier)))) {
            throw new WorkflowError(`--revises names '${earlier}', which is not an entry.`);
        }
    }

    const title = flag(args, 'title') ?? slug;
    const first = stagesOf(kind)[0]!;
    const frontmatter = [
        '---',
        `title: ${JSON.stringify(title)}`,
        'pages: []',
        ...Object.entries(config().entryFields ?? {}).map(([field, value]) => `${field}: ${value}`),
        ...(revises.length ? [`revises: [${revises.join(', ')}]`] : []),
        '---',
    ];
    const body = ['> [!TODO]', '> Say in a paragraph what this entry sets out to do, and why.'];
    fs.mkdirSync(path.join(root, entryDir(slug)), { recursive: true });
    fs.writeFileSync(
        path.join(root, entryDir(slug), 'index.md'),
        [...frontmatter, '', ...body, ''].join('\n'),
    );
    writeWorkflow(root, slug, {
        kind,
        stage: first,
        started: today(),
        events: [{ date: today(), action: 'start', stage: first }],
        approvals: {},
    });
    setActive(root, slug);

    io.say(`Started '${slug}', a ${kind}, at the ${first} stage.`);
    io.say(`  ${entryDir(slug)}/index.md`);
    io.say(`  ${workflowFile(slug)}`);
    io.say(`  ${ACTIVE}`);
    io.say(`Next: ${skillOf(first)}.`);
    return io.result(0);
}

// ---------------------------------------------------------------------------
// approve

function approve(root: string, args: Args, io: Output): Result {
    const { slug, workflow } = requireActive(root);
    const stage = stageOf(workflow);
    const problems = [
        ...lockProblems(root, slug, workflow),
        ...readiness(root, slug, workflow, stage, flag(args, 'base')),
    ];
    if (problems.length) {
        throw new WorkflowError(
            `the ${stage} stage of '${slug}' is not ready:\n${problems.map((p) => `  - ${p}`).join('\n')}`,
        );
    }

    const commit = headCommit(root);
    const amended = stage == 'publish' ? recordAmendments(root, slug, commit) : [];
    const doc = hasDocument(stage) ? documentPath(root, slug, stage) : undefined;
    workflow.approvals[stage] = {
        date: today(),
        commit,
        ...(doc ? { hash: documentHash(root, doc, stage) } : {}),
    };
    workflow.events.push({ date: today(), action: 'approve', stage, commit });
    const next = nextStage(workflow);
    if (next == 'done') {
        workflow.stage = 'done';
        workflow.finished = today();
        setActive(root, undefined);
    } else {
        workflow.stage = next as Stage;
    }
    writeWorkflow(root, slug, workflow);

    io.say(`Approved the ${stage} stage of '${slug}' at ${commit}.`);
    for (const other of amended) {
        io.say(`Recorded its amendments of '${other}'. Commit ${workflowFile(other)}.`);
    }
    if (next == 'done') {
        io.say(`'${slug}' is done, and no entry is active on this branch.`);
        io.say(`Commit ${workflowFile(slug)} and the removal of ${ACTIVE}.`);
    } else {
        io.say(`Now at ${next}: ${skillOf(next)}. Commit ${workflowFile(slug)}.`);
    }
    return io.result(0);
}

// What an entry lists under `amends` in its `index.md`: the documents and statements of done
// entries it changed, to keep their references into the math notes true.
function amendsOf(root: string, slug: string): string[] {
    const index = path.join(root, entryDir(slug), 'index.md');
    if (!fs.existsSync(index)) return [];
    return frontmatterList(fs.readFileSync(index, 'utf8'), 'amends') ?? [];
}

// What the entry `slug` may change in the others, for `refusal`.
function amendingOf(root: string, slug: string | undefined): Amending {
    return {
        isDone: (other) => tryWorkflow(root, other)?.stage == 'done',
        amends: slug ? amendsOf(root, slug) : [],
    };
}

function tryWorkflow(root: string, slug: string): Workflow | undefined {
    try {
        return readWorkflow(root, slug);
    } catch {
        return undefined;
    }
}

// Writes each amendment into the amended entry's record: the document's new hash, which it is
// held to from now on, and an event that names the amending entry. The commit of the document's
// own approval stays, and is where its text before the amendment is found. Returns the entries
// amended.
function recordAmendments(root: string, slug: string, commit: string): string[] {
    const amended = new Map<string, Workflow>();
    for (const key of amendsOf(root, slug)) {
        const target = amendTarget(key)!;
        const other = amended.get(target.slug) ?? readWorkflow(root, target.slug);
        amended.set(target.slug, other);
        const approval = target.stage && other.approvals[target.stage];
        if (approval) approval.hash = documentHash(root, amendPath(root, key)!, target.stage!);
        other.events.push({
            date: today(),
            action: 'amend',
            ...(target.stage ? { stage: target.stage } : {}),
            document: key,
            by: slug,
            commit,
        });
    }
    for (const [other, workflow] of amended) writeWorkflow(root, other, workflow);
    return [...amended.keys()];
}

// What keeps a stage from being approved, beyond the locks.
function readiness(
    root: string,
    slug: string,
    workflow: Workflow,
    stage: Stage,
    base: string | undefined,
): string[] {
    const problems: string[] = [];
    const read = (rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');

    if (hasDocument(stage)) {
        const doc = documentPath(root, slug, stage);
        if (!fs.existsSync(path.join(root, doc))) return [`${doc} does not exist.`];
        const text = read(doc);
        if (!isCommitted(root, doc)) problems.push(`${doc} has uncommitted changes.`);
        if (!text.replace(/^---[\s\S]*?\n---/, '').trim()) problems.push(`${doc} is empty.`);
        if (hasTodo(text)) problems.push(`${doc} still has a [!TODO]: open questions remain.`);
        for (const section of stageConfig(stage).sections ?? []) {
            if (!new RegExp(`^#{2,3} ${escape(section)}\\b`, 'm').test(text)) {
                problems.push(`${doc} has no "## ${section}" section.`);
            }
        }
        if (stageConfig(stage).checklist && checkboxes(text).total == 0) {
            problems.push(`${doc} has no checklist (\`- [ ] ...\`).`);
        }
    }

    if (stage == 'build') {
        const lists = stagesOf(workflow.kind).filter((other) => stageConfig(other).checklist);
        for (const list of lists) {
            const file = documentPath(root, slug, list);
            if (!fs.existsSync(path.join(root, file))) continue;
            const boxes = checkboxes(read(file));
            if (boxes.open) problems.push(`${file} has ${boxes.open} unticked items.`);
        }
        const dirty = uncommitted(root);
        if (dirty) problems.push(`the working tree has uncommitted changes:\n${dirty}`);
    }

    if (stage == 'publish') {
        const index = `${entryDir(slug)}/index.md`;
        const text = read(index);
        if (hasTodo(text)) problems.push(`${index} still has a [!TODO].`);
        if (!isCommitted(root, index)) problems.push(`${index} has uncommitted changes.`);
        const listed = frontmatterList(text, 'pages') ?? [];
        for (const key of listed) {
            if (!pageExists(root, key))
                problems.push(`${index} lists page '${key}', which does not exist.`);
        }
        const amends = amendsOf(root, slug);
        for (const key of amends) {
            const target = amendTarget(key);
            const file = amendPath(root, key);
            if (!target || !file || target.slug == slug) {
                problems.push(
                    `${index} lists '${key}' under \`amends\`, which names no document or statement of another entry.`,
                );
            } else if (tryWorkflow(root, target.slug)?.stage != 'done') {
                problems.push(
                    `${index} amends '${key}', but '${target.slug}' is not a done entry.`,
                );
            } else if (!fs.existsSync(path.join(root, file))) {
                problems.push(`${index} amends '${key}', which does not exist.`);
            } else if (!isCommitted(root, file)) {
                problems.push(`${file} has uncommitted changes.`);
            }
        }
        const ref = base ?? defaultBase(root);
        const changed = ref ? changedSince(root, ref) : undefined;
        if (changed) {
            // What it changed in other entries: only what it lists, and all of what it lists.
            const amended = new Set<string>();
            for (const rel of changed) {
                const place = placeOf(rel);
                if (place.area != 'entry' || place.slug == slug) continue;
                const key = amendKey(rel);
                if (!key) {
                    problems.push(
                        `${rel} belongs to entry '${place.slug}', and is not a document or a statement an entry may amend.`,
                    );
                } else if (!amends.includes(key)) {
                    problems.push(
                        `${rel} changed on this branch; list it as '${key}' under \`amends\` in ${index}.`,
                    );
                } else amended.add(key);
            }
            for (const key of amends) {
                if (!amended.has(key))
                    problems.push(`${index} amends '${key}', which this branch did not change.`);
            }
            const pages = new Set(changed.map(pageKey).filter((key) => key !== undefined));
            for (const key of pages) {
                if (!listed.includes(key) && pageExists(root, key)) {
                    problems.push(
                        `page '${key}' changed on this branch; list it under \`pages\` in ${index}.`,
                    );
                }
            }
            for (const key of listed) {
                if (!pages.has(key))
                    problems.push(
                        `${index} lists page '${key}', which this branch did not change.`,
                    );
            }
            const landingFile = `${CONTENT()}/${config().landing ?? 'landing'}`;
            const landing = changed.some(
                (rel) => rel == `${landingFile}.md` || rel == `${landingFile}.svx`,
            );
            const optional = config().pagesOptional ?? [];
            if (!optional.includes(workflow.kind) && !pages.size && !landing) {
                problems.push(
                    'no documentation page changed: say what this entry made true in the docs.',
                );
            }
        }
    }

    // The project's own conditions for the stage.
    const own = config().checks?.[stage];
    if (own) {
        const index = `${entryDir(slug)}/index.md`;
        const text = fs.existsSync(path.join(root, index)) ? read(index) : '';
        const ref = base ?? defaultBase(root);
        problems.push(
            ...own({
                root,
                slug,
                index,
                text,
                changed: ref ? changedSince(root, ref) : undefined,
                list: (field) => frontmatterList(text, field),
            }),
        );
    }
    return problems;
}

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// What `git status` lists, indented to sit under a problem.
function uncommitted(root: string): string {
    return git(root, 'status', '--porcelain')
        .split('\n')
        .filter(Boolean)
        .map((line) => `    ${line}`)
        .join('\n');
}

// ---------------------------------------------------------------------------
// reopen, abandon, resume

function reopen(root: string, args: Args, io: Output): Result {
    const { slug, workflow } = requireActive(root);
    const current = stageOf(workflow);
    const stage = args.positional[0] as Stage | undefined;
    const reason = flag(args, 'reason');
    const stages = stagesOf(workflow.kind);
    if (!stage || !reason) throw new WorkflowError('usage: wf reopen <stage> --reason <text>');
    if (!stages.includes(stage) || stages.indexOf(stage) >= stages.indexOf(current)) {
        throw new WorkflowError(
            `'${stage}' is not a stage of this ${workflow.kind} before ${current}.`,
        );
    }
    for (const earlier of stages.slice(stages.indexOf(stage), stages.indexOf(current))) {
        const approval = workflow.approvals[earlier];
        if (approval) approval.stale = true;
    }
    workflow.stage = stage;
    workflow.events.push({
        date: today(),
        action: 'reopen',
        stage,
        reason,
        commit: headCommit(root),
    });
    writeWorkflow(root, slug, workflow);
    io.say(`Reopened '${slug}' at ${stage}: ${reason}`);
    if (hasDocument(stage)) {
        io.say(
            `Revise ${documentPath(root, slug, stage)} with ${skillOf(stage)}, and say what changed ` +
                'and why under its "## Revisions" heading.',
        );
    }
    io.say(`Every stage from ${stage} to ${current} is approved again on the way back.`);
    return io.result(0);
}

function abandon(root: string, args: Args, io: Output): Result {
    const { slug, workflow } = requireActive(root);
    const stage = stageOf(workflow);
    const reason = flag(args, 'reason');
    if (!reason) throw new WorkflowError('usage: wf abandon --reason <text>');
    workflow.events.push({
        date: today(),
        action: 'abandon',
        stage,
        reason,
        commit: headCommit(root),
    });
    workflow.stage = 'abandoned';
    writeWorkflow(root, slug, workflow);
    setActive(root, undefined);
    io.say(
        `Set '${slug}' aside at ${stage}. Its documents stay in the archive; \`wf resume ${slug}\` takes it up again.`,
    );
    return io.result(0);
}

function resume(root: string, args: Args, io: Output): Result {
    const [slug] = args.positional;
    if (!slug) throw new WorkflowError('usage: wf resume <slug>');
    const active = activeSlug(root);
    if (active) throw new WorkflowError(`'${active}' is active on this branch.`);
    const workflow = readWorkflow(root, slug);
    if (workflow.stage != 'abandoned') {
        throw new WorkflowError(`'${slug}' is ${workflow.stage}, not abandoned.`);
    }
    const left =
        workflow.events.findLast((event) => event.action == 'abandon')?.stage ??
        stagesOf(workflow.kind)[0]!;
    workflow.stage = left;
    workflow.events.push({ date: today(), action: 'resume', stage: left });
    writeWorkflow(root, slug, workflow);
    setActive(root, slug);
    io.say(`Took up '${slug}' again at ${left}: ${skillOf(left)}.`);
    return io.result(0);
}

// ---------------------------------------------------------------------------
// check, guard

// Documents changed after they were approved, documents written before their
// stage, and drafts changed while the entry was reopened at an earlier stage.
function lockProblems(
    root: string,
    slug: string,
    workflow: Workflow,
    amended: string[] = [],
): string[] {
    const problems: string[] = [];
    const stages = stagesOf(workflow.kind);
    const current = workflow.stage;
    for (const stage of stages.filter(hasDocument)) {
        const doc = documentPath(root, slug, stage);
        const exists = fs.existsSync(path.join(root, doc));
        const approval = workflow.approvals[stage];
        if (stage == current) continue;
        if (approval?.hash) {
            // A document the entry at publish amends is held to its new hash once that entry's
            // publish is approved.
            const amending = current == 'done' && amended.includes(`archive/${slug}/${stage}`);
            if (!amending && documentHash(root, doc, stage) != approval.hash) {
                problems.push(
                    `${doc} changed after it was approved at ${approval.commit}; reopen ${stage} to change it.`,
                );
            }
        } else if (exists && current != 'done') {
            // A draft the entry had reached before it was reopened waits, unchanged, for its
            // stage to come round again.
            const reopened = workflow.events.findLast((event) => event.action == 'reopen')?.commit;
            const kept =
                reopened && tryGit(root, 'cat-file', '-e', `${reopened}:${doc}`) != undefined;
            if (!kept) {
                problems.push(`${doc} was written before its stage; '${slug}' is at ${current}.`);
            } else if (tryGit(root, 'diff', '--quiet', reopened, '--', doc) == undefined) {
                problems.push(
                    `${doc} changed after '${slug}' was reopened at ${reopened}; it waits for its stage.`,
                );
            }
        }
        if (current == 'done' && (!approval || approval.stale)) {
            problems.push(`'${slug}' is done, but its ${stage} stage was never approved.`);
        }
    }
    return problems;
}

// Whether `rel` was in the tree at `commit` and is unchanged since.
function keptSince(root: string, commit: string, rel: string): boolean {
    return (
        tryGit(root, 'cat-file', '-e', `${commit}:${rel}`) != undefined &&
        tryGit(root, 'diff', '--quiet', commit, '--', rel) != undefined
    );
}

function check(root: string, args: Args, io: Output): Result {
    const problems: string[] = [];
    const active = activeSlug(root);
    const workflows = new Map<string, Workflow>();
    const publishing = active && tryWorkflow(root, active)?.stage == 'publish';
    const amended = publishing ? amendsOf(root, active) : [];
    for (const slug of listEntries(root)) {
        try {
            const workflow = readWorkflow(root, slug);
            workflows.set(slug, workflow);
            problems.push(...lockProblems(root, slug, workflow, amended));
        } catch (error) {
            problems.push((error as Error).message);
        }
    }
    if (active) {
        const workflow = workflows.get(active);
        if (!workflow) problems.push(`${ACTIVE} names '${active}', which is not an entry.`);
        else if (workflow.stage == 'done' || workflow.stage == 'abandoned') {
            problems.push(`${ACTIVE} names '${active}', which is ${workflow.stage}.`);
        }
    }

    const base = flag(args, 'base') ?? defaultBase(root);
    const changed = base ? changedSince(root, base) : undefined;
    if (!changed) {
        io.say(`Skipped the branch rules: no base to compare with${base ? ` ('${base}')` : ''}.`);
    } else {
        const touched = [
            ...new Set(
                changed
                    .map(placeOf)
                    .flatMap((place) => (place.area == 'entry' ? [place.slug] : [])),
            ),
        ];
        // The entry the branch works on: the active one, or else the one whose `amends` accounts
        // for what the branch changed in the others.
        const amendedBy = (other: string, by: string) => {
            const amends = amendsOf(root, by);
            return changed
                .filter((rel) => {
                    const place = placeOf(rel);
                    return place.area == 'entry' && place.slug == other;
                })
                .every((rel) => amends.includes(amendKey(rel) ?? ''));
        };
        const slug =
            active ??
            touched.find((by) => touched.every((other) => other == by || amendedBy(other, by))) ??
            touched[0];
        const own = touched.filter((other) => other == slug || !slug || !amendedBy(other, slug));
        if (own.length > 1) {
            problems.push(
                `this branch changes ${own.length} entries (${own.join(', ')}); one branch works on one.`,
            );
        }
        const workflow = slug ? workflows.get(slug) : undefined;
        const subject = slug && workflow ? { slug, workflow } : undefined;
        const amending = amendingOf(root, slug);
        // Code, math notes and pages written before a reopening wait, unchanged, for the stage
        // that opens them to come round again, as a draft does.
        const reopened = subject?.workflow.events.findLast(
            (event) => event.action == 'reopen',
        )?.commit;
        for (const rel of changed) {
            const why = refusal(rel, subject, false, amending);
            if (!why) continue;
            if (reopened && placeOf(rel).area != 'entry' && keptSince(root, reopened, rel))
                continue;
            problems.push(why);
        }
    }
    problems.push(...managedProblems(root));
    if (args.flags.merge && active) {
        const stage = workflows.get(active)?.stage;
        problems.push(
            `'${active}' is still at ${stage}: finish it with \`/wf-approve\` or set it aside with ` +
                '`/wf-abandon` before merging.',
        );
    }

    if (problems.length) {
        io.warn(`wf check found ${problems.length} problem${problems.length == 1 ? '' : 's'}:`);
        for (const problem of problems) io.warn(`  - ${problem}`);
        return io.result(1);
    }
    io.say(`wf check: ok${active ? ` ('${active}' at ${workflows.get(active)?.stage})` : ''}.`);
    return io.result(0);
}

// Managed files changed since `mesearch-wf sync` wrote them: they are the package's, and a change
// to one is made upstream.
function managedProblems(root: string): string[] {
    const manifest = readManifest(root);
    if (!manifest) return [];
    const problems: string[] = [];
    for (const [rel, hash] of Object.entries(manifest.files)) {
        const file = path.join(root, rel);
        if (!fs.existsSync(file)) {
            problems.push(
                `${rel} is managed by ${manifest.package}, and is missing; run \`mesearch-wf sync\`.`,
            );
        } else if (contentHash(fs.readFileSync(file, 'utf8')) != hash) {
            problems.push(
                `${rel} is managed by ${manifest.package} ${manifest.version}, and was changed here: ` +
                    `change it in ${manifest.package} instead, and run \`mesearch-wf sync\` to restore it.`,
            );
        }
    }
    return problems;
}

// A Claude Code PreToolUse hook. The tool call arrives on stdin as JSON; exit
// code 2 refuses it and shows stderr to the agent.
function guard(root: string, stdin: string, io: Output): Result {
    let input: { cwd?: string; tool_input?: Record<string, unknown> };
    try {
        input = JSON.parse(stdin || '{}');
    } catch {
        return io.result(0);
    }
    const target = input.tool_input?.file_path ?? input.tool_input?.notebook_path;
    if (typeof target != 'string') return io.result(0);
    const rel = path.relative(root, path.resolve(input.cwd ?? root, target));
    if (rel.startsWith('..') || path.isAbsolute(rel)) return io.result(0);

    let subject: { slug: string; workflow: Workflow } | undefined;
    const slug = activeSlug(root);
    if (slug) {
        try {
            subject = { slug, workflow: readWorkflow(root, slug) };
        } catch (error) {
            io.warn(`wf guard: ${(error as Error).message}`);
            return io.result(0);
        }
    }
    const why = refusal(rel, subject, true, amendingOf(root, slug), readManifest(root));
    if (!why) return io.result(0);
    io.warn(`wf: ${why}`);
    return io.result(2);
}
