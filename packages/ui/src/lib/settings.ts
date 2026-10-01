// What the components need to know about the site that is not data: the
// language dates are written in, and what each kind of document is called.
// A site sets these once, before rendering, with `configure`.

export interface Settings {
    lang: string;
    // Labels by kind. A kind with no label here is shown capitalised.
    kinds: Record<string, string>;
}

export const settings: Settings = {
    lang: 'en',
    kinds: { concept: 'Concept', writeup: 'Writeup', sequence: 'Sequence', post: 'Post' },
};

export function configure(given: Partial<Settings>) {
    if (given.lang) settings.lang = given.lang;
    if (given.kinds) settings.kinds = { ...settings.kinds, ...given.kinds };
    formatter = undefined;
}

let formatter: Intl.DateTimeFormat | undefined;

export function formatDate(date: Date): string {
    formatter ??= new Intl.DateTimeFormat(settings.lang, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        timeZone: 'UTC',
    });
    return formatter.format(date);
}

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

export const kindLabel = (kind: string) =>
    settings.kinds[kind] ?? kind.slice(0, 1).toUpperCase() + kind.slice(1);

// A title as plain text: inline math loses its dollar signs.
export const plain = (text: string) => text.replace(/\$([^$]+)\$/g, '$1');
