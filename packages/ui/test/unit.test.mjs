// The parts of the library that are plain functions. The components
// themselves are exercised by mesearch's end-to-end build.
import assert from 'node:assert/strict';
import test from 'node:test';

import { bestMatch, fuzzy, highlight } from '../dist/fuzzy.js';
import { inlineHtml, layoutGraph } from '../dist/server.js';
import { configure, formatDate, kindLabel, plain, settings } from '../dist/settings.js';

test('a substring beats a scattered match', () => {
    const exact = fuzzy('meas', 'Measures');
    const scattered = fuzzy('mss', 'Measures');
    assert.ok(exact && scattered);
    assert.ok(exact.score > scattered.score);
    assert.deepEqual(exact.indices, [0, 1, 2, 3]);
    assert.equal(fuzzy('xyz', 'Measures'), null);
});

test('the best field wins, by weight', () => {
    const match = bestMatch('integral', [
        ['Expectation', 3],
        ['The integral of a random variable', 1],
    ]);
    assert.equal(match?.field, 1);
    assert.deepEqual(highlight('abc', [1]), [
        { text: 'a', hit: false },
        { text: 'b', hit: true },
        { text: 'c', hit: false },
    ]);
});

test('inline math is rendered and everything else escaped', () => {
    const html = inlineHtml('Sets <and> $\\sigma$-algebras on $\\R$');
    assert.match(html, /^Sets &lt;and&gt; <span class="katex">/);
    assert.match(html, /-algebras on <span class="katex">/);
    // `\R` comes from the base macros.
    assert.doesNotMatch(html, /katex-error/);
    const custom = inlineHtml('$\\PP$', { '\\PP': '\\mathbb{P}' });
    assert.match(custom, /mathbb/);
    assert.doesNotMatch(custom, /katex-error/);
});

test('the graph is laid out with prerequisites above what builds on them', () => {
    const doc = (key, title) => ({
        key,
        kind: 'concept',
        url: `/${key}/`,
        title,
        titleHtml: title,
    });
    const nodes = layoutGraph(
        [doc('a', 'Sets'), doc('b', 'Measures'), doc('c', 'Integrals')],
        [
            { from: 'a', to: 'b', style: 'solid' },
            { from: 'b', to: 'c', style: 'solid' },
        ],
    );
    const by = Object.fromEntries(nodes.map((node) => [node.key, node]));
    assert.deepEqual(
        nodes.map((node) => node.depth),
        [0, 1, 2],
    );
    assert.ok(by.a.y < by.b.y && by.b.y < by.c.y);
    assert.equal(by.c.url, '/c/');
    for (const node of nodes) assert.ok(Number.isFinite(node.x) && node.width > 0);
});

test('settings name kinds and write dates in the site language', () => {
    assert.equal(kindLabel('writeup'), 'Writeup');
    assert.equal(kindLabel('essay'), 'Essay');
    assert.equal(plain('The $\\sigma$-algebra'), 'The \\sigma-algebra');
    const date = new Date('2026-03-04T12:00:00Z');
    assert.equal(formatDate(date), 'Mar 4, 2026');
    configure({ lang: 'de', kinds: { essay: 'Aufsatz' } });
    try {
        assert.equal(kindLabel('essay'), 'Aufsatz');
        assert.equal(kindLabel('concept'), 'Concept');
        assert.equal(formatDate(date), '4. März 2026');
    } finally {
        configure({ lang: 'en' });
        delete settings.kinds.essay;
    }
});

test('a reference reads as one short paragraph', async () => {
    const { referenceHtml } = await import('../dist/server.js');
    const article = referenceHtml({
        kind: 'article',
        title: 'An elementary proof on $\\mathbb{R}^{d}$',
        year: '1981',
        authors: [{ fullname: 'Nasrollah Etemadi' }],
        journal: 'Zeitschrift für Wahrscheinlichkeitstheorie',
        volume: '55',
        number: '1',
        pages: '119--122',
        doi: '10.1007/BF01013465',
    });
    assert.match(article, /^Nasrollah Etemadi\. An elementary proof on <span class="katex">/);
    assert.match(
        article,
        /<i>Zeitschrift für Wahrscheinlichkeitstheorie<\/i> 55\(1\), 119–122\. 1981\./,
    );
    assert.match(
        article,
        /<a href="https:\/\/doi\.org\/10\.1007\/BF01013465">doi:10\.1007\/BF01013465<\/a>$/,
    );
    assert.doesNotMatch(article, /katex-error/);
    const book = referenceHtml({
        kind: 'book',
        title: '{B}rownian <motion>',
        year: '2019',
        authors: [{ fullname: 'A' }, { fullname: 'B' }, { fullname: 'C' }],
        edition: 'Fifth',
        publisher: 'Wiley',
    });
    assert.equal(book, 'A, B and C. <i>Brownian &lt;motion&gt;</i>. Fifth edition. Wiley, 2019.');
    const second = referenceHtml({
        kind: 'book',
        title: 'T',
        year: '1',
        authors: [],
        edition: '2',
    });
    assert.match(second, /2nd edition/);
});
