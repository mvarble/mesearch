// The math pipeline has two halves that only agree by convention: `renderMath`
// hands mdsvex a `{@html "..."}` string, and `rehypeMathBox` reads KaTeX's
// markup back out of that string by hand to lift an equation number out of the
// scroll container. Nothing but these tests holds the two together, and the
// second half fails silently -- the equation still renders, just without its
// number in the margin.
import test from 'node:test';
import assert from 'node:assert/strict';

// Straight from source: node strips the types, so no build is needed first.
import { renderMath, rehypeKatex, baseMacros } from '../src/katex.ts';
import { rehypeMathBox } from '../src/mathbox.ts';

const rehypeKatexBox = () => rehypeMathBox({ liftTags: true });

// What `remark-math` leaves in the tree for mdsvex to pick up.
const mathElement = (tex, mode) => ({
    type: 'element',
    tagName: mode == 'display' ? 'div' : 'span',
    properties: { className: ['math', `math-${mode}`] },
    children: [{ type: 'text', value: tex }],
});

const root = (...children) => ({ type: 'root', children });

// The rendered HTML, with the `{@html "` wrapper and its escaping undone.
function renderedHtml(node) {
    assert.equal(node.children.length, 1);
    const [child] = node.children;
    assert.equal(child.type, 'text');
    assert.match(child.value, /^\{@html "/);
    assert.match(child.value, /"\}$/);
    return JSON.parse(child.value.slice('{@html '.length, -1));
}

test('a display equation becomes a single Svelte `{@html}` text node', () => {
    const math = mathElement('a = b', 'display');
    renderMath(root(math), 'test.svx');
    assert.match(renderedHtml(math), /^<span class="katex-display">/);
});

test('an inline equation is not rendered in display mode', () => {
    const math = mathElement('a = b', 'inline');
    renderMath(root(math), 'test.svx');
    assert.doesNotMatch(renderedHtml(math), /katex-display/);
});

test('math nested below the root is rendered too', () => {
    const math = mathElement('a = b', 'display');
    const quote = {
        type: 'element',
        tagName: 'blockquote',
        properties: {},
        children: [{ type: 'element', tagName: 'p', properties: {}, children: [math] }],
    };
    renderMath(root(quote), 'test.svx');
    assert.match(renderedHtml(math), /katex-display/);
});

test('macros are applied', () => {
    const math = mathElement('\\reals', 'inline');
    renderMath(root(math), 'test.svx', { katex: { macros: { '\\reals': '\\mathbb{R}' } } });
    assert.match(renderedHtml(math), /mathbb|double-struck|ℝ/);
});

test('a \\gdef in one document does not leak into the next', () => {
    // KaTeX writes `\gdef`s back into the `macros` object it is handed, so
    // `renderMath` has to render from a copy.
    const macros = {};
    const first = mathElement('\\gdef\\leaky{7}\\leaky', 'inline');
    renderMath(root(first), 'first.svx', { katex: { macros } });
    assert.deepEqual(macros, {});

    const second = mathElement('\\leaky', 'inline');
    renderMath(root(second), 'second.svx', { katex: { macros } });
    // Undefined control sequences render in KaTeX's error colour rather than
    // throwing, so the check is that the definition is gone, not that it threw.
    assert.match(renderedHtml(second), /#cc0000|leaky/);
});

test('broken math renders in place instead of throwing', () => {
    const math = mathElement('\\frac{1}', 'display');
    assert.doesNotThrow(() => renderMath(root(math), 'test.svx'));
    // KaTeX's own error rendering: the offending source, in red, in place.
    assert.match(renderedHtml(math), /class="katex-error"/);
});

test('rehypeMathBox lifts an equation number out of the scroll container', () => {
    // The load-bearing coupling: this only works while KaTeX names the tag span
    // `katex-tag` and opens it with a `katex-strut` child. KaTeX 0.18 renamed
    // both from `tag` and `strut`, which is what made the scraper stop firing.
    const math = mathElement('a = b \\tag{1.2}', 'display');
    const tree = root(math);
    renderMath(tree, 'test.svx');
    assert.match(renderedHtml(math), /class="katex-tag"/);

    rehypeKatexBox()(tree);

    const [wrapper] = tree.children;
    assert.deepEqual(wrapper.properties.className, ['math-tag-container']);
    const [scroll, tag] = wrapper.children;
    assert.deepEqual(scroll.properties.className, ['math-scroll-container']);
    assert.deepEqual(tag.properties.className, ['math-tag']);
    assert.match(tag.children[0].value, /1\.2/);
    // The strut is dropped on the way up: it is sized for the equation's line
    // box, which the tag no longer sits in.
    assert.doesNotMatch(tag.children[0].value, /katex-strut/);
});

test('an untagged equation gets a scroll container and nothing else', () => {
    const math = mathElement('a = b', 'display');
    const tree = root(math);
    renderMath(tree, 'test.svx');
    rehypeKatexBox()(tree);

    const [wrapper] = tree.children;
    assert.deepEqual(wrapper.properties.className, ['math-scroll-container']);
});

test('without liftTags a tagged equation keeps its number inside the box', () => {
    const math = mathElement('a = b \\tag{1}', 'display');
    const tree = root(math);
    renderMath(tree, 'test.svx');
    rehypeMathBox()(tree);
    assert.deepEqual(tree.children[0].properties.className, ['math-scroll-container']);
    assert.match(renderedHtml(math), /katex-tag/);
});

// The layering `rehypeKatex` does before it renders: base table, then the
// site's, then the document's own frontmatter --- nearer definitions win.
const vfile = (fm) => ({ filename: 'doc.svx', data: { fm } });

test('frontmatter macros win over site macros, which win over the base table', () => {
    const math = mathElement('\\bbR \\site \\doc', 'inline');
    rehypeKatex({ macros: { '\\site': 'S', '\\doc': 'X' } })(
        root(math),
        vfile({ katex_macros: { '\\doc': 'D' } }),
    );
    const html = renderedHtml(math);
    assert.match(html, /mathbb/);
    assert.match(html, />S</);
    assert.match(html, />D</);
    assert.doesNotMatch(html, />X</);
});

test('a macro function supplies the whole fold, frontmatter included', () => {
    const math = mathElement('\\folded', 'inline');
    rehypeKatex({ macros: () => ({ '\\folded': 'F' }) })(
        root(math),
        vfile({ katex_macros: { '\\folded': 'ignored' } }),
    );
    assert.match(renderedHtml(math), />F</);
});

test('base: false leaves the base table out', () => {
    const math = mathElement('\\bbR', 'inline');
    rehypeKatex({ base: false })(root(math), vfile({}));
    assert.match(renderedHtml(math), /katex-error|#cc0000/);
    assert.ok('\\bbR' in baseMacros);
});

test('camelCase katexMacros is accepted too', () => {
    const math = mathElement('\\cc', 'inline');
    rehypeKatex()(root(math), vfile({ katexMacros: { '\\cc': 'C' } }));
    assert.match(renderedHtml(math), />C</);
});
