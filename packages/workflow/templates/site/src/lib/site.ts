// The site's structure: `docsSite()` reads it to lay out the content, and the app to build the
// navigation. `$site` in the app is this module, with defaults for what it leaves out.

export const SITE = {
    name: '{{name}}',
    tagline: 'What {{name}} is, in a sentence.',
    description: 'What {{name}} is, in a paragraph.',
    repo: 'https://github.com/<owner>/<repo>',
    branch: 'main',
    version: '0.0.0',
} as const;

// The tracks of pages, in reading order: a page belongs to the track named by its folder under
// `content/`, and is placed within it by its `order`.
export const TRACKS = [
    { id: 'start', title: 'Start here', short: 'Start', blurb: 'What {{name}} is.' },
    { id: 'reference', title: 'Reference', short: 'Reference', blurb: 'What to look up.' },
];

export const MATH = {
    id: 'math',
    title: 'Mathematics',
    short: 'Math',
    blurb: 'The mathematics {{name}} rests on, one idea to a note.',
};

export const ARCHIVE = {
    id: 'archive',
    title: 'Archive',
    short: 'Archive',
    blurb: 'How each part came to be, kept as it was approved.',
};

// The documents an archive entry may hold, in the order they are written: one per stage that
// writes one in `workflow.config.ts`.
export const DOCUMENTS = [
    { name: 'writeup', title: 'Writeup' },
    { name: 'plan', title: 'Plan' },
] as const;
