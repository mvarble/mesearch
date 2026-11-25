// Files a package hands an agent-written project and keeps up to date: agent skills, and the
// documents they point at. A *managed* folder is the package's rather than the project's. It is
// replaced whole whenever it differs from what the package ships, so that a file a newer version
// no longer has does not linger. Everything else in the project is left alone.
//
// `@mvarble/mesearch` installs its `explain` skill with this, and `@mvarble/mesearch-workflow`
// its workflow's skills and reference documents.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// A folder's files, by path relative to it, with `/` as the separator.
export type Files = Map<string, string>;

// What an install did, by path relative to the project.
export interface InstallReport {
    written: string[];
    updated: string[];
    kept: string[];
}

// Where harnesses look for a project's skills. `.agents/skills/` is the Agent Skills convention,
// which most read. Those that only read a directory of their own are given a link to each skill
// there.
export const SKILLS_DIR = '.agents/skills';
export const LINKED_SKILLS_DIRS = ['.claude/skills'];

// `dist/agents.js` sits one directory below the package root, beside `agents/`.
const packageDir = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '..');

// The conventions for what this package resolves: mathematics, numbered equations, statements
// and proofs, and citations. A package that ships skills hands each a copy, beside its own
// conventions for the site's layout.
export const MARKUP_FILE = 'markup.md';
export const markupPath = path.join(packageDir, 'agents', MARKUP_FILE);
export const markup = (): string => fs.readFileSync(markupPath, 'utf8');

// Brings each folder in `folders` (by path relative to `dir`) to exactly the files given.
export function installFolders(
    dir: string,
    folders: Map<string, Files>,
    report: InstallReport = emptyReport(),
): InstallReport {
    for (const [name, shipped] of folders) {
        const target = path.join(dir, name);
        const installed = readFolder(target);
        if (sameFiles(installed, shipped)) continue;
        writeFolder(target, shipped);
        if (installed) report.updated.push(`${name}/`);
        else for (const file of shipped.keys()) report.written.push(`${name}/${file}`);
    }
    return report;
}

// Installs each skill in `.agents/skills/<name>/`, and links it from each directory in
// `LINKED_SKILLS_DIRS`. A linked directory that is itself a link (`.claude/skills` pointing at
// `.agents/skills`, say) already shows every skill, and is left as it is.
export function installSkills(
    dir: string,
    skills: Map<string, Files>,
    options: { force?: boolean } = {},
    report: InstallReport = emptyReport(),
): InstallReport {
    for (const [skill, shipped] of skills) {
        const name = `${SKILLS_DIR}/${skill}`;
        const target = path.join(dir, name);
        const installed = readFolder(target);
        const stale = !sameFiles(installed, shipped);
        installFolders(dir, new Map([[name, shipped]]), report);

        for (const linkedDir of LINKED_SKILLS_DIRS) {
            if (
                fs.lstatSync(path.join(dir, linkedDir), { throwIfNoEntry: false })?.isSymbolicLink()
            ) {
                continue;
            }
            const name = `${linkedDir}/${skill}`;
            const link = path.join(dir, name);
            const stat = fs.lstatSync(link, { throwIfNoEntry: false });
            if (stat && !stat.isSymbolicLink()) {
                // A folder is somebody's own, unless it is the copy made below where links
                // cannot be: that one follows what it was copied from.
                if (installed && sameFiles(readFolder(link), installed)) {
                    if (!stale) continue;
                    writeFolder(link, shipped);
                    report.updated.push(`${name}/`);
                } else report.kept.push(name);
                continue;
            }
            // A link already points at the folder brought up to date above.
            if (stat && !options.force) continue;
            if (stat) fs.unlinkSync(link);
            fs.mkdirSync(path.dirname(link), { recursive: true });
            try {
                fs.symlinkSync(path.relative(path.dirname(link), target), link, 'dir');
            } catch {
                // Where links cannot be made (Windows without the privilege), a copy.
                fs.cpSync(target, link, { recursive: true });
            }
            report.written.push(name);
        }
    }
    return report;
}

// The folders in `dir` that differ from what is shipped: the ones an install would replace. A
// folder the project does not have at all is not among them, since a project need not be
// written by agents.
export function outdatedFolders(dir: string, folders: Map<string, Files>): string[] {
    return [...folders]
        .filter(([name, shipped]) => {
            const installed = readFolder(path.join(dir, name));
            return installed && !sameFiles(installed, shipped);
        })
        .map(([name]) => name);
}

// The skills in `dir` that differ from what is shipped, as `.agents/skills/<name>`.
export function outdatedSkills(dir: string, skills: Map<string, Files>): string[] {
    return outdatedFolders(
        dir,
        new Map([...skills].map(([skill, files]) => [`${SKILLS_DIR}/${skill}`, files])),
    );
}

// A shipped folder's files: what is on disk under `source`, plus any `extra` (a shared document
// every skill is given a copy of, say).
export function filesOf(source: string, extra: Record<string, string> = {}): Files {
    const files: Files = new Map(
        listFiles(source).map((name) => [name, fs.readFileSync(path.join(source, name), 'utf8')]),
    );
    for (const [name, contents] of Object.entries(extra)) files.set(name, contents);
    return files;
}

// A folder's files by name, or nothing if it is not a folder.
export function readFolder(dir: string): Files | undefined {
    if (!fs.statSync(dir, { throwIfNoEntry: false })?.isDirectory()) return undefined;
    return filesOf(dir);
}

// Line endings aside: a checkout that converts them has changed nothing.
export function sameFiles(a: Files | undefined, b: Files): boolean {
    const text = (contents?: string) => contents?.replaceAll('\r\n', '\n');
    return (
        !!a &&
        a.size == b.size &&
        [...b].every(([name, theirs]) => text(a.get(name)) === text(theirs))
    );
}

// Replaces a folder with exactly these files.
export function writeFolder(dir: string, files: Files) {
    fs.rmSync(dir, { recursive: true, force: true });
    for (const [name, contents] of files) {
        const file = path.join(dir, name);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, contents);
    }
}

// Every file under `dir`, by path relative to it.
export function listFiles(dir: string, prefix = ''): string[] {
    return fs
        .readdirSync(dir, { withFileTypes: true })
        .toSorted((a, b) => a.name.localeCompare(b.name))
        .flatMap((entry) => {
            const name = prefix ? `${prefix}/${entry.name}` : entry.name;
            return entry.isDirectory() ? listFiles(path.join(dir, entry.name), name) : [name];
        });
}

export const emptyReport = (): InstallReport => ({ written: [], updated: [], kept: [] });
