// The pieces around the store: facts that tell the dev server what to
// invalidate, the snapshot the virtual module inlines, and the remark plugin
// that rewrites references from what the store resolved.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { uneval } from 'devalue';

import { buildStore } from '../src/core/build.ts';
import { allFacts, diffFacts } from '../src/core/facts.ts';
import { createCms } from '../src/cms.ts';
import { blogPreset } from '../src/presets/blog/index.ts';
import { bind } from '../src/presets/blog/runtime.ts';
import { fixtureRoot } from './harness.mjs';

test('a description folds its owner macros and resolves its links', () => {
    const store = buildStore({
        root: fixtureRoot('descriptions'),
        preset: blogPreset(),
        macros: { '\\site': 'S' },
    });
    const id = 'src/content/post/description.svx';
    assert.deepEqual(store.foldedMacros(id), { '\\site': 'S', '\\owner': 'O', '\\own': 'D' });
    assert.equal(store.refsOf(id).length, 1);
    assert.equal(store.pathnameOf(id), 'posts/dpost');
});

test('inserting a statement changes the facts of every later document in the scope', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'cms-facts-'));
    fs.cpSync(fixtureRoot('content'), tmp, { recursive: true });
    const before = allFacts(buildStore({ root: tmp, preset: blogPreset() }));

    // A new statement at the very top of the sequence root shifts every label
    // after it --- including those defined in other files.
    const root = path.join(tmp, 'src/content/seq/index.svx');
    fs.writeFileSync(
        path.join(tmp, 'src/content/seq/statements/first.svx'),
        '---\ntype: statement\nkind: lemma\n---\n\nFirst.\n',
    );
    fs.writeFileSync(
        root,
        fs
            .readFileSync(root, 'utf8')
            .replace(
                'import * as rootStmt',
                "import * as first from './statements/first.svx';\n  import * as rootStmt",
            )
            .replace(
                'Root text with an equation.',
                '<Statement {...first} />\n\nRoot text with an equation.',
            ),
    );
    const after = allFacts(buildStore({ root: tmp, preset: blogPreset() }));
    const changed = diffFacts(before, after);
    assert.ok(changed.includes('src/content/seq/statements/first.svx'));
    assert.ok(
        changed.includes('src/content/seq/statements/a1.svx'),
        'a later statement is relabelled',
    );
    assert.ok(
        !changed.includes('src/content/post/statements/plain.svx'),
        'another scope is untouched',
    );
    fs.rmSync(tmp, { recursive: true, force: true });
});

test('the snapshot survives the trip through the virtual module', () => {
    const preset = blogPreset();
    const snapshot = preset.snapshot(buildStore({ root: fixtureRoot('content'), preset }));
    const roundTrip = new Function(`return ${uneval(snapshot)}`)();
    assert.deepEqual(roundTrip, snapshot);
    const cms = bind(roundTrip);
    assert.ok(cms.posts.get('posts/fpost').created instanceof Date);
    assert.deepEqual(
        cms.sequences.get('fseq').children.map((child) => child.slug),
        ['chap-a', 'chap-b', 'appendix'],
        'children keep the order the sequence declares',
    );
    assert.equal(cms.pages.get('sequences/fseq/chap-a').filename, 'src/content/seq/chap-a.svx');
    assert.deepEqual(
        cms
            .outline('src/content/seq/chap-a.svx')
            .map((entry) => [entry.slug, entry.children.length]),
        [
            ['first-section', 2],
            ['second-section', 0],
        ],
    );
});

test('the remark plugin rewrites references and anchors headings', () => {
    const root = fixtureRoot('content');
    const cms = createCms({ root, preset: blogPreset() });
    const link = (url, value) => ({ type: 'link', url, children: [{ type: 'text', value }] });
    const tree = {
        type: 'root',
        children: [
            { type: 'heading', depth: 1, children: [{ type: 'text', value: 'Setup' }] },
            { type: 'heading', depth: 1, children: [{ type: 'text', value: 'Setup' }] },
            {
                type: 'paragraph',
                children: [link('statement:plain', '%full'), link('eq:post-eq', 'x')],
            },
            {
                type: 'math',
                value: 'u = v @tag(post-eq)',
                data: {
                    hChildren: [{ type: 'text', value: 'u = v @tag(post-eq)' }],
                    hProperties: {},
                },
            },
        ],
    };
    cms.remark()(tree, { filename: path.join(root, 'src/content/post/index.svx') });
    const [h1, h2, paragraph, math] = tree.children;
    assert.equal(h1.data.hProperties.id, 'setup');
    assert.equal(h2.data.hProperties.id, 'setup-2');
    const [statement, equation] = paragraph.children;
    assert.equal(statement.url, '/posts/fpost#plain');
    assert.equal(statement.children[0].value, 'Corollary 4');
    assert.equal(equation.url, '/posts/fpost#eq:post-eq');
    assert.equal(equation.children[0].value, '(0)');
    assert.equal(math.value, 'u = v \\tag{0}');
    assert.equal(math.data.hChildren[0].value, 'u = v \\tag{0}');
    assert.equal(math.data.hProperties.id, 'eq:post-eq');
});

test('macrosFor folds a known document and falls back to frontmatter otherwise', () => {
    const root = fixtureRoot('descriptions');
    const cms = createCms({ root, preset: blogPreset(), macros: { '\\site': 'S' } });
    assert.deepEqual(cms.macrosFor({ filename: path.join(root, 'src/content/post/index.svx') }), {
        '\\site': 'S',
        '\\owner': 'O',
    });
    assert.deepEqual(
        cms.macrosFor({
            filename: path.join(root, 'elsewhere.svx'),
            data: { fm: { katex_macros: { '\\x': 'X' } } },
        }),
        { '\\site': 'S', '\\x': 'X' },
    );
});
