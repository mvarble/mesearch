// The label rules, exercised directly.
//
// `labels.test.mjs` covers the same rules end to end, but it has to build a
// fixture site and read the answers back out of SQLite, so a broken rule shows
// up as a wrong row rather than as a wrong rule. These call the rules on their
// own, which is the whole reason they were pulled out of the walk.
import test from 'node:test';
import assert from 'node:assert/strict';

const { Numbering, labelPages } = await import('../src/model/build.ts');

// The shape `labelPages` cares about, with a name so failures read clearly.
const page = (name, children, appendix = false) => ({ name, appendix, children });
const labelsBySlug = (children) =>
    Object.fromEntries([...labelPages(children)].map(([node, label]) => [node.name, label]));

test('top-level pages count from zero', () => {
    assert.deepEqual(labelsBySlug([page('a'), page('b'), page('c')]), {
        a: '0',
        b: '1',
        c: '2',
    });
});

test('a nested page extends its parent', () => {
    const labels = labelsBySlug([page('a'), page('b', [page('b0'), page('b1', [page('b1x')])])]);
    assert.deepEqual(labels, { a: '0', b: '1', b0: '1.0', b1: '1.1', b1x: '1.1.0' });
});

test('appendices are lettered from where the first one appears', () => {
    const labels = labelsBySlug([
        page('one'),
        page('two'),
        page('app-a', undefined, true),
        page('app-b', undefined, true),
    ]);
    assert.deepEqual(labels, { one: '0', two: '1', 'app-a': 'A', 'app-b': 'B' });
});

test('a page under an appendix extends its letter', () => {
    const labels = labelsBySlug([page('app', [page('inner')], true)]);
    assert.deepEqual(labels, { app: 'A', inner: 'A.0' });
});

test('a sequence that is all appendix starts at A', () => {
    assert.deepEqual(labelsBySlug([page('only', undefined, true)]), { only: 'A' });
});

test('statements and equations share one run of numbers', () => {
    const numbering = new Numbering();
    assert.deepEqual([numbering.next(), numbering.next(), numbering.next()], ['0', '1', '2']);
});

test('an initial prefix is applied to every number', () => {
    const numbering = new Numbering('0');
    assert.deepEqual([numbering.next(), numbering.next()], ['0.0', '0.1']);
});

test('entering a page with a new label restarts the count', () => {
    const numbering = new Numbering('0');
    numbering.next();
    numbering.enter('1');
    assert.equal(numbering.next(), '1.0');
});

test('entering a page with the same label continues the count', () => {
    // The quirk that keeps published numbering stable: an enumerated sequence's
    // root and its first child both carry the label '0', so the child picks up
    // where the root left off instead of restarting.
    const numbering = new Numbering('0');
    assert.equal(numbering.next(), '0.0');
    numbering.enter('0');
    assert.equal(numbering.next(), '0.1');
});

test('a page with no label never restarts the count', () => {
    // Every page of an unenumerated sequence, which is why one run spans it.
    const numbering = new Numbering();
    assert.equal(numbering.next(), '0');
    numbering.enter(undefined);
    numbering.enter(undefined);
    assert.equal(numbering.next(), '1');
});

test('a deeper label is a different prefix, so it restarts', () => {
    const numbering = new Numbering('0');
    numbering.next();
    numbering.enter('0.0');
    assert.equal(numbering.next(), '0.0.0');
});
