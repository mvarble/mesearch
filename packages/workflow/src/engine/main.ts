// The entry point `bin/wf` runs, from `.workflow/engine/` in a project: it loads the project's
// `workflow.config.ts` with Node alone (its imports are types, which Node strips), so it works
// before anything is installed.
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { run } from './cli.ts';
import { CONFIG_FILE, type WorkflowConfig } from './config.ts';
import { repoRoot, WorkflowError } from './lib.ts';

const argv = process.argv.slice(2);
// Only the hook reads stdin, and it is always given one.
const stdin = argv[0] == 'guard' ? fs.readFileSync(0, 'utf8') : undefined;

let root: string;
try {
    root = repoRoot(process.cwd());
} catch (error) {
    if (!(error instanceof WorkflowError)) throw error;
    process.stderr.write(`wf: ${error.message}\n`);
    process.exit(1);
}
const file = path.join(root, CONFIG_FILE);
if (!fs.existsSync(file)) {
    // The guard runs before every edit, in any repository the hook is set for: without a config
    // there are no rules to keep.
    if (argv[0] == 'guard') process.exit(0);
    process.stderr.write(
        `wf: ${CONFIG_FILE} is missing at ${root}; \`mesearch-wf init\` writes one.\n`,
    );
    process.exit(1);
}
const config = ((await import(pathToFileURL(file).href)) as { default: WorkflowConfig }).default;
const result = run(argv, { cwd: process.cwd(), stdin, config });
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
process.exitCode = result.code;
