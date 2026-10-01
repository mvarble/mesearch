// Statement and equation slugs are unique within a post or sequence, not
// across the whole site, so unrelated writing can reuse a short memorable name.
//
// The fixture has two posts (`pa`, `pb`) that each define a statement and an
// equation called `shared` / `shared-eq`, and a third (`pc`) that defines
// neither but references them anyway.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildFixture } from './harness.mjs';

const snapshot = buildFixture('scopes');

const resolve = (sourceSlug, ref) =>
    snapshot.statementRefs.find((r) => r.source.includes(`post-${sourceSlug}/`) && r.ref == ref);
const resolveEquation = (sourceSlug, ref) =>
    snapshot.equationRefs.find((r) => r.source.includes(`post-${sourceSlug}/`) && r.ref == ref);

test('the same slug in two posts resolves to a different statement in each', () => {
    const fromA = resolve('a', 'shared');
    const fromB = resolve('b', 'shared');
    assert.ok(fromA && fromB);
    assert.equal(fromA.kind, 'theorem');
    assert.equal(fromB.kind, 'lemma');
    assert.notEqual(fromA.targetScope, fromB.targetScope);
});

test('a bare slug never escapes its own scope', () => {
    // `pc` defines nothing, and both `pa` and `pb` define `shared`. Under a
    // site-wide search this would either resolve arbitrarily or be ambiguous;
    // resolution is deliberately local, so it simply does not resolve.
    assert.equal(resolve('c', 'shared'), undefined);
});

test('scope-slug/slug reaches into another post', () => {
    const cross = resolve('b', 'pa/shared');
    assert.ok(cross, "'pa/shared' should resolve from post-b");
    assert.equal(cross.kind, 'theorem');
    assert.match(cross.targetScope, /post-a/);
});

test('an unknown scope slug does not resolve', () => {
    assert.equal(resolve('c', 'nope/shared'), undefined);
});

test('equations are scoped the same way', () => {
    assert.ok(resolveEquation('a', 'shared-eq'));
    assert.ok(resolveEquation('b', 'shared-eq'));
    assert.ok(resolveEquation('b', 'pa/shared-eq'), "'pa/shared-eq' should resolve from post-b");
});

test('a local and a cross-scope reference can coexist in one document', () => {
    // Both are recorded against post-b, keyed by how they were written -- which
    // is why references are stored by their written form rather than by slug.
    const local = resolve('b', 'shared');
    const cross = resolve('b', 'pa/shared');
    assert.equal(local.slug, 'shared');
    assert.equal(cross.slug, 'shared');
    assert.notEqual(local.kind, cross.kind);
});
