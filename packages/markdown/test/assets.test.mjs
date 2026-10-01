// Relative asset URLs become Vite imports: the rehype pass swaps the attribute
// for an expression, and the preprocessor hoists the matching import.
import test from 'node:test';
import assert from 'node:assert/strict';

import { rehypeAssets, hoistAssetImports } from '../src/assets.ts';

const img = (src) => ({ type: 'element', tagName: 'img', properties: { src }, children: [] });

test('relative sources are rewritten and hoisted into a new script', () => {
    const tree = {
        type: 'root',
        children: [img('./a.png'), img('https://x/b.png'), img('../c.svg')],
    };
    rehypeAssets()(tree, { filename: '/docs/one.svx' });
    const [a, b, c] = tree.children.map((node) => node.properties.src);
    assert.equal(b, 'https://x/b.png');
    assert.match(a, /^\{__md_asset_\d\}$/);
    assert.match(c, /^\{__md_asset_\d\}$/);
    assert.notEqual(a, c);

    const out = hoistAssetImports.markup({ content: '<p>hi</p>', filename: '/docs/one.svx' });
    assert.match(out.code, /^<script>\nimport __md_asset_/);
    assert.ok(out.code.includes(`import ${a.slice(1, -1)} from "./a.png";`));
    assert.ok(out.code.includes(`import ${c.slice(1, -1)} from "../c.svg";`));
});

test('imports go inside an existing instance script, not the module block', () => {
    const tree = { type: 'root', children: [img('./a.png')] };
    rehypeAssets()(tree, { filename: '/docs/two.svx' });
    const content =
        '<script context="module">export const metadata = {};</script>\n' +
        '<script>\nlet x = 1;\n</script>\n<p>body</p>';
    const out = hoistAssetImports.markup({ content, filename: '/docs/two.svx' });
    assert.equal(out.code.match(/<script>/g).length, 1);
    assert.match(out.code, /<script>\nimport __md_asset_0 from "\.\/a\.png";\nlet x = 1;/);
});

test('a document without assets is left alone', () => {
    rehypeAssets()({ type: 'root', children: [] }, { filename: '/docs/three.svx' });
    assert.equal(
        hoistAssetImports.markup({ content: 'x', filename: '/docs/three.svx' }),
        undefined,
    );
});
