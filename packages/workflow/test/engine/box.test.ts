// The workflow tool, driven through its command line in throwaway repositories.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { run } from '../../src/engine/cli.ts';
import { frontmatterList, placeOf, useConfig } from '../../src/engine/lib.ts';
import { BOX } from './configs.ts';

useConfig(BOX);

function repo() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'wf-'));
    const sh = (...args: string[]) =>
        execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: 'pipe' });
    sh('init', '-q', '-b', 'main');
    sh('config', 'user.email', 'test@example.org');
    sh('config', 'user.name', 'Test');
    write(root, 'README.md', 'fusion box\n');
    write(
        root,
        'site/content/system/time-base/index.md',
        '---\ntitle: Time\norder: 1\n---\n\nHi.\n',
    );
    sh('add', '-A');
    sh('commit', '-qm', 'root');
    sh('checkout', '-qb', 'work');
    const wf = (...argv: string[]) => run(argv, { cwd: root, config: BOX });
    const commit = (message = 'step') => {
        sh('add', '-A');
        sh('commit', '-qm', message);
    };
    return { root, wf, commit, sh };
}

function write(root: string, rel: string, text: string) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), text);
}

const read = (root: string, rel: string) => fs.readFileSync(path.join(root, rel), 'utf8');
const entry = 'site/content/archive/m1';
const workflow = (root: string) => JSON.parse(read(root, `${entry}/workflow.json`));
const results = '## Method\n\nThe AD3.\n\n## Results\n\n| bias |\n|---|\n| 6 us |\n';

// Takes a milestone through its plan, ready to build.
function toBuild(r: ReturnType<typeof repo>) {
    r.wf('start', 'm1', '--kind', 'milestone', '--title', 'Time base');
    write(r.root, `${entry}/index.md`, '---\ntitle: Time base\npages: []\n---\n\nThe clock.\n');
    write(r.root, `${entry}/plan.md`, '- [ ] Add it.\n- [ ] Test it.\n');
    r.commit();
    assert.equal(r.wf('approve').code, 0);
}

// Takes a milestone through its build and measurements, ready to publish.
function toPublish(r: ReturnType<typeof repo>) {
    toBuild(r);
    write(r.root, `${entry}/plan.md`, '- [x] Add it.\n- [x] Test it.\n');
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    write(r.root, `${entry}/measure.md`, results);
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    r.commit();
    assert.equal(workflow(r.root).stage, 'publish');
}

test('start opens one entry per branch, never on main', () => {
    const r = repo();
    const started = r.wf('start', 'm1', '--kind', 'milestone');
    assert.equal(started.code, 0, started.stderr);
    assert.equal(read(r.root, '.workflow/active'), 'm1\n');
    assert.equal(workflow(r.root).stage, 'plan');
    assert.match(read(r.root, `${entry}/index.md`), /\[!TODO\]/);

    const second = r.wf('start', 'other', '--kind', 'chore');
    assert.equal(second.code, 1);
    assert.match(second.stderr, /'m1' is active on this branch/);

    const main = repo();
    main.sh('checkout', '-q', 'main');
    assert.match(main.wf('start', 'x', '--kind', 'chore').stderr, /not on main/);
    assert.match(main.wf('start', 'Bad_Slug', '--kind', 'chore').stderr, /not a slug/);
    assert.match(main.wf('start', 'x', '--kind', 'epic').stderr, /'epic' is not a kind/);
});

test('status --expect refuses the wrong stage', () => {
    const r = repo();
    assert.equal(r.wf('status', '--expect', 'plan').code, 3);
    r.wf('start', 'm1', '--kind', 'milestone');
    assert.equal(r.wf('status', '--expect', 'plan').code, 0);
    const wrong = r.wf('status', '--expect', 'build');
    assert.equal(wrong.code, 3);
    assert.match(wrong.stderr, /'m1' is at plan\. The step for it is \/wf-plan/);
    assert.match(r.wf('status').stdout, /\[plan\] → build → measure → publish/);
});

