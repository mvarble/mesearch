import katex, { type KatexOptions } from 'katex';
import type { Plugin } from 'unified';
import type { Root, Element } from 'hast';

// KaTeX's own macro type: a definition may be a string, but it may also be a
// structure or an expander function.
export type KatexMacros = NonNullable<KatexOptions['macros']>;

const alphabet = 'abcdefghijklmnopqrstuvwxyz';
const greeks = [
    ['α', 'alpha'],
    ['β', 'beta'],
    ['γ', 'gamma'],
    ['δ', 'delta'],
    ['ϵ', 'epsilon'],
    ['ζ', 'zeta'],
    ['η', 'eta'],
    ['θ', 'theta'],
    ['ι', 'iota'],
    ['κ', 'kappa'],
    ['λ', 'lambda'],
    ['μ', 'mu'],
    ['ν', 'nu'],
    ['ξ', 'xi'],
    ['π', 'pi'],
    ['ρ', 'rho'],
    ['σ', 'sigma'],
    ['τ', 'tau'],
    ['ϕ', 'phi'],
    ['ψ', 'psi'],
    ['χ', 'chi'],
    ['ω', 'omega'],
];

const titleCase = (str: string) => (str.length ? str.at(0)!.toUpperCase() + str.slice(1) : '');

// Macros every document gets for free: `\bfx` for a bold `x`, `\calF` for a
// script `F`, `\bbR` for the reals, and the same for the Greek letters. A site
// adds to these from its configuration and a document from its frontmatter,
// and the nearer definition of a name wins.
export const baseMacros: KatexMacros = {
    ...Object.fromEntries([
        ...alphabet.split('').flatMap((char) => [
            [`\\rm${char}`, `{\\rm ${char}}`],
            [`\\bf${char}`, `\\boldsymbol{${char}}`],
            [`\\rm${char.toUpperCase()}`, `\\mathrm{${char.toUpperCase()}}`],
            [`\\cal${char.toUpperCase()}`, `\\mathcal{${char.toUpperCase()}}`],
            [`\\scr${char.toUpperCase()}`, `\\mathscr{${char.toUpperCase()}}`],
            [`\\bb${char.toUpperCase()}`, `\\mathbb{${char.toUpperCase()}}`],
            [`\\bf${char.toUpperCase()}`, `\\mathbf{${char.toUpperCase()}}`],
        ]),
        ...greeks.flatMap(([char, ident]) => [
            [`\\rm${ident}`, `{\\rm ${char}}`],
            [`\\bf${ident}`, `\\boldsymbol{${char}}`],
            [`\\rm${titleCase(ident!)}`, `\\mathrm{${char!.toUpperCase()}}`],
            [`\\cal${titleCase(ident!)}`, `\\mathcal{${char!.toUpperCase()}}`],
            [`\\bf${titleCase(ident!)}`, `\\mathbf{${char!.toUpperCase()}}`],
        ]),
    ]),
    '\\im': '\\rmi',
    '\\defeq': '\\coloneqq',
    '\\eqdef': '\\eqqcolon',
};

// Both spellings are accepted. `katex_macros` is the documented one; documents
// written for other tools reach for the camelCase form often enough that
// rejecting it only produces a confusing wall of undefined-control-sequence
// errors.
const MACRO_FIELDS = ['katex_macros', 'katexMacros'];

// The macros a frontmatter mapping declares, in either spelling.
export function frontmatterMacros(frontmatter: unknown): KatexMacros {
    if (!frontmatter || typeof frontmatter != 'object') return {};
    const macros: KatexMacros = {};
    for (const field of MACRO_FIELDS) {
        const value = (frontmatter as Record<string, unknown>)[field];
        if (value && typeof value == 'object') Object.assign(macros, value);
    }
    return macros;
}

// mdsvex parks the parsed frontmatter on the vfile as `data.fm`.
export const documentMacros = (vfile: unknown): KatexMacros =>
    frontmatterMacros((vfile as { data?: { fm?: unknown } }).data?.fm);

const isMath = (node: Element): 'inline' | 'display' | null => {
    const classes = node.properties?.className;
    if (!Array.isArray(classes)) return null;
    if (classes.includes('math-display')) return 'display';
    if (classes.includes('math-inline')) return 'inline';
    return null;
};

// The TeX source, which `remark-math` leaves as the element's text content.
function textOf(node: Element): string {
    let text = '';
    const stack = [...node.children].reverse();
    while (stack.length > 0) {
        const child = stack.pop()!;
        if (child.type == 'text') text += child.value;
        else if (child.type == 'element') stack.push(...[...child.children].reverse());
    }
    return text;
}

