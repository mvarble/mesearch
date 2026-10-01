import fs from 'node:fs/promises';
import path from 'node:path';
import { createHighlighter, bundledLanguages, type Highlighter } from 'shiki';
import { escapeSvelte } from 'mdsvex';

const THEMES = { light: 'vitesse-light', dark: 'vitesse-dark' } as const;

// Loading all of Shiki's grammars eagerly costs seconds, and a site cannot know
// up front which ones its documents use, so a language is loaded the first time
// a fence asks for one.
//
// Both caches hold the *promise* rather than what it settles to. mdsvex
// highlights a document's fences concurrently, through `Promise.all`, so a
// cache filled in after an `await` is empty for every call already in flight:
// two fences would each build a highlighter, and the language one of them loaded
// would be loaded into a highlighter the other never sees. That fails as
// "Language `json` not found", on the second language a document uses.
let highlighter: Promise<Highlighter> | undefined;
const loaded = new Map<string, Promise<void>>();

const highlighterFor = () =>
    (highlighter ??= createHighlighter({ themes: Object.values(THEMES), langs: [] }));

async function languageFor(shiki: Highlighter, lang: string | null | undefined): Promise<string> {
    if (!lang || !(lang in bundledLanguages)) return 'text';
    const load = loaded.get(lang) ?? shiki.loadLanguage(lang as keyof typeof bundledLanguages);
    loaded.set(lang, load);
    await load;
    return lang;
}

// A fence whose entire body is `{./path/to/file}` --- optionally with a line
// range, as `{./path/to/file:10..20}` --- is replaced by that file's contents,
// highlighted as its own extension suggests. Keeping a snippet in the file it
// came from means it cannot drift from the code it is quoting.
export async function highlight(
    code: string,
    lang: string | null | undefined,
    _meta: string | null | undefined,
    filename: string | undefined,
): Promise<string> {
    if (!code.includes('\n') && code.startsWith('{') && code.endsWith('}')) {
        if (!filename) throw new Error('cannot resolve a fenced import without a filename.');
        const [imported, start, end] = parseImportString(code.slice(1, -1), filename);
        code = await fs.readFile(imported, 'utf8');
        code = sliceLines(code, start, end);
        lang = path.extname(imported).slice(1);
    }

    const shiki = await highlighterFor();
    const html = escapeSvelte(
        shiki.codeToHtml(code, { lang: await languageFor(shiki, lang), themes: THEMES }),
    );
    return `{@html \`${html}\` }`;
}

function sliceLines(code: string, start: number | null, end: number | null): string {
    if (start == null && end == null) return code;
    const lines = code.split('\n');
    return lines.slice(start ?? 0, end == null ? undefined : end + 1).join('\n');
}

// Parses the body of a fenced import: a path, optionally followed by `:` and a
// range written as `start..`, `..end` or `start..end`. The path is resolved
// relative to the document that wrote it.
function parseImportString(
    importString: string,
    filename: string,
): [string, number | null, number | null] {
    let imported = importString;
    let start: number | null = null;
    let end: number | null = null;

    if (importString.includes(':')) {
        const parts = importString.split(':');
        if (parts.length > 2) {
            throw new Error('a fenced import cannot contain multiple `:` characters.');
        }
        imported = parts[0]!;
        const range = parts[1]!;
        if (range.startsWith('..')) {
            end = Number(range.slice(2));
            if (!Number.isFinite(end)) throw new Error(`\`${range}\` is not a range ..end.`);
        } else if (range.endsWith('..')) {
            start = Number(range.slice(0, -2));
            if (!Number.isFinite(start)) {
                throw new Error(`\`${range}\` is not a range start..`);
            }
        } else {
            const match = /^([0-9]+)\.\.([0-9]+)$/.exec(range);
            if (!match) throw new Error(`\`${range}\` is not a range start..end.`);
            start = Number(match[1]);
            end = Number(match[2]);
        }
    }

    return [path.resolve(path.dirname(filename), imported), start, end];
}
