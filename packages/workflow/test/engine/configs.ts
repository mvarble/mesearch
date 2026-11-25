// The two projects the engine was drawn from, as their configs: every behaviour either relied on
// is tested against the config that relies on it.
import fs from 'node:fs';
import path from 'node:path';

import type { CheckContext, WorkflowConfig } from '../../src/engine/config.ts';

// skoro's crate rules, as a project's own publish check: what an entry lists under `crates` exists
// and is what the branch changed, and every crate it changed is described.
const crateOf = (rel: string) => /^crates\/([^/]+)\//.exec(rel)?.[1];
const crateExists = (root: string, name: string) =>
    fs.existsSync(path.join(root, 'crates', name, 'Cargo.toml'));
const crateDescription = (name: string) => `site/content/reference/crates/${name}/index.md`;

function crateChecks({ root, index, changed, list }: CheckContext): string[] {
    const problems: string[] = [];
    const crates = list('crates') ?? [];
    for (const name of crates) {
        if (!crateExists(root, name))
            problems.push(`${index} lists crate '${name}', which does not exist.`);
    }
    if (!changed) return problems;
    const edited = new Set(changed.map(crateOf).filter((name) => name !== undefined));
    for (const name of edited) {
        if (!crateExists(root, name)) continue;
        if (!crates.includes(name)) {
            problems.push(
                `crate '${name}' changed on this branch; list it under \`crates\` in ${index}.`,
            );
        }
        if (!fs.existsSync(path.join(root, crateDescription(name)))) {
            problems.push(
                `crate '${name}' changed on this branch; describe it in ${crateDescription(name)}.`,
            );
        }
    }
    for (const name of crates) {
        if (!edited.has(name))
            problems.push(`${index} lists crate '${name}', which this branch did not change.`);
    }
    return problems;
}

export const SKORO = {
    project: 'skoro',
    code: [/^crates\//, /^Cargo\.(toml|lock)$/, /^rust-toolchain(\.toml)?$/],
    kinds: {
        feature: {
            stages: ['math', 'implementation', 'plan', 'build', 'publish'],
            describe: 'needs mathematics worked out',
        },
        decision: { stages: ['writeup', 'publish'], describe: 'an argued position' },
        chore: { stages: ['plan', 'build', 'publish'], describe: 'a port or a refactor' },
    },
    stages: {
        math: { document: true, unlocks: ['math'] },
        implementation: { document: true, sections: ['Tests'] },
        plan: { document: true, checklist: true, editableDuring: ['build'] },
        build: { unlocks: ['code'] },
        publish: { unlocks: ['pages'] },
        writeup: { document: true, unlocks: ['math'] },
    },
    entryFields: { crates: '[]' },
    pagesOptional: ['chore'],
    checks: { publish: crateChecks },
} satisfies WorkflowConfig;

export const BOX = {
    project: 'the box',
    code: [
        /^firmware\//,
        /^ros2_ws\//,
        /^host\//,
        /^system\//,
        /^calib\//,
        /^cad\//,
        /^docker\//,
        /^tools\/(?!wf\/)[^/]+\//,
    ],
    free: ['site/content/reference/open-questions/'],
    kinds: {
        milestone: {
            stages: ['plan', 'build', 'measure', 'publish'],
            describe: 'ends in measured numbers',
        },
        probe: { stages: ['measure', 'publish'], describe: 'one session at the bench' },
        decision: { stages: ['writeup', 'publish'], describe: 'an argued position' },
        chore: { stages: ['plan', 'build', 'publish'], describe: 'nothing to measure' },
    },
    stages: {
        plan: { document: true, unlocks: ['math'], checklist: true, editableDuring: ['build'] },
        build: { unlocks: ['code'] },
        measure: { document: true, sections: ['Results'] },
        publish: { unlocks: ['pages'] },
        writeup: { document: true, unlocks: ['math'] },
    },
    pagesOptional: ['chore'],
} satisfies WorkflowConfig;
