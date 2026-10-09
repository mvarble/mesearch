// The skoro layout: pages in tracks, math notes, and an archive of entries with
// their documents and workflow records, linked to the pages they changed.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildStore } from '../src/core/build.ts';
import { createCms } from '../src/cms.ts';
import { skoroPreset } from '../src/presets/skoro/index.ts';
import { bind } from '../src/presets/skoro/runtime.ts';
import { fixtureRoot } from './harness.mjs';

const root = fixtureRoot('skoro');
const dates = () => undefined;
const preset = skoroPreset({ tracks: ['guide', 'concepts'], base: '/skoro', dates });
const store = buildStore({ root, preset });
const cms = bind(preset.snapshot(store));
const messages = store.diagnostics.map((d) => d.message);

test('pages are found by track and ordered within it', () => {
    assert.deepEqual(
        cms.pages.list().map((page) => page.key),
        ['guide/first-model', 'guide/estimation', 'concepts/graph'],
    );
    assert.deepEqual(
        cms.pages.list('concepts').map((page) => page.key),
        ['concepts/graph'],
    );
    const { prev, next } = cms.pages.neighbours('guide/estimation');
    assert.equal(prev.key, 'guide/first-model');
    assert.equal(next, undefined);
    assert.equal(cms.get('other/ignored'), undefined, 'a folder that is not a track is ignored');
    assert.equal(cms.landing(), 'content/landing.md');
});

test('a summary is the frontmatter’s, or else the first paragraph', () => {
    assert.equal(cms.get('guide/first-model').summary, 'Build a model and evaluate its density.');
    assert.equal(cms.get('guide/estimation').summary, 'Maximize the density, as in (1).');
    assert.equal(
        cms.get('math/tangent-space').summary,
        'The tangent space at $x$ is a vector space.',
    );
});

test('math notes resolve bare slugs in depends_on', () => {
    assert.deepEqual(cms.get('math/retraction').dependsOn, ['math/tangent-space']);
    assert.deepEqual(cms.get('archive/normal/math').dependsOn, [
        'math/retraction',
        'math/tangent-space',
    ]);
    assert.deepEqual(
        cms.dependents('math/tangent-space').map((record) => record.key),
        ['math/retraction', 'archive/normal/math'],
    );
});

test('an entry carries its workflow record, its documents in order, and its pages', () => {
    const normal = cms.archive.get('archive/normal');
    assert.equal(normal.status, 'done');
    assert.equal(normal.workflow.kind, 'feature');
    assert.equal(normal.workflow.finished, '2026-02-20');
    assert.deepEqual(normal.documents, [
        'archive/normal/math',
        'archive/normal/implementation',
        'archive/normal/plan',
    ]);
    assert.deepEqual(normal.pages, ['guide/first-model', 'concepts/graph']);
    assert.equal(cms.get('archive/normal/notes'), undefined, 'only named documents count');
    assert.equal(cms.archive.get('archive/normal-v2').status, 'active');
});

test('an entry document is titled by its name unless it says otherwise', () => {
    assert.equal(cms.get('archive/normal/math').title, 'Mathematics');
    assert.equal(cms.get('archive/normal/implementation').title, 'Implementing the Normal');
    assert.equal(cms.get('archive/normal/math').entry, 'archive/normal');
    assert.equal(
        store.pages.get('archive/normal/math').formats.full,
        'The Normal distribution: Mathematics',
    );
});

test('pages show the entries that changed them, newest first', () => {
    assert.deepEqual(cms.get('concepts/graph').entries, ['archive/normal-v2', 'archive/normal']);
    assert.deepEqual(cms.get('guide/first-model').entries, ['archive/normal']);
    assert.deepEqual(cms.get('archive/normal').revisedBy, ['archive/normal-v2']);
    assert.deepEqual(cms.get('archive/normal-v2').revises, ['archive/normal']);
    assert.deepEqual(
        cms.archive.list().map((entry) => entry.key),
        ['archive/normal-v2', 'archive/normal', 'archive/broken'],
    );
});

test('what does not resolve is reported', () => {
    const has = (text) => messages.some((m) => m.includes(text));
    assert.ok(has("`pages` entry 'guide/nowhere' names no page"));
    assert.ok(has("`revises` entry 'nothing' names no entry"));
    assert.ok(has('content/archive/broken/workflow.json: an entry needs a `workflow.json`'));
    assert.ok(has("content/concepts/graph/index.md: only an entry's `index` lists `pages`"));
    assert.equal(cms.archive.get('archive/broken').status, 'active');
});

test('equations and statements are numbered per document, and links resolve', () => {
    const anchors = [...store.anchors.values()].filter((a) => a.page == 'archive/normal/math');
    assert.deepEqual(
        anchors.map((a) => [a.kind, a.slug, a.label]),
        [
            ['equation', 'residual', '1'],
            ['statement', 'whitening', '2'],
        ],
    );
    const refs = store.refsOf('content/archive/normal/math.svx');
    const page = refs.find((ref) => ref.resolver == 'page');
    assert.equal(page.target.url, '/skoro/archive/normal/plan/');
    const estimation = store.refsOf('content/guide/estimation/index.md');
    const link = estimation.find((ref) => ref.resolver == 'page');
    assert.equal(link.target.url, '/skoro/math/retraction/');
    assert.equal(link.target.formats.title, 'Retractions');
    assert.deepEqual(
        cms.bibliography('archive/normal/math').map((c) => c.key),
        ['folland1999'],
    );
    const landing = store.refsOf('content/landing.md').find((ref) => ref.resolver == 'page');
    assert.equal(landing.target.url, '/skoro/guide/first-model/');
});

test('links to a section’s own page resolve, with its title', () => {
    const refs = store.refsOf('content/guide/first-model/index.md');
    const sections = refs.filter((ref) => ref.resolver == 'section');
    assert.deepEqual(
        sections.map((ref) => [ref.target.url, ref.target.formats.title]),
        [
            ['/skoro/concepts/', 'Concepts'],
            ['/skoro/math/', 'Mathematics'],
        ],
    );
    assert.ok(!messages.some((m) => m.includes("'concepts' does not resolve")));
});

test('the graph joins math notes and entry documents', () => {
    const { nodes, edges } = cms.graph();
    assert.deepEqual(nodes.toSorted(), [
        'archive/normal-v2/math',
        'archive/normal/implementation',
        'archive/normal/math',
        'archive/normal/plan',
        'math/retraction',
        'math/tangent-space',
    ]);
    const between = (a, b) =>
        edges.filter((e) => (e.from == a && e.to == b) || (e.from == b && e.to == a));
    assert.deepEqual(
        between('math/tangent-space', 'math/retraction').map((e) => e.style),
        ['solid'],
    );
    assert.deepEqual(
        between('archive/normal/math', 'archive/normal/plan').map((e) => e.style),
        ['dashed'],
    );
});

test('a track may not shadow the math notes or the archive', () => {
    assert.throws(() => skoroPreset({ tracks: ['archive'] }), /cannot be a track/);
    assert.throws(() => skoroPreset({ tracks: ['x'], documents: { index: 'Index' } }));
});

test('the workflow record is watched as content', () => {
    const cms = createCms({ preset, root });
    assert.ok(preset.include('content/archive/normal/workflow.json'));
    assert.ok(!preset.include('content/archive/normal/data.json'));
    assert.equal(cms.store.docs.has('content/archive/normal/workflow.json'), false);
});