test('approve wants the document committed and free of open questions', () => {
    const r = repo();
    r.wf('start', 'm1', '--kind', 'decision');
    assert.match(r.wf('approve').stderr, /writeup\.md does not exist/);
    write(r.root, `${entry}/writeup.md`, '> [!TODO]\n> Which OS?\n');
    let result = r.wf('approve');
    assert.match(result.stderr, /uncommitted changes/);
    assert.match(result.stderr, /still has a \[!TODO\]/);
    write(r.root, `${entry}/writeup.md`, 'Raspberry Pi OS.\n');
    r.commit();
    result = r.wf('approve');
    assert.equal(result.code, 0, result.stderr);
    const record = workflow(r.root);
    assert.equal(record.stage, 'publish');
    assert.match(record.approvals.writeup.hash, /^[0-9a-f]{64}$/);
});

test('a plan needs a checklist', () => {
    const r = repo();
    r.wf('start', 'm1', '--kind', 'milestone');
    write(r.root, `${entry}/plan.md`, 'Some prose.\n');
    r.commit();
    assert.match(r.wf('approve').stderr, /no checklist/);
});

test('a milestone cannot pass its measurements without results', () => {
    const r = repo();
    toBuild(r);
    write(r.root, `${entry}/plan.md`, '- [x] Add it.\n- [x] Test it.\n');
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    assert.match(r.wf('status').stdout, /\/wf-measure/);
    assert.match(r.wf('approve').stderr, /measure\.md does not exist/);
    write(r.root, `${entry}/measure.md`, 'It seemed fine.\n');
    r.commit();
    assert.match(r.wf('approve').stderr, /no "## Results" section/);
    write(r.root, `${entry}/measure.md`, results);
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    assert.equal(workflow(r.root).stage, 'publish');
});

test('an approved document is locked until its stage is reopened', () => {
    const r = repo();
    toBuild(r);
    assert.equal(r.wf('check').code, 0);
    write(r.root, `${entry}/plan.md`, '- [ ] Add something else.\n');
    const locked = r.wf('check');
    assert.equal(locked.code, 1);
    assert.match(locked.stderr, /plan\.md changed after it was approved/);

    assert.match(r.wf('reopen', 'plan').stderr, /usage/);
    const reopened = r.wf('reopen', 'plan', '--reason', 'the pin was wrong');
    assert.equal(reopened.code, 0, reopened.stderr);
    const record = workflow(r.root);
    assert.equal(record.stage, 'plan');
    assert.equal(record.approvals.plan.stale, true);
    assert.equal(r.wf('check').code, 0, 'the reopened document may change');
});

test('a document cannot be written before its stage', () => {
    const r = repo();
    r.wf('start', 'm1', '--kind', 'milestone');
    write(r.root, `${entry}/measure.md`, results);
    assert.match(r.wf('check').stderr, /measure\.md was written before its stage/);
});

test('a draft written before a reopening waits, unchanged, for its stage', () => {
    const r = repo();
    toBuild(r);
    write(r.root, `${entry}/plan.md`, '- [x] Add it.\n- [x] Test it.\n');
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    write(r.root, `${entry}/measure.md`, 'A draft.\n');
    r.commit();
    assert.equal(r.wf('reopen', 'plan', '--reason', 'the pin was wrong').code, 0);
    r.commit();
    assert.equal(r.wf('check').code, 0, 'the draft may stay');

    write(r.root, `${entry}/measure.md`, 'A changed draft.\n');
    assert.match(r.wf('check').stderr, /measure\.md changed after 'm1' was reopened/);
});

test('code waits for the build stage', () => {
    const r = repo();
    write(r.root, 'firmware/pico-trigger/main.c', '// code\n');
    assert.match(r.wf('check').stderr, /is code, and no entry is active/);
    r.wf('start', 'm1', '--kind', 'milestone');
    assert.match(r.wf('check').stderr, /is code, which opens at the build stage/);
    write(r.root, `${entry}/plan.md`, '- [ ] Add it.\n- [ ] Test it.\n');
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    assert.equal(r.wf('check').code, 0, 'code is open once the plan is approved');
});

test('code written before a reopening waits, unchanged, for the build stage', () => {
    const r = repo();
    toBuild(r);
    write(r.root, 'system/chrony.conf', '# config\n');
    r.commit();
    assert.equal(r.wf('reopen', 'plan', '--reason', 'the plan cannot be built').code, 0);
    r.commit();
    assert.equal(r.wf('check', '--base', 'main').code, 0, 'the code may stay');
    write(r.root, 'system/chrony.conf', '# changed config\n');
    assert.match(r.wf('check', '--base', 'main').stderr, /is code, which opens at the build stage/);
});

