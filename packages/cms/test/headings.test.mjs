// Headings as the content layer actually stores them.
//
// `outline.test.mjs` covers the slug and nesting rules on their own; these
// check that the right documents are walked -- in particular that a statement
// imported into a page does not contribute to that page's outline.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildFixture } from './harness.mjs';

const snapshot = buildFixture();
const headingsIn = (filename) =>
    snapshot.headings
        .filter((h) => h.filename == filename)
        .map(({ depth, title, slug }) => [depth, title, slug]);

test('a post records its own headings in order', () => {
    assert.deepEqual(headingsIn('content/post/index.svx'), [
        [1, 'Setup', 'setup'],
        [1, 'Setup', 'setup-2'],
    ]);
});

test('both heading levels are recorded, with their depth', () => {
    assert.deepEqual(headingsIn('content/seq/chap-a.svx'), [
        [1, 'First section', 'first-section'],
        [2, 'A subsection', 'a-subsection'],
        [2, 'Another subsection', 'another-subsection'],
        [1, 'Second section', 'second-section'],
    ]);
});

test('a page with no headings records none', () => {
    assert.deepEqual(headingsIn('content/seq/index.svx'), []);
});

test('a statement imported into a page contributes nothing to its outline', () => {
    // Its content is numbered as part of the page, but a theorem is not a
    // section, so the sidebar must not grow an entry for it.
    const statements = snapshot.headings.filter((h) => h.filename.includes('/statements/'));
    assert.deepEqual(statements, []);
});

test('a sequence may not nest a third level of pages', async () => {
    // The table of contents spends its third level on the headings within a
    // page, so the page tree stops at chapters and sections.
    const deep = buildFixture('deep');
    assert.deepEqual(deep.pages, []);
    assert.deepEqual(deep.sequencePages, []);
});
