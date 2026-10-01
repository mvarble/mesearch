import site from '$site';

const dates = new Intl.DateTimeFormat(site.lang, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
});

export const formatDate = (date: Date) => dates.format(date);

export const isoDate = (date: Date) => date.toISOString().slice(0, 10);

const KIND_LABELS = { concept: 'Concept', writeup: 'Writeup', sequence: 'Sequence' } as const;
export const kindLabel = (kind: keyof typeof KIND_LABELS) => KIND_LABELS[kind];

// A title as plain text: inline math loses its dollar signs.
export const plain = (text: string) => text.replace(/\$([^$]+)\$/g, '$1');

// A site path under the configured base, always with a trailing slash.
export const href = (pathname: string) => `${site.base}/${pathname ? pathname + '/' : ''}`;