test('the plan is ticked during build, and build needs every box ticked', () => {
    const r = repo();
    toBuild(r);
    write(r.root, `${entry}/plan.md`, '- [x] Add it.\n- [ ] Test it.\n');
    r.commit();
    assert.equal(r.wf('check').code, 0, 'ticking a box is not an edit');
    assert.match(r.wf('approve').stderr, /1 unticked items/);
    write(r.root, `${entry}/plan.md`, '- [x] Add it.\n- [x] Test it, more.\n');
    assert.match(r.wf('check').stderr, /plan\.md changed after it was approved/);
});

test('publish needs the changed pages listed, and finishes the entry', () => {
    const r = repo();
    toPublish(r);

    write(
        r.root,
        'site/content/system/time-base/index.md',
        '---\ntitle: Time\norder: 1\n---\n\nNew.\n',
    );
    r.commit();
    const unlisted = r.wf('approve', '--base', 'main');
    assert.match(unlisted.stderr, /page 'system\/time-base' changed on this branch/);
    assert.match(r.wf('check', '--base', 'main', '--merge').stderr, /still at publish/);

    write(
        r.root,
        'site/content/system/other/index.md',
        '---\ntitle: Other\norder: 2\n---\n\nOld.\n',
    );
    r.commit('other');
    write(
        r.root,
        `${entry}/index.md`,
        '---\ntitle: Time base\npages: [system/time-base, system/gone]\n---\n\nThe clock.\n',
    );
    r.commit();
    assert.match(r.wf('approve', '--base', 'main').stderr, /'system\/gone', which does not exist/);
    write(
        r.root,
        `${entry}/index.md`,
        '---\ntitle: Time base\npages:\n  - system/time-base\n  - system/other\n---\n\nThe clock.\n',
    );
    r.commit();
    const done = r.wf('approve', '--base', 'main');
    assert.equal(done.code, 0, done.stderr);
    assert.equal(workflow(r.root).stage, 'done');
    assert.ok(!fs.existsSync(path.join(r.root, '.workflow/active')));
    r.commit();
    const merge = r.wf('check', '--base', 'main', '--merge');
    assert.equal(merge.code, 0, merge.stderr);
});

test('publish refuses a listed page the branch did not change, and wants some page changed', () => {
    const r = repo();
    r.wf('start', 'charter', '--kind', 'decision');
    write(
        r.root,
        'site/content/archive/charter/index.md',
        '---\ntitle: Charter\npages: []\n---\n\nWhy.\n',
    );
    write(r.root, 'site/content/archive/charter/writeup.md', 'Because.\n');
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    r.commit();
    assert.match(r.wf('approve', '--base', 'main').stderr, /no documentation page changed/);
    write(
        r.root,
        'site/content/archive/charter/index.md',
        '---\ntitle: Charter\npages: [system/time-base]\n---\n\nWhy.\n',
    );
    r.commit();
    assert.match(
        r.wf('approve', '--base', 'main').stderr,
        /lists page 'system\/time-base', which this branch did not change/,
    );
    write(
        r.root,
        'site/content/archive/charter/index.md',
        '---\ntitle: Charter\npages: []\n---\n\nWhy.\n',
    );
    write(r.root, 'site/content/landing.md', 'What the box is.\n');
    r.commit();
    const done = r.wf('approve', '--base', 'main');
    assert.equal(done.code, 0, done.stderr);
});

test('a branch works on one entry', () => {
    const r = repo();
    r.wf('start', 'm1', '--kind', 'milestone');
    write(r.root, 'site/content/archive/other/index.md', 'Other.\n');
    const result = r.wf('check', '--base', 'main');
    assert.match(result.stderr, /changes 2 entries/);
    assert.match(result.stderr, /belongs to entry 'other', but this branch works on 'm1'/);
});

