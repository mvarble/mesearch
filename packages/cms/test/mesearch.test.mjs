// The mesearch layout: documents in folders, dependencies and sequences from
// frontmatter, a graph of solid and dashed edges, and links written the way the
// files sit on disk.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

import { buildStore } from '../src/core/build.ts';
import { createCms } from '../src/cms.ts';
import { mesearchPreset } from '../src/presets/mesearch/index.ts';
import { bind } from '../src/presets/mesearch/runtime.ts';
import { fixtureRoot } from './harness.mjs';

const root = fixtureRoot('mesearch');
const dates = () => undefined;
const preset = mesearchPreset({ base: '/math', dates });
const store = buildStore({ root, preset, macros: { '\\global': 'G' } });
const cms = bind(preset.snapshot(store));
const messages = store.diagnostics.map((d) => d.message);

test('documents are found by folder, with their frontmatter', () => {
    const measure = cms.documents.get('concepts/measure');
    assert.equal(measure.title, 'Measure');
    assert.equal(measure.kind, 'concept');
    assert.equal(measure.descriptionFilename, 'docs/concepts/measure/description.md');
    assert.equal(measure.summary, 'Sizes of sets.');
    assert.equal(measure.updated.toISOString().slice(0, 10), '2026-03-01');
    assert.deepEqual(measure.dependsOn, ['concepts/sets']);
    // No description: the first paragraph stands in.
    assert.equal(cms.documents.get('concepts/sets').summary, 'A set is a collection.');
    assert.equal(cms.description(), 'docs/description.md');
});

test('a missing updated date falls back to created', () => {
    const sets = cms.documents.get('concepts/sets');
    assert.equal(sets.updated.valueOf(), sets.created.valueOf());
});

test('an ambiguous bare slug is an error, a qualified one is not', () => {
    assert.ok(
        messages.some((m) => m.includes("'shared' is both concepts/shared and writeups/shared")),
    );
    assert.deepEqual(cms.documents.get('writeups/lebesgue').dependsOn, [
        'concepts/measure',
        'concepts/shared',
    ]);
});

test('sequences order writeups and imply solid edges between neighbours', () => {
    const intro = cms.sequences.get('sequences/intro');
    assert.deepEqual(intro.documents, ['writeups/notes', 'writeups/lebesgue']);
    assert.deepEqual(cms.documents.get('writeups/notes').sequences, ['sequences/intro']);
    const [membership] = cms.sequences.containing('writeups/lebesgue');
    assert.equal(membership.index, 1);
    const edge = cms
        .graph()
        .edges.find((e) => e.from == 'writeups/notes' && e.to == 'writeups/lebesgue');
    assert.deepEqual(edge, {
        from: 'writeups/notes',
        to: 'writeups/lebesgue',
        style: 'solid',
        via: 'sequence',
    });
});

test('links make dashed edges only where no dependency exists either way', () => {
    const edges = cms.graph().edges;
    const between = (a, b) =>
        edges.filter((e) => (e.from == a && e.to == b) || (e.from == b && e.to == a));
    // Measure links to sets, but depends on it: solid only.
    assert.deepEqual(
        between('concepts/sets', 'concepts/measure').map((e) => e.style),
        ['solid'],
    );
    // Notes links to sets with no dependency: dashed.
    assert.deepEqual(
        between('writeups/notes', 'concepts/sets').map((e) => e.style),
        ['dashed'],
    );
    assert.ok(!cms.graph().nodes.includes('sequences/intro'), 'sequences are not nodes');
    assert.deepEqual(
        cms.related('concepts/sets').map((d) => d.key),
        ['writeups/notes'],
    );
    assert.deepEqual(
        cms.dependents('concepts/measure').map((d) => d.key),
        ['writeups/lebesgue'],
    );
});

test('links resolve the way files sit on disk, and rewrite to site URLs', () => {
    const refs = store.refsOf('docs/concepts/measure/index.md');
    const page = refs.find((r) => r.written == '../../writeups/lebesgue/index.md#start');
    assert.equal(page.target.url, '/math/writeups/lebesgue/#start');
    const site = store.refsOf('docs/description.md').find((r) => r.resolver == 'page');
    assert.equal(site.target.url, '/math/concepts/measure/');
    assert.ok(messages.some((m) => m.includes("'writeups/nowhere' does not resolve to a page")));
    assert.ok(!messages.some((m) => m.includes('figure.png')), 'assets are not pages');
});

test('equations number per document and are reachable across documents', () => {
    const local = store.ref('docs/concepts/measure/index.md', 'equation', 'unit');
    assert.equal(local.target.label, '0');
    assert.equal(local.target.url, '/math/concepts/measure/#eq:unit');
    const remote = store.ref(
        'docs/writeups/lebesgue/index.md',
        'equation',
        'concepts/measure/unit',
    );
    assert.equal(remote.target.url, '/math/concepts/measure/#eq:unit');
});

test('headings reach h3 and keep inline math delimited', () => {
    const outline = cms.outline('docs/concepts/sets/index.md');
    assert.equal(outline[0].title, 'Notation');
    assert.equal(outline[0].children[0].title, 'Membership with $x \\in A$');
    assert.equal(outline[0].children[0].slug, 'membership-with-x-in-a');
    assert.equal(outline[0].children[0].children[0].title, 'Deeper');
});

test('a description folds its document macros over the site', () => {
    assert.deepEqual(store.foldedMacros('docs/concepts/measure/description.md'), {
        '\\global': 'G',
        '\\mu': '\\mathrm{m}',
    });
    assert.equal(store.foldedMacros('docs/description.md')['\\site'], 'S');
});

test('the loaders module imports every document', async () => {
    const cms = createCms({ root, preset: mesearchPreset({ dates }) });
    const [plugin] = cms.vite();
    const id = await plugin.resolveId.call({}, 'virtual:mesearch-cms/loaders');
    const code = plugin.load.call({}, id);
    assert.match(code, /"docs\/concepts\/measure\/description\.md": \(\) => import\(/);
    assert.ok(code.includes(path.join(root, 'docs/writeups/notes/index.md')));
});
