import fs from 'node:fs';
import path from 'node:path';

// A fenced code block whose whole body is `{<path>}` or `{<path>:<range>}` is replaced by that
// file's contents, so snippets are quoted from real, compiled source instead of retyped. `<path>`
// is relative to the document; `<range>` is `start..`, `..end` or `start..end` in **1-indexed,
// inclusive** line numbers, the numbering an editor or GitHub shows. (The blog this was adapted
// from slices 0-indexed.)
//
// If every non-blank line of the excerpt is a Rust doc comment (`//!` or `///`), the markers are
// stripped: the excerpt is then highlighted as Markdown, which is what rustdoc prose is, unless the
// fence names a language (as it must when quoting a doctest's code). The excerpt is then dedented.
//
//     ```rust
//     {../../../../crates/skoro/src/lib.rs:30..37}
//     ```
//
// These are the documentation sites' quotations, numbered as an editor numbers lines. The fenced
// imports `highlight` resolves on its own are numbered from 0, as the blog writes them; the two
// are kept apart so that neither changes under the other's documents.
//
// `root` is the repository the quoted files live in, which a quotation's path is reported from.

export interface FileRef {
    code: string;
    lang: string;
    /** Path from the repository root, with `/` separators. */
    repoPath: string;
    start: number;
    end: number;
}

export function isFileRef(code: string): boolean {
    code = code.trim();
    return !code.includes('\n') && code.startsWith('{') && code.endsWith('}');
}

export function resolveFileRef(
    code: string,
    documentPath: string,
    root: string,
    fenceLang?: string,
): FileRef {
    const spec = code.trim().slice(1, -1);
    const [target, range, ...rest] = spec.split(':');
    if (rest.length) throw new Error(`${documentPath}: a file reference may contain one \`:\`.`);
    if (!target) throw new Error(`${documentPath}: a file reference names no file.`);

    const filename = path.resolve(path.dirname(documentPath), target);
    const lines = fs.readFileSync(filename, 'utf8').replace(/\n$/, '').split('\n');
    let [start, end] = parseRange(range, documentPath);
    start ??= 1;
    end ??= lines.length;
    if (start < 1 || end > lines.length || start > end) {
        throw new Error(
            `${documentPath}: lines ${start}..${end} are outside ${target} (${lines.length} lines).`,
        );
    }

    const excerpt = lines.slice(start - 1, end);
    const stripped = stripDocComments(excerpt);
    const lang = fenceLang || (stripped ? 'markdown' : path.extname(filename).slice(1) || 'text');
    return {
        code: dedent(stripped ?? excerpt).join('\n'),
        lang,
        repoPath: path.relative(root, filename).split(path.sep).join('/'),
        start,
        end,
    };
}

function parseRange(range: string | undefined, documentPath: string): [number?, number?] {
    if (range === undefined) return [];
    const match = /^(\d*)\.\.(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
        throw new Error(`${documentPath}: \`${range}\` is not a range \`start..end\`.`);
    }
    return [match[1] ? Number(match[1]) : undefined, match[2] ? Number(match[2]) : undefined];
}

/** The lines without their doc-comment markers, or `null` if they are not all doc comments. */
function stripDocComments(lines: string[]): string[] | null {
    const marker = /^\s*\/\/[/!] ?/;
    const content = lines.filter((line) => line.trim());
    if (!content.length || !content.every((line) => marker.test(line))) return null;
    return lines.map((line) => line.replace(marker, ''));
}

function dedent(lines: string[]): string[] {
    const indents = lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length);
    const indent = Math.min(...indents, Infinity);
    return indent && indent != Infinity ? lines.map((l) => l.slice(indent)) : lines;
}

/** Expands every file-reference fence in a raw document, for the plain-text LLM endpoints. */
export function expandFileRefs(source: string, documentPath: string, root: string): string {
    return source.replace(
        /^```(\w*)\n(\{[^\n]*\})\n```$/gm,
        (whole, lang: string, body: string) => {
            if (!isFileRef(body)) return whole;
            const ref = resolveFileRef(body, documentPath, root, lang);
            return `From \`${ref.repoPath}\`, lines ${ref.start}–${ref.end}:\n\n\`\`\`${ref.lang}\n${ref.code}\n\`\`\``;
        },
    );
}
