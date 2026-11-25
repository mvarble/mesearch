import type { WorkflowConfig } from '@mvarble/mesearch-workflow';

// The example's workflow: a feature's mathematics, its implementation, the plan, the build and
// the pages, as skoro has it.
export default {
    project: 'the example',
    code: [/^src\//],
    kinds: {
        feature: {
            stages: ['math', 'implementation', 'plan', 'build', 'publish'],
            describe: 'needs mathematics worked out',
        },
        decision: { stages: ['writeup', 'publish'], describe: 'an argued position' },
        chore: { stages: ['plan', 'build', 'publish'], describe: 'a refactor or a tooling change' },
    },
    stages: {
        math: { document: true, unlocks: ['math'] },
        implementation: { document: true, sections: ['Tests'] },
        plan: { document: true, checklist: true, editableDuring: ['build'] },
        build: { unlocks: ['code'] },
        publish: { unlocks: ['pages'] },
        writeup: { document: true, unlocks: ['math'] },
    },
    pagesOptional: ['chore'],
} satisfies WorkflowConfig;
