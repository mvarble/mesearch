// The parts of the library that are plain functions. The components
// themselves are exercised by mesearch's end-to-end build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
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

// `palette` is runes, which svelte-package leaves to the site's compiler: so
// the test compiles it, and runs it against a page that is only as much of a
// document as the palette reads. Each load is a module of its own.
let loads = 0;

// A module written with runes, compiled for the browser, with its imports of
// Svelte pointed at the one copy every compiled module here shares --- and at
// its browser build, which Node would not choose by itself.
async function compileRunes(source) {
    const { compileModule } = await import('svelte/compiler');
    const { js } = compileModule(source, { generate: 'client' });
    const svelte = import.meta.resolve('svelte/package.json');
    const { exports } = JSON.parse(fs.readFileSync(new URL(svelte), 'utf8'));
    const resolve = (id) =>
        id == 'svelte' ? new URL(exports['.'].browser, svelte).href : import.meta.resolve(id);
    const code = js.code.replace(/from '(svelte[^']*)'/g, (_, id) => `from '${resolve(id)}'`);
    return `${code}\n// ${loads++}`;
}

async function loadPalette(page) {
    const file = new URL('../dist/palette.svelte.js', import.meta.url);
    const code = await compileRunes(fs.readFileSync(file, 'utf8'));
    const observers = [];
    const globals = {
        document: { documentElement: page.root, readyState: 'complete' },
        getComputedStyle: () => ({ getPropertyValue: (name) => page.variables()[name] ?? '' }),
        MutationObserver: class {
            constructor(callback) {
                observers.push(callback);
            }
            observe() {}
        },
    };
    // The page exists only while the palette is looking at it.
    const onPage = async (run) => {
        Object.assign(globalThis, globals);
        try {
            return await run();
        } finally {
            for (const name of Object.keys(globals)) delete globalThis[name];
        }
    };
    const module = await onPage(() => import(`data:text/javascript,${encodeURIComponent(code)}`));
    return { ...module, mutate: () => onPage(() => observers.forEach((callback) => callback())) };
}

// The variables `tokens.css` sets for each theme, with `var()` worked out.
function tokens() {
    const css = fs.readFileSync(new URL('../dist/styles/tokens.css', import.meta.url), 'utf8');
    const block = (selector) => {
        const body = css.slice(css.indexOf(`${selector} {`)).match(/\{([\s\S]*?)\n\}/)[1];
        const declarations = body
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .matchAll(/(--[\w-]+)\s*:([^;]*);/g);
        return Object.fromEntries(
            [...declarations].map(([, name, value]) => [name, value.replace(/\s+/g, ' ').trim()]),
        );
    };
    const light = block(':root');
    const dark = { ...light, ...block(":root[data-theme='dark']") };
    const resolve = (values) => {
        const get = (name) => values[name].replace(/var\((--[\w-]+)\)/g, (_, inner) => get(inner));
        return Object.fromEntries(Object.keys(values).map((name) => [name, get(name)]));
    };
    return { light: resolve(light), dark: resolve(dark) };
}

test('the default palettes are the colours tokens.css sets', async () => {
    const { DEFAULT_PALETTES } = await loadPalette({
        root: { dataset: {} },
        variables: () => ({}),
    });
    const variables = tokens();
    const kebab = (key) => `--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
    for (const theme of ['light', 'dark']) {
        const palette = DEFAULT_PALETTES[theme];
        assert.equal(palette.theme, theme);
        for (const [key, value] of Object.entries(palette)) {
            if (key == 'theme') continue;
            if (key == 'series') {
                value.forEach((colour, i) =>
                    assert.equal(colour, variables[theme][`--series-${i + 1}`]),
                );
            } else {
                assert.equal(value, variables[theme][kebab(key)], `${theme} ${key}`);
            }
        }
    }
});

test('the palette follows the theme and the page’s own variables', async () => {
    const variables = tokens();
    const root = { dataset: { theme: 'dark' } };
    // A project's stylesheet changes one colour in each theme; the page has
    // not set the accent at all, as before its styles load.
    const overrides = { light: { '--series-1': '#000001' }, dark: { '--series-1': '#000002' } };
    const page = {
        root,
        variables: () => {
            const set = { ...variables[root.dataset.theme], ...overrides[root.dataset.theme] };
            delete set['--accent'];
            return set;
        },
    };
    const { palette, DEFAULT_PALETTES, mutate } = await loadPalette(page);
    assert.equal(palette.theme, 'dark');
    assert.equal(palette.series[0], '#000002');
    assert.equal(palette.series[1], DEFAULT_PALETTES.dark.series[1]);
    assert.equal(palette.paper, DEFAULT_PALETTES.dark.paper);
    assert.equal(palette.accent, DEFAULT_PALETTES.dark.accent);
    // What a document does: draw in an effect, which draws again when the
    // reader switches theme.
    const effects = await compileRunes(`
        export { flushSync } from 'svelte';
        export const watch = (read, seen) =>
            $effect.root(() => {
                $effect(() => {
                    seen.push(read());
                });
            });
    `);
    const { flushSync, watch } = await import(
        `data:text/javascript,${encodeURIComponent(effects)}`
    );
    const seen = [];
    const stop = watch(() => palette.series[0], seen);
    flushSync();
    root.dataset.theme = 'light';
    await mutate();
    flushSync();
    stop();
    assert.deepEqual(seen, ['#000002', '#000001']);
    assert.equal(palette.theme, 'light');
    assert.equal(palette.series[0], '#000001');
    assert.equal(palette.ink, DEFAULT_PALETTES.light.ink);
    assert.equal(palette.fontUi, DEFAULT_PALETTES.light.fontUi);
});
