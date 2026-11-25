import katex, { type KatexOptions } from 'katex';

import { katex as config } from '$site';

// KaTeX for components, as opposed to `$…$` in Markdown, which the build renders
// (`rehypeKatex`, from `@mvarble/mesearch-markdown`).
//
// Rendering is synchronous, so during prerendering the math is written into the static HTML and
// needs no JavaScript to display. In the browser the same call runs again: Svelte keeps the
// prerendered nodes while hydrating, but a client-side navigation renders the page fresh, so KaTeX
// ships in the chunk of any page that uses these helpers.

export type Macros = Record<string, string>;

export interface TexOptions {
    display?: boolean;
    /** Merged over the site-wide macros in the site's `katex.config.ts`. */
    macros?: Macros;
}

export function renderTex(source: string, { display = false, macros }: TexOptions = {}): string {
    // KaTeX writes `\gdef` definitions back into `macros`, so each call gets a fresh copy.
    const settings: KatexOptions = {
        ...config,
        displayMode: display,
        macros: { ...config.macros, ...macros },
    };
    try {
        return katex.renderToString(source, { ...settings, throwOnError: true });
    } catch (error) {
        // As in the Markdown pipeline: render the broken formula in KaTeX's error colour and say so
        // on the build's console, rather than failing the page.
        if (import.meta.env.SSR) {
            const message = error instanceof Error ? error.message : String(error);
            console.warn(`katex: component\n    ${message}\n      in: ${source}`);
        }
        return katex.renderToString(source, { ...settings, throwOnError: false });
    }
}

const escapeHtml = (text: string) =>
    text.replace(
        /[&<>"']/g,
        (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );

/** Whether `text` contains inline math, i.e. an unescaped `$`. */
export const hasTex = (text: string) => /(^|[^\\])\$/.test(text);

/**
 * Text with inline math, as HTML: `$…$` spans are rendered by KaTeX, and everything else is
 * escaped. `\$` is a literal dollar sign.
 */
export function renderMixed(text: string, macros?: Macros): string {
    let html = '';
    let rest = text;
    while (rest) {
        const open = findDollar(rest, 0);
        if (open < 0) break;
        const close = findDollar(rest, open + 1);
        if (close < 0) break;
        html += escapeHtml(unescapeDollars(rest.slice(0, open)));
        html += renderTex(rest.slice(open + 1, close), { macros });
        rest = rest.slice(close + 1);
    }
    return html + escapeHtml(unescapeDollars(rest));
}

function findDollar(text: string, from: number): number {
    for (let i = from; i < text.length; i++) {
        if (text[i] == '\\') i++;
        else if (text[i] == '$') return i;
    }
    return -1;
}

const unescapeDollars = (text: string) => text.replaceAll('\\$', '$');

/**
 * The opening of text with inline math, at most about `max` characters of its source: cut at the
 * last space before `max` that is outside a `$…$` span, with an ellipsis. Text no longer than
 * `max` is returned whole; text with no such space is cut at the first one after it.
 */
export function excerpt(text: string, max: number): string {
    if (text.length <= max) return text;
    let math = false;
    let cut = -1;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (c == '\\') i++;
        else if (c == '$') math = !math;
        else if (!math && /\s/.test(c)) {
            if (i <= max || cut < 0) cut = i;
            if (i > max) break;
        }
    }
    if (cut < 0) return text;
    return text.slice(0, cut).replace(/[\s,;:.—–-]+$/, '') + '…';
}
