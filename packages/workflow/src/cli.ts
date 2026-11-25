#!/usr/bin/env node
// `mesearch-wf`: sets a repository up for documented development, and keeps what is this
// package's in it up to date. Run it anywhere in the repository; it works on the repository's
// root. `bin/wf`, which it writes, is the workflow's own command line.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

import { CONFIG_FILE } from './engine/config.ts';

import { init } from './sync/init.ts';
import { outdated, sync, version, type SyncReport } from './sync/index.ts';

const USAGE = `usage: mesearch-wf <command>

  init [--force]   set the repository up: workflow.config.ts, AGENTS.md, the project's
                   conventions, the guard hook, a documentation site where there is none,
                   and then sync; what exists is kept, unless --force
  sync             write what is @mvarble/mesearch-workflow's: bin/wf and the engine, the
                   wf-* skills, .agents/reference/mesearch/, the site's shared routes
  diff             list what sync would change, and fail if anything; for CI
  version          the version that sync writes`;

// The project: the nearest directory up from here with a `workflow.config.ts`, else the git
// repository's root, else here.
function repoRoot(): string {
    for (let dir = process.cwd(); ; dir = path.dirname(dir)) {
        if (fs.existsSync(path.join(dir, CONFIG_FILE))) return dir;
        if (dir == path.dirname(dir)) break;
    }
    try {
        return execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
    } catch {
        return process.cwd();
    }
}

function print(report: SyncReport & { skipped?: string[] }) {
    for (const rel of report.written) console.log(`  wrote    ${rel}`);
    for (const rel of report.updated) console.log(`  updated  ${rel}`);
    for (const rel of report.removed) console.log(`  removed  ${rel} (no longer shipped)`);
    for (const rel of report.kept) console.log(`  kept     ${rel} (changed here)`);
    for (const rel of report.skipped ?? [])
        console.log(`  kept     ${rel} (exists; --force to overwrite)`);
}

async function main(argv: string[]): Promise<number> {
    const [command, ...flags] = argv;
    const root = repoRoot();
    switch (command) {
        case 'init':
            print(await init(root, { force: flags.includes('--force') }));
            console.log(
                `\nmesearch-wf: ${path.basename(root)} is set up. \`bin/wf status\` says where it stands.`,
            );
            return 0;
        case 'sync': {
            const report = await sync(root);
            print(report);
            const changed = report.written.length + report.updated.length + report.removed.length;
            console.log(
                changed
                    ? `\nmesearch-wf: synced to ${version()}.`
                    : `mesearch-wf: up to date with ${version()}.`,
            );
            return 0;
        }
        case 'diff': {
            const stale = await outdated(root);
            if (!stale.length) {
                console.log(`mesearch-wf: up to date with ${version()}.`);
                return 0;
            }
            console.error(
                `mesearch-wf: ${stale.length} managed files differ from ${version()}; run \`mesearch-wf sync\`:`,
            );
            for (const rel of stale) console.error(`  ${rel}`);
            return 1;
        }
        case 'version':
            console.log(version());
            return 0;
        default:
            console.log(USAGE);
            return command && command != 'help' && command != '--help' ? 2 : 0;
    }
}

main(process.argv.slice(2)).then(
    (code) => (process.exitCode = code),
    (error: Error) => {
        console.error(`mesearch-wf: ${error.message}`);
        process.exitCode = 1;
    },
);
