import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { toAbsolute } from '../../core/paths.ts';

export interface Dates {
    created: Date;
    updated: Date;
}

// When a document's folder was first and last changed, by id of the folder.
export type DateProvider = (folder: string) => Dates | undefined;

interface Span {
    first: Date;
    last: Date;
}

// Dates from the git history of everything under `dir`, falling back to file
// modification times for whatever git knows nothing about.
//
// One `git log` call covers the whole directory. A folder's dates are the
// earliest and latest commits that touched any file in it --- assets and
// components included, since editing a figure is editing the document. A folder
// with uncommitted changes counts as updated now-ish, by its newest mtime. A
// checkout resets every mtime, so mtimes are only ever a last resort.
export function gitDates(root: string, dir: string): DateProvider {
    const spans = new Map<string, Span>();
    const dirty = new Set<string>();
    try {
        const run = (...args: string[]) =>
            execFileSync('git', args, {
                cwd: root,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'ignore'],
                maxBuffer: 64 * 1024 * 1024,
            });
        // Paths in git's output are relative to the repository's top level,
        // which need not be the project root.
        const prefix = run('rev-parse', '--show-prefix').trim();
        const strip = (file: string) =>
            file.startsWith(prefix) ? file.slice(prefix.length) : undefined;

        let when: Date | undefined;
        for (const line of run(
            'log',
            '--format=%x00%cI',
            '--name-only',
            '--no-renames',
            '--',
            dir,
        ).split('\n')) {
            if (line.startsWith('\0')) {
                when = new Date(line.slice(1));
            } else if (line && when) {
                const file = strip(line);
                if (!file) continue;
                // Newest commits come first, so the first sighting is the last
                // change and every later one pushes the first change back.
                const span = spans.get(file);
                if (span) span.first = when;
                else spans.set(file, { first: when, last: when });
            }
        }
        for (const line of run('status', '--porcelain', '--', dir).split('\n')) {
            const file = strip(line.slice(3).trim());
            if (file) dirty.add(file);
        }
    } catch {
        // Not a repository, or no git: every date comes from the filesystem.
    }

    return (folder) => {
        const within = (file: string) => file == folder || file.startsWith(folder + '/');
        let first: Date | undefined;
        let last: Date | undefined;
        for (const [file, span] of spans) {
            if (!within(file)) continue;
            if (!first || span.first < first) first = span.first;
            if (!last || span.last > last) last = span.last;
        }
        const mtimes = folderTimes(root, folder);
        if ([...dirty].some(within) && mtimes) last = mtimes.updated;
        if (!first || !last) return mtimes;
        return { created: first, updated: last > first ? last : first };
    };
}

// The oldest birth time and newest modification time of anything in a folder.
function folderTimes(root: string, folder: string): Dates | undefined {
    const abs = toAbsolute(root, folder);
    let created: Date | undefined;
    let updated: Date | undefined;
    const visit = (file: string) => {
        const stat = fs.statSync(file);
        if (stat.isDirectory()) {
            for (const entry of fs.readdirSync(file)) visit(path.join(file, entry));
            return;
        }
        const born = stat.birthtimeMs > 0 ? stat.birthtime : stat.mtime;
        if (!created || born < created) created = born;
        if (!updated || stat.mtime > updated) updated = stat.mtime;
    };
    try {
        visit(abs);
    } catch {
        return undefined;
    }
    return created && updated ? { created, updated } : undefined;
}