test('abandon sets an entry aside, and resume takes it up where it stopped', () => {
    const r = repo();
    toBuild(r);
    assert.match(r.wf('abandon').stderr, /usage/);
    assert.equal(r.wf('abandon', '--reason', 'not now').code, 0);
    assert.equal(workflow(r.root).stage, 'abandoned');
    assert.ok(!fs.existsSync(path.join(r.root, '.workflow/active')));
    assert.equal(r.wf('check').code, 0, 'abandoned documents stay as approved');
    assert.match(r.wf('start', 'm1', '--kind', 'milestone').stderr, /wf resume/);
    assert.equal(r.wf('resume', 'm1').code, 0);
    assert.equal(workflow(r.root).stage, 'build');
});

test('a decision is written up and published', () => {
    const r = repo();
    write(r.root, 'system/chrony.conf', '# config\n');
    r.wf('start', 'early', '--kind', 'decision');
    assert.match(r.wf('check').stderr, /is code, which a decision does not change/);
    fs.rmSync(path.join(r.root, 'system'), { recursive: true });
    r.wf('abandon', '--reason', 'not this one');
    const result = r.wf('start', 'design', '--kind', 'decision');
    assert.equal(result.code, 0, result.stderr);
    assert.match(result.stdout, /Next: \/wf-writeup/);
    assert.equal(r.wf('path').stdout.trim(), 'site/content/archive/design/writeup.md');
    assert.match(r.wf('path', 'measure').stderr, /has no document/);
});

test('guard refuses edits the stage does not allow', () => {
    const r = repo();
    const guard = (file: string) =>
        run(['guard'], {
            cwd: r.root,
            config: BOX,
            stdin: JSON.stringify({ cwd: r.root, tool_input: { file_path: file } }),
        });
    assert.equal(guard('system/chrony.conf').code, 2);
    assert.equal(guard('site/content/system/time-base/index.md').code, 0);
    assert.equal(guard('/etc/hosts').code, 0, 'outside the repository');
    r.wf('start', 'm1', '--kind', 'milestone');
    assert.equal(guard(`${entry}/plan.md`).code, 0);
    assert.equal(guard(`${entry}/index.md`).code, 0);
    const early = guard(`${entry}/measure.md`);
    assert.equal(early.code, 2);
    assert.match(early.stderr, /ask for `\/wf-reopen measure`/);
    assert.equal(guard(`${entry}/workflow.json`).code, 2);
    assert.equal(guard('.workflow/active').code, 2);
    assert.equal(guard('site/content/system/time-base/index.md').code, 2, 'pages open at publish');
    assert.equal(
        guard('site/content/reference/open-questions/index.md').code,
        0,
        'the ledger is open',
    );
    assert.equal(guard('site/content/math/allan-variance/index.md').code, 0);
    assert.equal(guard(path.join(r.root, 'firmware/pico-trigger/main.c')).code, 2);
    assert.equal(guard('site/src/lib/site.ts').code, 0, 'the site itself is not gated');
    assert.equal(guard('tools/wf/cli.ts').code, 0, 'the workflow tool is not gated');
    assert.equal(guard('tools/timing/capture.py').code, 2);
});

test('frontmatter lists and paths are read as the rules need', () => {
    assert.deepEqual(frontmatterList('---\npages: [a/b, "c/d"]\n---\n', 'pages'), ['a/b', 'c/d']);
    assert.deepEqual(frontmatterList('---\npages:\n  - a/b\n  - c/d\nx: 1\n---\n', 'pages'), [
        'a/b',
        'c/d',
    ]);
    assert.deepEqual(frontmatterList('---\npages: []\n---\n', 'pages'), []);
    assert.equal(frontmatterList('no frontmatter', 'pages'), undefined);
    assert.deepEqual(placeOf('site/content/archive/m1/measure.svx'), {
        area: 'entry',
        slug: 'm1',
        stage: 'measure',
    });
    assert.deepEqual(placeOf('site/content/archive/m1/figures/measure.md'), {
        area: 'entry',
        slug: 'm1',
    });
    assert.deepEqual(placeOf('ros2_ws/src/ubx_driver/package.xml'), { area: 'code' });
    assert.deepEqual(placeOf('tools/allan/fit.py'), { area: 'code' });
    assert.deepEqual(placeOf('tools/wf/lib.ts'), { area: 'free' });
    assert.deepEqual(placeOf('tools/package.json'), { area: 'free' });
    assert.deepEqual(placeOf('site/content/landing.md'), { area: 'pages' });
    assert.deepEqual(placeOf('site/content/reference/open-questions/index.md'), { area: 'free' });
});

