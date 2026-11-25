import { describe, expect, it } from 'vitest';

import { excerpt, hasTex, renderMixed, renderTex } from '../../app/lib/tex';

describe('renderMixed', () => {
    it('escapes plain text', () => {
        expect(renderMixed('a < b & c')).toBe('a &lt; b &amp; c');
    });

    it('renders each $…$ span with KaTeX and keeps the text around it', () => {
        const html = renderMixed('score $s$ of $\\theta$');
        expect(html.startsWith('score <span class="katex">')).toBe(true);
        expect(html).toContain(' of <span class="katex">');
        expect(html.match(/class="katex"/g)).toHaveLength(2);
    });

    it('treats \\$ as a literal dollar sign', () => {
        expect(renderMixed('costs \\$5')).toBe('costs $5');
        expect(hasTex('costs \\$5')).toBe(false);
    });

    it('leaves an unmatched $ as text', () => {
        expect(renderMixed('a $ b')).toBe('a $ b');
    });

    it('applies the site-wide macros, and per-call macros over them', () => {
        expect(renderTex('\\R')).toContain('mathbb');
        expect(renderTex('\\foo', { macros: { '\\foo': 'y' } })).toContain('>y<');
    });

    it('does not let a \\gdef leak into the next call', () => {
        renderTex('\\gdef\\leak{z}');
        // KaTeX draws an undefined control sequence in its error colour.
        expect(renderTex('\\leak')).toContain('#cc0000');
    });
});

describe('excerpt', () => {
    it('leaves text no longer than the limit whole', () => {
        expect(excerpt('a short summary.', 16)).toBe('a short summary.');
    });

    it('cuts at the last space before the limit, with an ellipsis', () => {
        expect(excerpt('one two three four', 10)).toBe('one two…');
    });

    it('drops the punctuation before the ellipsis', () => {
        expect(excerpt('one, two; three four', 9)).toBe('one, two…');
    });

    it('never cuts inside inline math', () => {
        expect(excerpt('take $a + b + c$ and more', 10)).toBe('take…');
        expect(excerpt('costs \\$5 and $x + y$ more', 18)).toBe('costs \\$5 and…');
    });

    it('cuts at the first space after the limit when there is none before it', () => {
        expect(excerpt('$a + b$ c d', 3)).toBe('$a + b$…');
        expect(excerpt('unbroken', 3)).toBe('unbroken');
    });
});
