// Fenced imports: a fence whose whole body is `{./file}` or `{./file:a..b}` is
// replaced by that file's lines, highlighted as the file's extension suggests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { highlight } from '../src/highlight.ts';

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-highlight-'));
fs.writeFileSync(path.join(dir, 'lines.rs'), ['zero', 'one', 'two', 'three', 'four'].join('\n'));
const doc = path.join(dir, 'doc.svx');

// The highlighted HTML, with Shiki's markup stripped down to the text.
const textOf = (svelte) =>
    svelte
        .replace(/<[^>]+>/g, '')
        .replace(/^\{@html `|` \}$/g, '')
        .trim();

test('a whole file is inlined and highlighted by its extension', async () => {
    const html = await highlight('{./lines.rs}', null, null, doc);
    assert.match(html, /^\{@html `<pre class="shiki/);
    assert.match(textOf(html), /zero[\s\S]*four/);
});

test('start..end is inclusive and zero-based', async () => {
    const text = textOf(await highlight('{./lines.rs:1..2}', null, null, doc));
    assert.match(text, /one/);
    assert.match(text, /two/);
    assert.doesNotMatch(text, /zero|three/);
});

test('open-ended ranges', async () => {
    assert.doesNotMatch(textOf(await highlight('{./lines.rs:3..}', null, null, doc)), /two/);
    assert.doesNotMatch(textOf(await highlight('{./lines.rs:..1}', null, null, doc)), /two/);
});

test('a malformed range is an error', async () => {
    await assert.rejects(highlight('{./lines.rs:a..b}', null, null, doc), /not a range/);
});

test('an unknown language falls back to plain text rather than failing', async () => {
    const html = await highlight('plain', 'not-a-language', null, doc);
    assert.match(textOf(html), /plain/);
});
