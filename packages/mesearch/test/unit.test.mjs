// The CLI's pieces that need no build: config validation, `mesearch init`,
// the generated stylesheet, and the heading shift.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { validate } from '../src/config.ts';
import { initProject, tokensFile, userStylesheet } from '../src/init.ts';
import { rehypeDemoteHeadings } from '../src/headings.ts';

test('a config is filled in with defaults', () => {
    const config = validate({}, undefined, 'notes');
    assert.equal(config.title, 'notes');
    assert.equal(config.base, '');
    assert.equal(config.lang, 'en');
    assert.deepEqual(config.katexMacros, {});
    assert.equal(typeof config.graph.charge, 'number');
});

test('every problem with a config is reported at once', () => {
    assert.throws(
        () =>
            validate(
                { title: 3, base: 'notes/', katexMacros: { '\\x': 1 }, graph: { charge: 'lots' } },
                'mesearch.config.ts',
                'x',
            ),
        (error) =>
            ['`title`', '`base`', '`katexMacros`', '`graph.charge`'].every((field) =>
                error.message.includes(field),
            ),
    );
});

test("a base of '/' is the root", () => {
    assert.equal(validate({ base: '/' }, undefined, 'x').base, '');
    assert.equal(validate({ base: '/notes' }, undefined, 'x').base, '/notes');
});

test('init scaffolds a project and never overwrites without --force', () => {
    const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'mesearch-init-')), 'my-notes');
    const log = console.log;
    console.log = () => {};
    try {
        initProject(dir);
        for (const file of [
            'AGENTS.md',
            'mesearch.config.ts',
            'mesearch.css',
            'tsconfig.json',
            'prettier.config.js',
            'eslint.config.js',
            'content/description.md',
            'content/concepts/example-concept/index.md',
            'content/concepts/example-concept/description.md',
            'content/writeups/example-writeup/index.md',
            'content/sequences/.gitkeep',
        ]) {
            assert.ok(fs.existsSync(path.join(dir, file)), `${file} is written`);
        }
        assert.match(
            fs.readFileSync(path.join(dir, 'mesearch.config.ts'), 'utf8'),
            /title: 'My notes'/,
        );
        const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
        assert.equal(manifest.scripts.dev, 'mesearch dev');
        assert.ok(manifest.dependencies['@mvarble/mesearch']);
        assert.match(fs.readFileSync(path.join(dir, '.gitignore'), 'utf8'), /\.mesearch\//);
        assert.match(
            fs.readFileSync(path.join(dir, 'prettier.config.js'), 'utf8'),
            /trailingComma: 'all'/,
        );

        fs.writeFileSync(path.join(dir, 'AGENTS.md'), 'mine');
        manifest.scripts.dev = 'custom';
        fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify(manifest));
        initProject(dir);
        assert.equal(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'mine');
        assert.equal(
            JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).scripts.dev,
            'custom',
        );
        initProject(dir, { force: true });
        assert.notEqual(fs.readFileSync(path.join(dir, 'AGENTS.md'), 'utf8'), 'mine');
    } finally {
        console.log = log;
    }
});

test('the stylesheet lists every variable, commented out', () => {
    const css = userStylesheet();
    const tokens = fs.readFileSync(tokensFile(), 'utf8');
    const names = [...tokens.matchAll(/^\s*(--[\w-]+)\s*:/gm)].map((match) => match[1]);
    assert.ok(names.length > 30);
    for (const name of new Set(names)) assert.ok(css.includes(`/* ${name}:`), `${name} is listed`);
    // Nothing is in effect until it is uncommented.
    const live = css.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(live, /--[\w-]+\s*:/);
    assert.match(live, /:root\[data-theme='dark'\]/);
});

test('document headings move one level down', () => {
    const h = (tagName) => ({ type: 'element', tagName, properties: {}, children: [] });
    const tree = {
        type: 'root',
        children: [h('h1'), h('h3'), h('h6'), { ...h('blockquote'), children: [h('h2')] }],
    };
    rehypeDemoteHeadings()(tree);
    assert.deepEqual(
        [...tree.children.slice(0, 3).map((n) => n.tagName), tree.children[3].children[0].tagName],
        ['h2', 'h4', 'h6', 'h3'],
    );
});
