import bibtex from 'bibtex';

import type { Citation } from '../resolvers/citation.ts';
import type { SourceFile } from './source.ts';
import type { Store } from './store.ts';

// Every entry of a `.bib` file, into the bibliography. Keys are site-wide.
export function readBibliography(store: Store, file: SourceFile, collection = 'citations') {
    const entries = store.collection<Citation>(collection);
    let parsed;
    try {
        parsed = bibtex.parseBibFile(file.raw);
    } catch (error) {
        store.error(file.id, `${file.id}: the bibliography does not parse.\n${error}`);
        return;
    }
    for (const [key, entry] of Object.entries(parsed.entries$)) {
        const field = (name: string) => {
            const value = entry.getFieldAsString(name);
            return value === undefined ? undefined : detex(String(value));
        };
        const existing = sources.get(store)?.get(key);
        if (existing && existing != file.id) {
            store.error(file.id, `${file.id}: '${key}' is also in ${existing}; this one wins.`);
        }
        if (!sources.has(store)) sources.set(store, new Map());
        sources.get(store)!.set(key, file.id);
        entries.set(key, {
            kind: entry.type,
            key,
            title: field('title') ?? '',
            year: field('year') ?? '',
            doi: field('doi'),
            publisher: field('publisher'),
            issn: field('issn'),
            isbn: field('isbn'),
            journal: field('journal'),
            number: field('number'),
            pages: field('pages'),
            volume: field('volume'),
            institution: field('institution'),
            edition: field('edition'),
            url: field('url'),
            series: field('series'),
            authors: (entry.getAuthors()?.authors$ ?? []).map((author) => ({
                lastname: detex(String(author.lastNames$.at(-1))),
                fullname: detex(fullname(author)),
            })),
        });
    }
}

// Which file each key came from, per build, to report a key defined twice.
const sources = new WeakMap<Store, Map<string, string>>();

function fullname(name: bibtex.AuthorName): string {
    const append = (str: string, add: string) => `${str.trim()} ${add.trim()}`;
    let out = name.firstNames.join(' ');
    out = append(out, name.vons.join(' '));
    out = append(out, name.lastNames.join(' '));
    out = append(out, name.jrs.join(' '));
    return out;
}

const ACCENTS: Record<string, string> = {
    '"': '\u0308',
    "'": '\u0301',
    '`': '\u0300',
    '^': '\u0302',
    '~': '\u0303',
    '=': '\u0304',
    '.': '\u0307',
    c: '\u0327',
    v: '\u030c',
    u: '\u0306',
    H: '\u030b',
};

const LETTERS: Record<string, string> = {
    ss: 'ß',
    o: 'ø',
    O: 'Ø',
    l: 'ł',
    L: 'Ł',
    ae: 'æ',
    AE: 'Æ',
    oe: 'œ',
    OE: 'Œ',
    aa: 'å',
    AA: 'Å',
    i: 'ı',
};

// BibTeX's text as a reader sees it: `{\"u}` is ü, `{\ss}` is ß, and braces
// that only protect capitals go. Math, between dollar signs, is left alone.
export function detex(text: string): string {
    return text
        .split(/(\$[^$]*\$)/g)
        .map((part, i) =>
            i % 2
                ? part
                : part
                      .replace(
                          /\\(["'`^~=.]|[cvuH](?![a-zA-Z]))\s*\{?([a-zA-Z]|\\i)\}?/g,
                          (_, accent, letter) =>
                              ((letter == '\\i' ? 'i' : letter) + ACCENTS[accent]!).normalize(
                                  'NFC',
                              ),
                      )
                      .replace(
                          /\\(ss|ae|AE|oe|OE|aa|AA|o|O|l|L|i)(?![a-zA-Z])\s?/g,
                          (_, name) => LETTERS[name]!,
                      )
                      .replace(/[{}]/g, '')
                      .replace(/---/g, '—')
                      .replace(/--/g, '–'),
        )
        .join('')
        .replace(/\s+/g, ' ')
        .trim();
}
