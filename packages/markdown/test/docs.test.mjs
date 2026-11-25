// What the documentation sites add: file references numbered from 1 with captions, callouts and
// heading anchors.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { expandFileRefs, resolveFileRef } from '../src/file-ref.ts';
import { quotingHighlighter } from '../src/highlight.ts';
import { remarkCallouts } from '../src/callouts.ts';
import { rehypeHeadingAnchors } from '../src/anchors.ts';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-docs-'));
fs.mkdirSync(path.join(root, 'src'));
fs.mkdirSync(path.join(root, 'site/content/page'), { recursive: true });
fs.writeFileSync(
    path.join(root, 'src/lib.rs'),
    [
        'fn one() {}',
        '    fn two() {}',
        '    fn three() {}',
        '/// Docs, as Markdown.',
        '/// More.',
    ].join('\n'),
);
const doc = path.join(root, 'site/content/page/index.svx');

test('a file reference is numbered from 1, inclusive, and dedented', () => {
    const ref = resolveFileRef('{../../../src/lib.rs:2..3}', doc, root);
    assert.equal(ref.code, 'fn two() {}\nfn three() {}');
    assert.equal(ref.lang, 'rs');
    assert.equal(ref.repoPath, 'src/lib.rs');
    assert.deepEqual([ref.start, ref.end], [2, 3]);
});

test('doc comments are quoted as Markdown', () => {
    const ref = resolveFileRef('{../../../src/lib.rs:4..5}', doc, root);
    assert.equal(ref.code, 'Docs, as Markdown.\nMore.');
    assert.equal(ref.lang, 'markdown');
});

test('a range outside the file fails, naming the document', () => {
    assert.throws(() => resolveFileRef('{../../../src/lib.rs:4..9}', doc, root), /index\.svx/);
});

test('a quoted fence is captioned and linked to the repository', async () => {
    const highlight = quotingHighlighter({ root, repoUrl: 'https://github.com/o/r' });
    const html = await highlight('{../../../src/lib.rs:1..2}', 'rust', null, doc);
    assert.match(
        html,
        /<figure class="code-block"><figcaption><a href="https:\/\/github\.com\/o\/r\/blob\/main\/src\/lib\.rs#L1-L2"/,
    );
    assert.match(html, /lines 1–2/);
    // Coloured by CSS variables, not inline.
    assert.match(html, /--shiki-dark/);
});

test('a plain fence is a figure without a caption', async () => {
    const html = await quotingHighlighter({ root })('let x = 1;', 'ts', null, doc);
    assert.match(html, /^\{@html `<figure class="code-block"><pre/);
});

test('the plain-text endpoints expand references in place', () => {
    const text = expandFileRefs('```rust\n{../../../src/lib.rs:1..1}\n```', doc, root);
    assert.equal(text, 'From `src/lib.rs`, lines 1–1:\n\n```rust\nfn one() {}\n```');
});

test('a callout becomes an aside with a titled first paragraph', () => {
    const tree = {
        type: 'root',
        children: [
            {
                type: 'blockquote',
                children: [
                    {
                        type: 'paragraph',
                        children: [{ type: 'text', value: '[!DECISION] Why\nBody.' }],
                    },
                ],
            },
        ],
    };
    remarkCallouts()(tree);
    const aside = tree.children[0];
    assert.equal(aside.data.hName, 'aside');
    assert.deepEqual(aside.data.hProperties.className, ['callout', 'callout-decision']);
    assert.equal(aside.children[0].children[0].value, 'Design decision: Why');
    assert.equal(aside.children[1].children[0].value, 'Body.');
});

test('headings with an id get a link to themselves', () => {
    const tree = {
        type: 'root',
        children: [
            { type: 'element', tagName: 'h2', properties: { id: 'a' }, children: [] },
            { type: 'element', tagName: 'h4', properties: { id: 'b' }, children: [] },
        ],
    };
    rehypeHeadingAnchors()(tree);
    assert.equal(tree.children[0].children[0].properties.href, '#a');
    assert.equal(tree.children[1].children.length, 0);
});
