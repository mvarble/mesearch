// The documentation layout: pages in tracks, math notes, and an archive of entries with
// their documents and workflow records, linked to the pages they changed.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import { buildStore, createCms, type ResolvedRef } from '@mvarble/mesearch-cms';

import { docsPreset } from '../../src/site/preset/index.ts';
import { bind } from '../../src/site/preset/runtime.ts';
import type { GraphEdge, SiteDocument, SiteSnapshot } from '../../src/site/preset/types.ts';

// A document of every kind, and a few that are wrong on purpose.
const root = fileURLToPath(new URL('./fixture', import.meta.url));
const dates = () => undefined;
const preset = docsPreset({
    tracks: ['guide', 'concepts'],
    parts: ['geometry', 'probability'],
    base: '/skoro',
    dates,
});
const store = buildStore({ root, preset });
const cms = bind(preset.snapshot(store) as SiteSnapshot);
const messages = store.diagnostics.map((d) => d.message);

// A document that has to exist, as the kind it has to be.
function doc<K extends SiteDocument['kind'] = SiteDocument['kind']>(key: string, kind?: K) {
    const record = cms.get(key);
    assert.ok(record, `${key} exists`);
    if (kind) assert.equal(record.kind, kind);
    return record as Extract<SiteDocument, { kind: K }>;
}

// Where a reference that has to exist points.
function target(ref: ResolvedRef | undefined) {
    assert.ok(ref, 'the reference resolves');
    return ref.target as { url: string; formats: Record<string, string> };
}

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
    assert.equal(prev?.key, 'guide/first-model');
    assert.equal(next, undefined);
    assert.equal(cms.get('other/ignored'), undefined, 'a folder that is not a track is ignored');
    assert.equal(cms.landing(), 'content/landing.md');
});

test('math notes are read part by part, in the order each gives', () => {
    // "Measures" comes first by title, but stands in the second part; a note with no part of
    // the mathematics comes last.
    assert.deepEqual(
        cms.math.list().map((note) => note.key),
        [
            'math/misplaced',
            'math/tangent-space',
            'math/retraction',
            'math/measure',
            'math/partless',
        ],
    );
    assert.deepEqual(cms.math.parts(), ['geometry', 'probability']);
    assert.deepEqual(
        cms.math.list('probability').map((note) => note.key),
        ['math/measure'],
    );
    assert.equal(cms.math.position('math/measure'), 4);
    // The order runs across the parts.
    const { prev, next } = cms.math.neighbours('math/retraction');
    assert.equal(prev?.key, 'math/tangent-space');
    assert.equal(next?.key, 'math/measure');
    assert.deepEqual(cms.math.neighbours('math/nowhere'), {});
});

test('a note rests only on the notes before it', () => {
    const has = (text: string) => messages.some((m) => m.includes(text));
    const misplaced = 'content/math/misplaced/index.md: ';
    assert.ok(
        has(
            misplaced +
                "`depends_on` names 'math/measure', which stands at probability 1, not before geometry 1",
        ),
    );
    assert.ok(has(misplaced + "`depends_on` names 'archive/normal/math', which is no math note"));
    assert.ok(has("'math/misplaced' is at geometry 1 too; two notes cannot stand at one place"));
    assert.ok(has('content/math/partless/index.md'), 'a part that is not one, and no order');
    // A note of a later part may rest on one of an earlier part.
    assert.ok(!has('content/math/measure/index.md'));
    assert.ok(!has('content/math/retraction/index.md'));
});

test('a page rests only on the pages before it in its track', () => {
    const has = (text: string) => messages.some((m) => m.includes(text));
    assert.ok(
        has(
            "content/guide/first-model/index.md: `depends_on` names 'guide/estimation', which does not come before it in its track",
        ),
    );
});

test('an entry lists what it amends, and what it amended says so', () => {
    const has = (text: string) => messages.some((m) => m.includes(text));
    assert.deepEqual(doc('archive/normal-v2', 'entry').amends, [
        'archive/normal/math',
        'archive/normal/statements/whitening',
    ]);
    assert.deepEqual(doc('archive/normal', 'entry').amendedBy, ['archive/normal-v2']);
    assert.deepEqual(doc('archive/normal/math', 'entry-document').amendedBy, ['archive/normal-v2']);
    assert.deepEqual(doc('archive/normal/plan', 'entry-document').amendedBy, []);
    assert.ok(
        has(
            "`amends` entry 'archive/normal/notes' names no document or statement of another entry",
        ),
    );
});

test('a summary is the frontmatter’s, or else the first paragraph', () => {
    assert.equal(doc('guide/first-model').summary, 'Build a model and evaluate its density.');
    assert.equal(doc('guide/estimation').summary, 'Maximize the density, as in (1).');
    assert.equal(doc('math/tangent-space').summary, 'The tangent space at $x$ is a vector space.');
});

