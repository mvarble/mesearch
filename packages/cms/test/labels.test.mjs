// Characterization tests for position-dependent numbering.
//
// These were written against the implementation as it stood BEFORE the content
// layer was reorganized, so they describe what the site already does rather
// than what a rewrite happens to produce. Several of the expectations below are
// quirks rather than designs -- they are pinned deliberately, because changing
// any of them silently renumbers published content.
//
//   node --test test/
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildFixture } from './harness.mjs';

const snapshot = buildFixture();

const labelOf = (kind) => (slug) => {
    const row = snapshot[kind].find((r) => r.slug == slug);
    assert.ok(row, `no ${kind} with slug '${slug}'`);
    return row.label;
};
const statementLabel = labelOf('statements');
const equationLabel = labelOf('equations');

test('statements and equations share one counter within a page', () => {
    // Root page of the sequence: equation first, then statement.
    assert.equal(equationLabel('root-eq'), '0.0');
    assert.equal(statementLabel('root-stmt'), '0.1');
});

test('a post numbers from zero with no prefix', () => {
    assert.equal(equationLabel('post-eq'), '0');
    assert.equal(statementLabel('outer'), '1');
});

test('a statement nested inside a statement continues the flat counter', () => {
    // `outer` contains an equation and then `inner`; `plain` follows both.
    assert.equal(equationLabel('outer-eq'), '2');
    assert.equal(statementLabel('inner'), '3');
    assert.equal(statementLabel('plain'), '4');
});

test('sibling pages sharing a label prefix continue one counter', () => {
    // Quirk worth keeping explicit: the sequence root and its first child both
    // carry the prefix '0', so chap-a resumes from where the root left off
    // (0.1) rather than restarting at 0.0.
    assert.equal(statementLabel('a1'), '0.2');
    assert.equal(equationLabel('a-eq'), '0.3');
    assert.equal(statementLabel('a2'), '0.4');
});

test('the counter resets when the label prefix changes', () => {
    assert.equal(statementLabel('p1'), '0.0.0'); // descends into chap-a
    assert.equal(statementLabel('b1'), '1.0'); // moves on to chap-b
});

test('appendix pages are lettered, and their contents follow', () => {
    const appendix = snapshot.sequencePages.find((p) => p.slug == 'appendix');
    assert.equal(appendix.label, 'A');
    assert.equal(appendix.appendix, true);
    assert.equal(statementLabel('ap1'), 'A.0');
});

test('sequence page labels follow tree position', () => {
    const labels = Object.fromEntries(snapshot.sequencePages.map((p) => [p.slug, p.label]));
    assert.deepEqual(labels, {
        'chap-a': '0',
        'page-1': '0.0',
        'page-2': '0.1',
        'chap-b': '1',
        appendix: 'A',
    });
});

test('pathnames nest with the sequence tree', () => {
    assert.deepEqual(
        snapshot.pages.map((p) => p.pathname),
        [
            'posts/fpost',
            'sequences/fseq',
            'sequences/fseq/appendix',
            'sequences/fseq/chap-a',
            'sequences/fseq/chap-a/page-1',
            'sequences/fseq/chap-a/page-2',
            'sequences/fseq/chap-b',
        ],
    );
});

test('statements are attached to the page that imports them', () => {
    const pages = Object.fromEntries(snapshot.statements.map((s) => [s.slug, s.pathname]));
    assert.equal(pages['root-stmt'], 'sequences/fseq');
    assert.equal(pages['p1'], 'sequences/fseq/chap-a/page-1');
    assert.equal(pages['ap1'], 'sequences/fseq/appendix');
    // A nested statement belongs to the page, not to its enclosing statement.
    assert.equal(pages['inner'], 'posts/fpost');
});
