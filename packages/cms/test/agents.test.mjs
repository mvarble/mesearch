// The files a package hands an agent-written project: skills and the documents they point at.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import {
    installFolders,
    installSkills,
    markup,
    outdatedFolders,
    outdatedSkills,
} from '../src/agents.ts';

const project = () => fs.mkdtempSync(path.join(os.tmpdir(), 'cms-agents-'));
const read = (dir, name) => fs.readFileSync(path.join(dir, name), 'utf8');
const skill = (body) =>
    new Map([
        [
            'explain',
            new Map([
                ['SKILL.md', body],
                ['markup.md', 'conventions'],
            ]),
        ],
    ]);

test('a fresh install writes each skill and links it for Claude Code', () => {
    const dir = project();
    const report = installSkills(dir, skill('v1'));
    assert.equal(read(dir, '.agents/skills/explain/SKILL.md'), 'v1');
    assert.equal(read(dir, '.claude/skills/explain/SKILL.md'), 'v1');
    assert.ok(fs.lstatSync(path.join(dir, '.claude/skills/explain')).isSymbolicLink());
    assert.deepEqual(report.written.toSorted(), [
        '.agents/skills/explain/SKILL.md',
        '.agents/skills/explain/markup.md',
        '.claude/skills/explain',
    ]);
});

test('a skill that differs is replaced whole, and one of the project’s own is left alone', () => {
    const dir = project();
    installSkills(dir, skill('v1'));
    fs.writeFileSync(path.join(dir, '.agents/skills/explain/dropped.md'), 'old');
    fs.mkdirSync(path.join(dir, '.agents/skills/mine'));
    fs.writeFileSync(path.join(dir, '.agents/skills/mine/SKILL.md'), 'mine');
    assert.deepEqual(outdatedSkills(dir, skill('v2')), ['.agents/skills/explain']);

    const report = installSkills(dir, skill('v2'));
    assert.deepEqual(report.updated, ['.agents/skills/explain/']);
    assert.equal(read(dir, '.agents/skills/explain/SKILL.md'), 'v2');
    assert.ok(!fs.existsSync(path.join(dir, '.agents/skills/explain/dropped.md')));
    assert.equal(read(dir, '.agents/skills/mine/SKILL.md'), 'mine');
    assert.deepEqual(outdatedSkills(dir, skill('v2')), []);
});

test('a checkout that converts line endings has changed nothing', () => {
    const dir = project();
    installSkills(dir, skill('one\ntwo\n'));
    fs.writeFileSync(path.join(dir, '.agents/skills/explain/SKILL.md'), 'one\r\ntwo\r\n');
    assert.deepEqual(outdatedSkills(dir, skill('one\ntwo\n')), []);
    const report = installSkills(dir, skill('one\ntwo\n'));
    assert.deepEqual(report.updated, []);
});

test('a project without a skill is not out of date', () => {
    assert.deepEqual(outdatedSkills(project(), skill('v1')), []);
});

test('a copy made where a link could not be follows the skill, and an edited one is kept', () => {
    const dir = project();
    installSkills(dir, skill('v1'));
    const linked = path.join(dir, '.claude/skills/explain');
    fs.unlinkSync(linked);
    fs.cpSync(path.join(dir, '.agents/skills/explain'), linked, { recursive: true });

    let report = installSkills(dir, skill('v2'));
    assert.equal(read(dir, '.claude/skills/explain/SKILL.md'), 'v2');
    assert.ok(report.updated.includes('.claude/skills/explain/'));

    fs.writeFileSync(path.join(linked, 'SKILL.md'), 'edited');
    report = installSkills(dir, skill('v3'));
    assert.equal(read(dir, '.claude/skills/explain/SKILL.md'), 'edited');
    assert.deepEqual(report.kept, ['.claude/skills/explain']);
});

test('a linked skills directory that is itself a link is left as it is', () => {
    const dir = project();
    fs.mkdirSync(path.join(dir, '.agents/skills'), { recursive: true });
    fs.mkdirSync(path.join(dir, '.claude'));
    fs.symlinkSync('../.agents/skills', path.join(dir, '.claude/skills'), 'dir');

    const report = installSkills(dir, skill('v1'));
    assert.ok(fs.lstatSync(path.join(dir, '.claude/skills')).isSymbolicLink());
    assert.equal(read(dir, '.claude/skills/explain/SKILL.md'), 'v1');
    assert.ok(!report.written.includes('.claude/skills/explain'));
});

test('any folder can be managed the same way', () => {
    const dir = project();
    const docs = new Map([['.agents/reference/mesearch', new Map([['workflow.md', 'v1']])]]);
    installFolders(dir, docs);
    assert.equal(read(dir, '.agents/reference/mesearch/workflow.md'), 'v1');
    const next = new Map([['.agents/reference/mesearch', new Map([['workflow.md', 'v2']])]]);
    assert.deepEqual(outdatedFolders(dir, next), ['.agents/reference/mesearch']);
});

test('the markup conventions ship with the package', () => {
    const text = markup();
    for (const section of [
        'Mathematics',
        'Numbered equations',
        'Statements and proofs',
        'Citations',
    ]) {
        assert.match(text, new RegExp(`^## ${section}$`, 'm'));
    }
});
