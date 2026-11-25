import type { WorkflowConfig } from '@mvarble/mesearch-workflow';

// This project's workflow: the kinds of entry, their stages, and what counts as its code. The
// engine (`bin/wf`) and the skills read it; `mesearch-wf sync` writes the reference documents
// from it. It loads before anything is installed, so it imports nothing but types.
export default {
    project: '{{name}}',
    code: [/^src\//],
    describe: { code: '`src/`' },
    kinds: {
        feature: {
            stages: ['plan', 'build', 'publish'],
            describe: 'something new, planned, built and documented',
        },
        decision: { stages: ['writeup', 'publish'], describe: 'a position, argued in prose' },
        chore: {
            stages: ['plan', 'build', 'publish'],
            describe: 'a refactor or a tooling change, with nothing new to document',
        },
    },
    stages: {
        plan: {
            document: true,
            checklist: true,
            editableDuring: ['build'],
            describe: '`plan.md`: a checklist the build works through',
        },
        build: { unlocks: ['code'], describe: 'the code, committed as the boxes are ticked' },
        publish: {
            unlocks: ['pages'],
            describe: "the pages that say what now _is_, and the entry's `index.md`",
        },
        writeup: {
            document: true,
            unlocks: ['math'],
            describe: "`writeup.md`: a decision's argument",
        },
    },
    pagesOptional: ['chore'],
} satisfies WorkflowConfig;
