// The whole thing, end to end: `mesearch build` on the example project, and
// what the static site it writes contains. Needs `pnpm build` first, since it
// runs the CLI as installed.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const cli = path.join(here, '..', 'dist', 'cli.js');
const example = path.join(here, '..', '..', '..', 'example');

function build(...args) {
    const out = fs.mkdtempSync(path.join(os.tmpdir(), 'mesearch-build-'));
    execFileSync(process.execPath, [cli, 'build', '--out', out, '--force', ...args], {
        cwd: example,
        stdio: 'pipe',
    });
    return out;
}

const out = build();
const read = (file) => fs.readFileSync(path.join(out, file), 'utf8');

test('every document gets a page, plus the home page and the search index', () => {
    for (const page of [
        'index.html',
        'concepts/measure/index.html',
        'writeups/coin-flips/index.html',
        'sequences/first-steps/index.html',
        'search.json',
    ]) {
        assert.ok(fs.existsSync(path.join(out, page)), `${page} exists`);
    }
});

test('math is rendered at build time, with site and frontmatter macros', () => {
    const html = read('concepts/measure/index.html');
    assert.match(html, /class="katex"/);
    assert.doesNotMatch(html, /katex-error/);
    // `\meas` comes from the frontmatter and `\PP` from mesearch.config.ts.
    assert.doesNotMatch(read('concepts/probability-space/index.html'), /katex-error/);
});

test('equations are numbered and references resolve', () => {
    const html = read('writeups/lebesgue-integral/index.html');
    assert.match(html, /id="eq:simple"/);
    assert.match(html, /class="math-tag"/);
    assert.match(html, /href="\/writeups\/lebesgue-integral\/#eq:simple">\(1\)</);
});

test('links written as paths on disk become site URLs', () => {
    assert.match(read('concepts/measure/index.html'), /href="\/concepts\/sigma-algebra\/"/);
});

test('the home page ships the map already laid out, and the index', () => {
    const html = read('index.html');
    assert.match(html, /<svg[^>]*viewBox="-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+"/);
    assert.equal((html.match(/class="node /g) ?? []).length, 10);
    assert.match(html, /translate\(-?[\d.]+ -?[\d.]+\)/);
    assert.match(html, /<ol class="entries/);
    // Without JavaScript the page is light.
    assert.match(html, /<html lang="en" data-theme="light"/);
});

test('documents get a header, a table of contents and their sequence', () => {
    const html = read('writeups/independence/index.html');
    assert.match(html, /<h1[^>]*>(<!--[^>]*-->)*Independence/);
    assert.equal((html.match(/<h1/g) ?? []).length, 1, 'document headings start at h2');
    assert.match(html, /href="#coins-again"/);
    assert.match(html, /Sequence · 2 of 3/);
});

test('the search index carries headings', () => {
    const entries = JSON.parse(read('search.json'));
    const sets = entries.find((entry) => entry.key == 'concepts/sets');
    assert.ok(sets.headings.some((heading) => heading.slug == 'countable-unions'));
});

test('a base path prefixes every internal link', () => {
    const based = build('--base', '/notes');
    const html = fs.readFileSync(path.join(based, 'concepts/measure/index.html'), 'utf8');
    assert.match(html, /href="\/notes\/concepts\/sigma-algebra\/"/);
    assert.doesNotMatch(html, /href="\/concepts\//);
});