export interface RenderOptions {
    katex?: KatexOptions;
    /** Prefixes every report, so the reader knows which tool is talking. */
    label?: string;
    /** Re-report on every recompile, rather than only when something changes. */
    watch?: boolean;
}

// What was last reported for each document. A build compiles each document
// twice, once per Vite pass, so without this the same broken equation is
// reported twice for one command.
const lastReported = new Map<string, string>();

// Renders every `.math-inline` / `.math-display` element in place, replacing its
// children with the one text node mdsvex needs.
//
// KaTeX is called directly rather than through `rehype-katex`: the escaping a
// Svelte template needs is a one-liner, and going through a wrapper meant the
// math was rendered by whichever KaTeX that wrapper depended on rather than the
// one whose stylesheet and fonts ship with the page. Skewed versions render
// markup the stylesheet does not fully cover.
export function renderMath(tree: Root, filename: string, options: RenderOptions = {}) {
    // One copy per document: KaTeX writes `\gdef`s back into this object, so a
    // definition made in one equation is visible to later ones, while the table
    // it was copied from stays intact for the next document.
    const settings = { ...options.katex, macros: { ...(options.katex?.macros ?? {}) } };
    const failures: string[] = [];

    const stack: Array<Root | Element> = [tree];
    while (stack.length > 0) {
        const node = stack.pop()!;
        for (const child of node.children) {
            if (child.type != 'element') continue;
            const mode = isMath(child);
            if (!mode) {
                stack.push(child);
                continue;
            }

            const tex = textOf(child);
            const displayMode = mode == 'display';
            let html: string;
            try {
                html = katex.renderToString(tex, { ...settings, displayMode, throwOnError: true });
            } catch (error) {
                // Rendered anyway, in KaTeX's error colour: a document being
                // drafted should still produce a page, with the broken formula
                // visible in place rather than a failed build.
                html = katex.renderToString(tex, { ...settings, displayMode, throwOnError: false });
                failures.push(`${summarise(error)}\n      in: ${tex.trim().split('\n')[0]}`);
            }
            // `JSON.stringify` is what makes this Svelte rather than HTML, and
            // `rehypeMathBox` reads the escaping it produces back out again.
            child.children = [{ type: 'text', value: `{@html ${JSON.stringify(html)}}` }];
        }
    }

    report(options.label ?? 'katex', filename, failures, options.watch ?? false);
}

// Every failure the document currently has, every time it is recompiled ---
// not just the ones that are new. While you are editing macros to fix an
// expression, an error that is still there is the thing you most need to be
// told about, and silence reads as success.
//
// Outside watch mode the same report would be printed once per build pass, so
// there it is emitted only when the set of failures actually changes.
function report(label: string, filename: string, failures: string[], watch: boolean) {
    const signature = failures.join('\n');
    const previous = lastReported.get(filename);
    lastReported.set(filename, signature);

    if (!watch && signature == previous) return;

    if (failures.length == 0) {
        // Only worth saying when it is news: the document had errors a moment
        // ago and now does not.
        if (watch && previous) console.log(`${label}: ${filename}\n    math renders cleanly`);
        return;
    }
    for (const failure of failures) console.warn(`${label}: ${filename}\n    ${failure}`);
}

const summarise = (error: unknown) =>
    (error instanceof Error ? error.message : String(error)).replace(/ at position \d+.*$/s, '');

export interface RehypeKatexOptions extends Omit<RenderOptions, 'katex'> {
    /** Start from `baseMacros`. On by default. */
    base?: boolean;
    /**
     * The macros layered over the base table. A plain table is folded under the
     * document's own frontmatter macros. A function is asked per document and
     * its answer is used as given --- which is how a content layer that already
     * knows each document's ancestry supplies the whole fold itself.
     */
    macros?: KatexMacros | ((vfile: unknown) => KatexMacros);
    katex?: Omit<KatexOptions, 'macros'>;
}

export const rehypeKatex: Plugin<[RehypeKatexOptions?], Root> = (options = {}) => {
    const base = options.base === false ? {} : baseMacros;
    return (tree, vfile) => {
        const macros =
            typeof options.macros == 'function'
                ? { ...base, ...options.macros(vfile) }
                : { ...base, ...(options.macros ?? {}), ...documentMacros(vfile) };
        // mdsvex puts the document's absolute path on the vfile as `filename`,
        // which is not one of vfile's own fields.
        const filename = (vfile as { filename?: string }).filename ?? 'document';
        renderMath(tree, filename, {
            katex: { ...options.katex, macros },
            label: options.label,
            watch: options.watch,
        });
    };
};