test('a probe goes straight to its measurements, writes no code, and closes a ledger row', () => {
    const r = repo();
    const dir = 'site/content/archive/firmware';
    const ledger = 'site/content/reference/open-questions/index.md';
    write(r.root, ledger, '---\ntitle: Open questions\n---\n\n| 1 | Firmware? | OPEN |\n');
    r.commit();
    r.sh('branch', '-f', 'main');
    assert.equal(r.wf('start', 'firmware', '--kind', 'probe', '--title', 'Firmware').code, 0);
    assert.equal(JSON.parse(read(r.root, `${dir}/workflow.json`)).stage, 'measure');
    assert.match(r.wf('status').stdout, /\/wf-measure/);
    const guard = (file: string) =>
        run(['guard'], {
            cwd: r.root,
            config: BOX,
            stdin: JSON.stringify({ cwd: r.root, tool_input: { file_path: file } }),
        });
    assert.equal(guard('host/ubx_mux/main.py').code, 2, 'a probe never opens the code');
    assert.equal(guard(`${dir}/measure.md`).code, 0);
    assert.equal(guard(ledger).code, 0);
    write(r.root, `${dir}/index.md`, '---\ntitle: Firmware\npages: []\n---\n\nWhich firmware.\n');
    write(r.root, `${dir}/measure.md`, '## What I did\n\nPolled it.\n');
    r.commit();
    assert.match(r.wf('approve').stderr, /no "## Results" section/);
    write(r.root, `${dir}/measure.md`, '## What I did\n\nPolled it.\n\n## Results\n\nHPS 1.40.\n');
    r.commit();
    assert.equal(r.wf('approve').code, 0);
    r.commit();
    assert.match(r.wf('approve', '--base', 'main').stderr, /no documentation page changed/);
    write(r.root, ledger, '---\ntitle: Open questions\n---\n\n| 1 | Firmware? | MEASURED |\n');
    write(
        r.root,
        `${dir}/index.md`,
        '---\ntitle: Firmware\npages: [reference/open-questions]\n---\n\nIt is HPS 1.40.\n',
    );
    r.commit();
    const done = r.wf('approve', '--base', 'main');
    assert.equal(done.code, 0, done.stderr);
});

// Takes 'm1' through to done and merges it into main, then opens a decision on a new branch and
// brings it to its publish stage.
const design = 'site/content/archive/design';
function amender(r: ReturnType<typeof repo>) {
    toPublish(r);
    write(
        r.root,
        'site/content/system/time-base/index.md',
        '---\ntitle: Time\norder: 1\n---\n\nNew.\n',
    );
    write(
        r.root,
        `${entry}/index.md`,
        '---\ntitle: Time base\npages: [system/time-base]\n---\n\nThe clock.\n',
    );
    r.commit();
    const done = r.wf('approve', '--base', 'main');
    assert.equal(done.code, 0, done.stderr);
    r.commit();
    r.sh('checkout', '-q', 'main');
    r.sh('merge', '-q', 'work');
    r.sh('checkout', '-qb', 'order');
    r.wf('start', 'design', '--kind', 'decision', '--title', 'A design');
    write(r.root, `${design}/index.md`, '---\ntitle: A design\npages: []\n---\n\nA position.\n');
    write(r.root, `${design}/writeup.md`, 'Argued.\n');
    r.commit();
    return r;
}

const guardOf = (r: ReturnType<typeof repo>) => (file: string) =>
    run(['guard'], {
        cwd: r.root,
        config: BOX,
        stdin: JSON.stringify({ cwd: r.root, tool_input: { file_path: file } }),
    });

test('an entry amends a done entry only at its publish stage', () => {
    const r = amender(repo());
    const guard = guardOf(r);
    const early = guard(`${entry}/measure.md`);
    assert.equal(early.code, 2);
    assert.match(early.stderr, /may amend it only at its publish stage/);
    assert.equal(r.wf('approve').code, 0);
    r.commit();
    assert.equal(guard(`${entry}/measure.md`).code, 0);
    assert.equal(guard(`${entry}/plan.md`).code, 0);
    assert.equal(guard(`${entry}/index.md`).code, 2, 'only its documents');
    assert.equal(guard(`${entry}/photo.png`).code, 2);
    assert.equal(guard(`${entry}/workflow.json`).code, 2);
});

