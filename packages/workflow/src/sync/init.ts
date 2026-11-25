// `mesearch-wf init`: sets a repository up for documented development. What is the project's own
// (its workflow config, AGENTS.md, its conventions, its site's structure and pages) is written only
// where nothing is already; then `sync` writes what is the package's.
import fs from 'node:fs';
import path from 'node:path';

import { listFiles } from '@mvarble/mesearch-cms/agents';

import { packageDir } from './site.ts';
import { sync, version, type SyncReport } from './index.ts';

const templatesDir = path.join(packageDir, 'templates');

// The guard every edit in Claude Code goes through.
const GUARD = {
    matcher: 'Edit|MultiEdit|Write|NotebookEdit',
    hooks: [{ type: 'command', command: '"$CLAUDE_PROJECT_DIR"/bin/wf guard' }],
};

export interface InitReport extends SyncReport {
    skipped: string[];
}

export async function init(root: string, options: { force?: boolean } = {}): Promise<InitReport> {
    const name = path.basename(path.resolve(root));
    const slug = name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    const fill = (text: string) =>
        text
            .replaceAll('{{name}}', name)
            .replaceAll('{{slug}}', slug)
            .replaceAll('{{version}}', version());
    const written: string[] = [];
    const skipped: string[] = [];

    // A site is the template's only where there is none: one that exists is the project's.
    const site = fs.existsSync(path.join(root, 'site'));
    for (const rel of listFiles(templatesDir)) {
        if (site && rel.startsWith('site/') && !options.force) continue;
        const file = path.join(root, rel);
        if (fs.existsSync(file) && !options.force) {
            skipped.push(rel);
            continue;
        }
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, fill(fs.readFileSync(path.join(templatesDir, rel), 'utf8')));
        written.push(rel);
    }
    if (addGuard(root)) written.push('.claude/settings.json');

    const report = await sync(root);
    return { ...report, written: [...written, ...report.written], skipped };
}

// Adds the guard to `.claude/settings.json`, keeping whatever else it holds. Returns whether it
// was added.
function addGuard(root: string): boolean {
    const file = path.join(root, '.claude/settings.json');
    const settings = fs.existsSync(file)
        ? (JSON.parse(fs.readFileSync(file, 'utf8')) as {
              hooks?: { PreToolUse?: { hooks?: { command?: string }[] }[] };
          })
        : {};
    const before = settings.hooks?.PreToolUse ?? [];
    if (
        before.some((entry) => entry.hooks?.some((hook) => hook.command?.includes('bin/wf guard')))
    ) {
        return false;
    }
    settings.hooks = { ...settings.hooks, PreToolUse: [...before, GUARD] };
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(settings, null, 4) + '\n');
    return true;
}
