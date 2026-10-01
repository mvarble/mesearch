// Builds the blog preset against a fixture tree and returns everything
// position-dependent that it produced, in the shape the original SQLite-backed
// content layer's tests read back out of its database --- so that those tests
// port over with their expectations untouched.
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildStore } from '../src/core/build.ts';
import { blogPreset } from '../src/presets/blog/index.ts';

const here = path.dirname(fileURLToPath(import.meta.url));

export const fixtureRoot = (name) => path.join(here, 'fixtures', name);

export function buildFixture(fixtureName = 'content') {
    const store = buildStore({ root: fixtureRoot(fixtureName), preset: blogPreset() });
    return { store, ...readSnapshot(store) };
}

const by =
    (...keys) =>
    (a, b) => {
        for (const key of keys) {
            if (a[key] < b[key]) return -1;
            if (a[key] > b[key]) return 1;
        }
        return 0;
    };

function readSnapshot(store) {
    const anchors = [...store.anchors.values()];
    const sequencePages = [];
    const flatten = (children) =>
        children.forEach((child, item) => {
            sequencePages.push({
                slug: child.slug,
                title: child.title,
                item,
                label: child.label ?? null,
                appendix: child.appendix,
                pathname: child.pathname,
            });
            flatten(child.children);
        });
    for (const sequence of store.collection('sequences').values()) flatten(sequence.children);

    const refs = (resolver) =>
        [...store.docs.keys()].flatMap((source) =>
            store
                .refsOf(source)
                .filter((ref) => ref.resolver == resolver)
                .map((ref) => ({ source, ...ref })),
        );

    return {
        statements: anchors
            .filter((a) => a.kind == 'statement')
            .map((a) => ({ slug: a.slug, kind: a.data.kind, label: a.label, pathname: a.page }))
            .sort(by('slug')),
        equations: anchors
            .filter((a) => a.kind == 'equation')
            .map((a) => ({ slug: a.slug, label: a.label, pathname: a.page }))
            .sort(by('slug')),
        sequencePages: sequencePages.sort(by('pathname')),
        pages: [...store.pages.keys()].sort().map((pathname) => ({ pathname })),
        headings: [...store.docs.values()]
            .flatMap((doc) => doc.headings.map((h, item) => ({ filename: doc.id, item, ...h })))
            .sort(by('filename', 'item')),
        statementRefs: refs('statement')
            .map(({ source, written, target }) => ({
                source,
                ref: written,
                slug: target.slug,
                kind: target.kind.toLowerCase(),
                label: target.label,
                targetScope: target.scope,
            }))
            .sort(by('source', 'ref')),
        equationRefs: refs('equation')
            .map(({ source, written, target }) => ({
                source,
                ref: written,
                slug: target.slug,
                label: target.label,
            }))
            .sort(by('source', 'ref')),
    };
}
