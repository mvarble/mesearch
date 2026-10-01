import katex from 'katex';
import { baseMacros, type KatexMacros } from '@mvarble/mesearch-markdown/katex';
import site from '$site';

const escapeHtml = (text: string) =>
    text.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );

// A short piece of text --- a title, a heading, a summary --- as HTML, with its
// inline `$...$` math rendered. Rendered here, at build time, so that no page
// has to ship KaTeX to show a title.
export function inlineHtml(text: string, macros: KatexMacros = {}): string {
    const all = { ...baseMacros, ...site.katexMacros, ...macros };
    return text
        .split(/(\$[^$]+\$)/g)
        .map((part) =>
            part.length > 2 && part.startsWith('$') && part.endsWith('$')
                ? katex.renderToString(part.slice(1, -1), {
                      macros: { ...all },
                      throwOnError: false,
                      output: 'html',
                  })
                : escapeHtml(part),
        )
        .join('');
}