test('an amendment is listed under amends, and recorded when the publish is approved', () => {
    const r = amender(repo());
    r.wf('approve');
    const approved = workflow(r.root).approvals.measure;
    write(
        r.root,
        `${entry}/measure.md`,
        results + '\nSee [#3](../../reference/open-questions/#closed).\n',
    );
    write(
        r.root,
        'site/content/system/time-base/index.md',
        '---\ntitle: Time\norder: 1\n---\n\nNewer.\n',
    );
    write(
        r.root,
        `${design}/index.md`,
        '---\ntitle: A design\npages: [system/time-base]\n---\n\nA position.\n',
    );
    r.commit();

    const unlisted = r.wf('check', '--base', 'main');
    assert.equal(unlisted.code, 1);
    assert.match(unlisted.stderr, /measure\.md changed after it was approved/);
    assert.match(unlisted.stderr, /list it as 'archive\/m1\/measure' under `amends`/);
    assert.match(
        r.wf('approve', '--base', 'main').stderr,
        /list it as 'archive\/m1\/measure' under `amends`/,
    );

    const listing = (amends: string) =>
        write(
            r.root,
            `${design}/index.md`,
            `---\ntitle: A design\npages: [system/time-base]\namends: [${amends}]\n---\n\nA position.\n`,
        );
    listing('archive/m1/measure, archive/m1/plan, archive/m1/index, archive/design/writeup');
    r.commit();
    const wrong = r.wf('approve', '--base', 'main').stderr;
    assert.match(wrong, /amends 'archive\/m1\/plan', which this branch did not change/);
    assert.match(wrong, /'archive\/m1\/index' under `amends`, which names no document/);
    assert.match(wrong, /'archive\/design\/writeup' under `amends`, which names no document/);

    listing('archive/m1/measure');
    r.commit();
    const check = r.wf('check', '--base', 'main');
    assert.equal(check.code, 0, check.stderr);
    const done = r.wf('approve', '--base', 'main');
    assert.equal(done.code, 0, done.stderr);
    assert.match(done.stdout, /Recorded its amendments of 'm1'/);

    const record = workflow(r.root);
    assert.notEqual(record.approvals.measure.hash, approved.hash);
    assert.equal(
        record.approvals.measure.commit,
        approved.commit,
        'where the text before the amendment is',
    );
    const events = record.events.filter((event: { action: string }) => event.action == 'amend');
    assert.deepEqual(
        events.map((event: Record<string, string>) => [event.document, event.stage, event.by]),
        [['archive/m1/measure', 'measure', 'design']],
    );
    r.commit();
    const merge = r.wf('check', '--base', 'main', '--merge');
    assert.equal(merge.code, 0, merge.stderr);

    write(r.root, `${entry}/measure.md`, results + '\nChanged again.\n');
    assert.match(
        r.wf('check', '--base', 'main').stderr,
        /measure\.md changed after it was approved/,
    );
});

test('an entry that is not done is not amended', () => {
    const r = repo();
    toBuild(r);
    r.commit();
    r.sh('checkout', '-q', 'main');
    r.sh('merge', '-q', 'work');
    r.sh('checkout', '-qb', 'order');
    fs.rmSync(path.join(r.root, '.workflow/active'));
    r.wf('start', 'design', '--kind', 'decision');
    write(
        r.root,
        `${design}/index.md`,
        '---\ntitle: A design\npages: []\namends: [archive/m1/plan]\n---\n\nA position.\n',
    );
    write(r.root, `${design}/writeup.md`, 'Argued.\n');
    r.commit();
    r.wf('approve');
    assert.equal(guardOf(r)(`${entry}/plan.md`).code, 2);
    write(r.root, `${entry}/plan.md`, '- [ ] Add it again.\n');
    r.commit();
    assert.match(r.wf('approve', '--base', 'main').stderr, /'m1' is not a done entry/);
    assert.match(
        r.wf('check', '--base', 'main').stderr,
        /belongs to entry 'm1', but this branch works on 'design'/,
    );
});