test('math notes resolve bare slugs in depends_on', () => {
    assert.deepEqual(doc('math/retraction').dependsOn, ['math/tangent-space']);
    assert.deepEqual(doc('archive/normal/math').dependsOn, [
        'math/retraction',
        'math/tangent-space',
    ]);
    assert.deepEqual(
        cms.dependents('math/tangent-space').map((record) => record.key),
        ['math/retraction', 'archive/normal/math'],
    );
    // A dependency a note may not have is reported, and kept for the map all the same.
    assert.deepEqual(doc('math/misplaced').dependsOn, ['math/measure', 'archive/normal/math']);
});

test('an entry carries its workflow record, its documents in order, and its pages', () => {
    const normal = doc('archive/normal', 'entry');
    assert.equal(normal.status, 'done');
    assert.equal(normal.workflow?.kind, 'feature');
    assert.equal(normal.workflow?.finished, '2026-02-20');
    assert.deepEqual(normal.documents, [
        'archive/normal/math',
        'archive/normal/implementation',
        'archive/normal/plan',
    ]);
    assert.deepEqual(normal.pages, ['guide/first-model', 'concepts/graph']);
    assert.equal(cms.get('archive/normal/notes'), undefined, 'only named documents count');
    assert.equal(doc('archive/normal-v2', 'entry').status, 'active');
});

test('an entry document is titled by its name unless it says otherwise', () => {
    assert.equal(doc('archive/normal/math').title, 'Mathematics');
    assert.equal(doc('archive/normal/implementation').title, 'Implementing the Normal');
    // Its first heading names a section of it, not the document.
    assert.equal(doc('archive/normal/plan').title, 'Plan');
    assert.equal(doc('archive/normal/math', 'entry-document').entry, 'archive/normal');
    assert.equal(
        store.pages.get('archive/normal/math')?.formats.full,
        'The Normal distribution: Mathematics',
    );
});

test('pages show the entries that changed them, newest first', () => {
    assert.deepEqual(doc('concepts/graph', 'page').entries, [
        'archive/normal-v2',
        'archive/normal',
    ]);
    assert.deepEqual(doc('guide/first-model', 'page').entries, ['archive/normal']);
    assert.deepEqual(doc('archive/normal', 'entry').revisedBy, ['archive/normal-v2']);
    assert.deepEqual(doc('archive/normal-v2', 'entry').revises, ['archive/normal']);
    assert.deepEqual(
        cms.archive.list().map((entry) => entry.key),
        ['archive/normal-v2', 'archive/normal', 'archive/broken'],
    );
});

test('a page that moved answers to the keys it had', () => {
    assert.deepEqual(doc('archive/normal-v2', 'entry').pages, [
        'concepts/graph',
        'guide/estimation',
    ]);
    assert.deepEqual(doc('guide/estimation', 'page').entries, ['archive/normal-v2']);
    assert.ok(!messages.some((m) => m.includes("'guide/estimating'")));
});

test('what does not resolve is reported', () => {
    const has = (text: string) => messages.some((m) => m.includes(text));
    assert.ok(has("`pages` entry 'guide/nowhere' names no page"));
    assert.ok(has("`revises` entry 'nothing' names no entry"));
    assert.ok(has('content/archive/broken/workflow.json: an entry needs a `workflow.json`'));
    assert.ok(has("content/concepts/graph/index.md: only an entry's `index` lists `pages`"));
    assert.equal(doc('archive/broken', 'entry').status, 'active');
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
    assert.equal(
        target(refs.find((ref) => ref.resolver == 'page')).url,
        '/skoro/archive/normal/plan/',
    );
    const estimation = store.refsOf('content/guide/estimation/index.md');
    const link = target(estimation.find((ref) => ref.resolver == 'page'));
    assert.equal(link.url, '/skoro/math/retraction/');
    assert.equal(link.formats.title, 'Retractions');
    assert.deepEqual(
        cms.bibliography('archive/normal/math').map((c) => c.key),
        ['folland1999'],
    );
    const landing = store.refsOf('content/landing.md').find((ref) => ref.resolver == 'page');
    assert.equal(target(landing).url, '/skoro/guide/first-model/');
});

test('links to a section’s own page resolve, with its title', () => {
    const refs = store.refsOf('content/guide/first-model/index.md');
    const sections = refs.filter((ref) => ref.resolver == 'section');
    assert.deepEqual(
        sections.map((ref) => [target(ref).url, target(ref).formats.title]),
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
        'math/measure',
        'math/misplaced',
        'math/partless',
        'math/retraction',
        'math/tangent-space',
    ]);
    const between = (a: string, b: string) =>
        edges.filter((e: GraphEdge) => (e.from == a && e.to == b) || (e.from == b && e.to == a));
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
    assert.throws(() => docsPreset({ tracks: ['archive'] }), /cannot be a track/);
    assert.throws(() => docsPreset({ tracks: ['x'], documents: { index: 'Index' } }));
});

test('the workflow record is watched as content', () => {
    const cms = createCms({ preset, root });
    assert.ok(preset.include('content/archive/normal/workflow.json'));
    assert.ok(!preset.include('content/archive/normal/data.json'));
    assert.equal(cms.store.docs.has('content/archive/normal/workflow.json'), false);
});
