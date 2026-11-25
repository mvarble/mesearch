// `mesearch-wf init` and `sync`, in throwaway repositories: what is written, what the vendored
// engine does with nothing installed, and what sync leaves alone.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { init } from '../../src/sync/init.ts';
import { outdated, sync } from '../../src/sync/index.ts';

const packageDir = fileURLToPath(new URL('../..', import.meta.url));

// The engine is vendored from `dist/`, which a fresh checkout may not have yet.
before(() => {
    if (!fs.existsSync(path.join(packageDir, 'dist/engine/main.js'))) {
        execFileSync('npx', ['tsc', '-p', 'tsconfig.json'], { cwd: packageDir });
    }
});

function repo(name = 'demo') {
    const root = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'wf-sync-')), name);
    fs.mkdirSync(root);
    const sh = (...args) =>
        execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    sh('init', '-q', '-b', 'main');
    sh('config', 'user.email', 'test@example.org');
    sh('config', 'user.name', 'Test');
    return { root, sh };
}

const read = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const exists = (root, rel) => fs.existsSync(path.join(root, rel));
const wf = (root, args, input) =>
    spawnSync(path.join(root, 'bin/wf'), args, { cwd: root, encoding: 'utf8', input });

test('init sets a repository up, and the engine runs with nothing installed', async () => {
    const { root } = repo();
    await init(root);
    for (const rel of [
        'workflow.config.ts',
        'AGENTS.md',
        '.agents/reference/authoring.md',
        '.agents/reference/mesearch/workflow.md',
        '.agents/reference/mesearch/authoring.md',
        '.agents/reference/mesearch/markup.md',
        '.agents/skills/wf-start/SKILL.md',
        '.claude/skills/wf-start/SKILL.md',
        '.workflow/engine/main.js',
        '.workflow/managed.json',
        'site/src/lib/site.ts',
        'site/src/routes/archive/+page.svelte',
        'site/src/lib/components/Statement.svelte',
    ]) {
        assert.ok(exists(root, rel), `${rel} is written`);
    }
    assert.ok(fs.statSync(path.join(root, 'bin/wf')).mode & 0o100, 'bin/wf is executable');
    assert.match(read(root, '.claude/settings.json'), /bin\/wf guard/);

    // The skills and the procedure are written from the config.
    const start = read(root, '.agents/skills/wf-start/SKILL.md');
    assert.match(start, /demo's development workflow/);
    assert.match(start, /<feature\|decision\|chore>/);
    assert.match(
        start,
        /- \*\*decision\*\* \(`writeup` → `publish`\): a position, argued in prose/,
    );
    const procedure = read(root, '.agents/reference/mesearch/workflow.md');
    assert.match(procedure, /\| `feature` +\| `plan` → `build` → `publish` +\|/);
    assert.match(procedure, /the code \(`src\/`\) at `build`/);
    for (const text of [start, procedure]) assert.doesNotMatch(text, /\{\{/);

    // No `node_modules` anywhere: the engine and the config load with Node alone.
    assert.ok(!exists(root, 'node_modules'));
    const kinds = wf(root, ['kinds']);
    assert.equal(kinds.status, 0, kinds.stderr);
    assert.match(kinds.stdout, /^feature: plan → build → publish$/m);
});

test('the guard refuses an edit to a managed file, through the Claude Code link too', async () => {
    const { root } = repo();
    await init(root);
    for (const rel of ['.agents/skills/wf-plan/SKILL.md', '.claude/skills/wf-plan/SKILL.md']) {
        const refused = wf(
            root,
            ['guard'],
            JSON.stringify({ cwd: root, tool_input: { file_path: path.join(root, rel) } }),
        );
        assert.equal(refused.status, 2, rel);
        assert.match(
            refused.stderr,
            /\.agents\/skills\/wf-plan\/SKILL\.md is managed by @mvarble\/mesearch-workflow/,
        );
    }
    const own = wf(
        root,
        ['guard'],
        JSON.stringify({ cwd: root, tool_input: { file_path: path.join(root, 'AGENTS.md') } }),
    );
    assert.equal(own.status, 0);
});

test('sync restores what changed, leaves the project’s files alone, and is idempotent', async () => {
    const { root, sh } = repo();
    await init(root);
    sh('add', '-A');
    sh('commit', '-qm', 'init');
    assert.equal(wf(root, ['check']).status, 0, wf(root, ['check']).stderr);

    fs.writeFileSync(path.join(root, 'AGENTS.md'), 'mine\n');
    fs.writeFileSync(path.join(root, '.agents/reference/mesearch/workflow.md'), 'edited\n');
    fs.rmSync(path.join(root, 'site/src/routes/math/+page.svelte'));
    const check = wf(root, ['check']);
    assert.equal(check.status, 1);
    assert.match(
        check.stderr,
        /workflow\.md is managed by @mvarble\/mesearch-workflow .*, and was changed here/,
    );
    assert.match(
        check.stderr,
        /math\/\+page\.svelte is managed by @mvarble\/mesearch-workflow, and is missing/,
    );
    assert.deepEqual(await outdated(root), [
        '.agents/reference/mesearch/workflow.md',
        'site/src/routes/math/+page.svelte',
    ]);

    const report = await sync(root);
    assert.deepEqual(report.updated, ['.agents/reference/mesearch/']);
    assert.deepEqual(report.written, ['site/src/routes/math/+page.svelte']);
    assert.equal(read(root, 'AGENTS.md'), 'mine\n');
    assert.deepEqual(await outdated(root), []);

    const again = await sync(root);
    assert.deepEqual([again.written, again.updated, again.removed], [[], [], []]);
});

test('a file no longer shipped is removed, unless it was changed here', async () => {
    const { root } = repo();
    await init(root);
    const manifest = JSON.parse(read(root, '.workflow/managed.json'));
    const { contentHash } = await import('../../src/engine/lib.ts');
    for (const [rel, text] of [
        ['site/src/routes/old/+page.svelte', 'old\n'],
        ['site/src/routes/kept/+page.svelte', 'old\n'],
    ]) {
        fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
        fs.writeFileSync(path.join(root, rel), text);
        manifest.files[rel] = contentHash(text);
    }
    fs.writeFileSync(path.join(root, '.workflow/managed.json'), JSON.stringify(manifest));
    fs.writeFileSync(path.join(root, 'site/src/routes/kept/+page.svelte'), 'mine\n');

    const report = await sync(root);
    assert.deepEqual(report.removed, ['site/src/routes/old/+page.svelte']);
    assert.deepEqual(report.kept, ['site/src/routes/kept/+page.svelte']);
    assert.ok(exists(root, 'site/src/routes/kept/+page.svelte'));
});

test('init keeps what a repository has, and an existing site is the project’s', async () => {
    const { root } = repo();
    fs.writeFileSync(path.join(root, 'AGENTS.md'), 'mine\n');
    fs.mkdirSync(path.join(root, 'site'));
    fs.mkdirSync(path.join(root, '.claude'));
    fs.writeFileSync(
        path.join(root, '.claude/settings.json'),
        JSON.stringify({ permissions: { allow: ['Bash(ls)'] } }),
    );
    const report = await init(root);
    assert.equal(read(root, 'AGENTS.md'), 'mine\n');
    assert.ok(report.skipped.includes('AGENTS.md'));
    assert.ok(
        !exists(root, 'site/src/lib/site.ts'),
        'the template site is not written over a site',
    );
    assert.ok(exists(root, 'site/src/routes/archive/+page.svelte'), 'the managed routes are');
    const settings = JSON.parse(read(root, '.claude/settings.json'));
    assert.deepEqual(settings.permissions, { allow: ['Bash(ls)'] });
    assert.equal(settings.hooks.PreToolUse.length, 1);
    await init(root);
    assert.equal(JSON.parse(read(root, '.claude/settings.json')).hooks.PreToolUse.length, 1);
});

test('the example site holds the managed wrappers as this version writes them', async () => {
    const { siteFiles } = await import('../../src/sync/site.ts');
    const example = path.resolve(packageDir, '../../docs-example');
    for (const [rel, text] of siteFiles()) {
        assert.equal(read(example, rel), text, `${rel} is as sync writes it`);
    }
});
