// What the engine adds to what skoro and the box had: managed files, `kinds`, and a config loaded
// from the project with nothing installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { run } from '../../src/engine/cli.ts';
import { contentHash } from '../../src/engine/lib.ts';
import { SKORO } from './configs.ts';

const MAIN = fileURLToPath(new URL('../../src/engine/main.ts', import.meta.url));

function repo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-engine-'));
    const sh = (...args: string[]) =>
        execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    sh('init', '-q', '-b', 'main');
    sh('config', 'user.email', 'test@example.org');
    sh('config', 'user.name', 'Test');
    write(root, 'README.md', 'x\n');
    sh('add', '-A');
    sh('commit', '-qm', 'root');
    sh('checkout', '-qb', 'work');
    return { root, sh, wf: (...argv: string[]) => run(argv, { cwd: root, config: SKORO }) };
}

function write(root: string, rel: string, text: string) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
}

function manage(root: string, files: Record<string, string>) {
    for (const [rel, text] of Object.entries(files)) write(root, rel, text);
    const hashes = Object.fromEntries(
        Object.entries(files).map(([rel, text]) => [rel, contentHash(text)]),
    );
    write(
        root,
        '.workflow/managed.json',
        JSON.stringify({ package: '@mvarble/mesearch-workflow', version: '0.1.0', files: hashes }),
    );
}

const guard = (root: string, rel: string) =>
    run(['guard'], {
        cwd: root,
        config: SKORO,
        stdin: JSON.stringify({ cwd: root, tool_input: { file_path: path.join(root, rel) } }),
    });

test('an edit to a managed file is refused, and sent upstream', () => {
    const r = repo();
    manage(r.root, { '.agents/skills/wf-status/SKILL.md': 'status\n' });
    const refused = guard(r.root, '.agents/skills/wf-status/SKILL.md');
    assert.equal(refused.code, 2);
    assert.match(refused.stderr, /managed by @mvarble\/mesearch-workflow 0\.1\.0: change it there/);
    // A skill of the project's own is its to edit.
    assert.equal(guard(r.root, '.agents/skills/wf-math/SKILL.md').code, 0);
});

test('check finds a managed file changed or deleted, line endings aside', () => {
    const r = repo();
    manage(r.root, { 'bin/wf': 'one\ntwo\n', '.agents/reference/mesearch/workflow.md': 'w\n' });
    r.sh('add', '-A');
    r.sh('commit', '-qm', 'sync');
    assert.equal(r.wf('check').code, 0);

    write(r.root, 'bin/wf', 'one\r\ntwo\r\n');
    assert.equal(r.wf('check').code, 0);

    write(r.root, 'bin/wf', 'edited\n');
    fs.rmSync(path.join(r.root, '.agents/reference/mesearch/workflow.md'));
    const found = r.wf('check');
    assert.equal(found.code, 1);
    assert.match(
        found.stderr,
        /bin\/wf is managed by @mvarble\/mesearch-workflow 0\.1\.0, and was changed here/,
    );
    assert.match(
        found.stderr,
        /workflow\.md is managed by @mvarble\/mesearch-workflow, and is missing/,
    );
});

test('kinds lists each kind with its stages and when it is used', () => {
    const listed = repo().wf('kinds');
    assert.equal(listed.code, 0);
    assert.match(
        listed.stdout,
        /^feature: math → implementation → plan → build → publish\n {4}needs mathematics worked out$/m,
    );
    assert.match(listed.stdout, /^chore: plan → build → publish$/m);
});

test('a stage with no stage that opens an area says the kind does not change it', () => {
    const r = repo();
    r.wf('start', 'tidy', '--kind', 'decision');
    const refused = guard(r.root, 'crates/skoro/src/lib.rs');
    assert.equal(refused.code, 2);
    assert.match(refused.stderr, /is code, which a decision does not change/);
});

test('the engine loads the project’s config with nothing installed', () => {
    const r = repo();
    write(
        r.root,
        'workflow.config.ts',
        [
            "import type { WorkflowConfig } from '@mvarble/mesearch-workflow';",
            '',
            'export default {',
            "    project: 'demo',",
            '    code: [/^src\\//],',
            "    kinds: { chore: { stages: ['plan', 'build', 'publish'], describe: 'tidying' } },",
            '    stages: {',
            "        plan: { document: true, checklist: true, editableDuring: ['build'] },",
            "        build: { unlocks: ['code'] },",
            "        publish: { unlocks: ['pages'] },",
            '    },',
            '} satisfies WorkflowConfig;',
            '',
        ].join('\n'),
    );
    const main = (...argv: string[]) =>
        spawnSync(process.execPath, [MAIN, ...argv], { cwd: r.root, encoding: 'utf8' });
    const kinds = main('kinds');
    assert.equal(kinds.status, 0, kinds.stderr);
    assert.match(kinds.stdout, /^chore: plan → build → publish$/m);

    const guarded = spawnSync(process.execPath, [MAIN, 'guard'], {
        cwd: r.root,
        encoding: 'utf8',
        input: JSON.stringify({
            cwd: r.root,
            tool_input: { file_path: path.join(r.root, 'src/a.ts') },
        }),
    });
    assert.equal(guarded.status, 2);
    assert.match(guarded.stderr, /src\/a\.ts is code, and no entry is active/);

    // Without a config there is nothing to guard, and every other command says what is missing.
    fs.rmSync(path.join(r.root, 'workflow.config.ts'));
    assert.equal(
        spawnSync(process.execPath, [MAIN, 'guard'], { cwd: r.root, input: '{}' }).status,
        0,
    );
    assert.match(main('status').stderr, /workflow\.config\.ts is missing/);
});
