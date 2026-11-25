// The example's structure: `docsSite()` reads it to lay out the content, and the app to build the
// navigation.

export const SITE = {
    name: 'example',
    tagline: 'A documentation site with a document of every kind.',
    description: 'The documentation site of @mvarble/mesearch-workflow, built from a fixture.',
    repo: 'https://github.com/mvarble/mesearch',
    branch: 'main',
    version: '0.0.0',
} as const;

export const TRACKS = [
    { id: 'start', title: 'Start here', short: 'Start', blurb: 'What the example is.' },
    { id: 'guide', title: 'Guide', short: 'Guide', blurb: 'From what a user writes.' },
    { id: 'concepts', title: 'Concepts', short: 'Concepts', blurb: 'From the foundations.' },
    { id: 'reference', title: 'Reference', short: 'Reference', blurb: 'What to look up.' },
];

export const MATH = {
    id: 'math',
    title: 'Mathematics',
    short: 'Math',
    blurb: 'The mathematics the example rests on, read in order.',
};

export const MATH_PARTS = [
    { id: 'geometry', title: 'Geometry', blurb: 'Manifolds and their charts.' },
    { id: 'probability', title: 'Probability', blurb: 'Densities on them.' },
];

export const ARCHIVE = {
    id: 'archive',
    title: 'Archive',
    short: 'Archive',
    blurb: 'How each part came to be, kept as it was approved.',
};

export const DOCUMENTS = [
    { name: 'math', title: 'Mathematics' },
    { name: 'writeup', title: 'Writeup' },
    { name: 'implementation', title: 'Implementation' },
    { name: 'plan', title: 'Plan' },
] as const;

export const NAV = { mathBefore: undefined };
