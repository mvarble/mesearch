import fs from 'node:fs';
import path from 'node:path';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkFrontmatter from 'remark-frontmatter';
import remarkMath from 'remark-math';
import type { Root } from 'mdast';

import { parseFrontmatter } from './frontmatter.ts';
import { toAbsolute, toId } from './paths.ts';

const remark = unified().use(remarkParse).use(remarkFrontmatter).use(remarkMath);

// A file the content layer read, parsed at most once however many passes look
// at it.
export class SourceFile {
    readonly id: string;
    readonly abs: string;
    readonly raw: string;
    private parsedFrontmatter?: Record<string, unknown>;
    private frontmatterError?: unknown;
    private tree?: Root;

    constructor(root: string, id: string, raw?: string) {
        this.id = id;
        this.abs = toAbsolute(root, id);
        this.raw = raw ?? fs.readFileSync(this.abs, 'utf8');
    }

    get isMarkdown() {
        return this.id.endsWith('.svx') || this.id.endsWith('.md');
    }

    // Malformed YAML is reported once, by whoever first asks, and then reads as
    // an empty mapping so that the rest of the site still builds.
    get frontmatter(): Record<string, unknown> {
        if (this.parsedFrontmatter) return this.parsedFrontmatter;
        try {
            this.parsedFrontmatter = this.isMarkdown ? parseFrontmatter(this.raw) : {};
        } catch (error) {
            this.frontmatterError = error;
            this.parsedFrontmatter = {};
        }
        return this.parsedFrontmatter;
    }

    get frontmatterProblem(): string | undefined {
        void this.frontmatter;
        if (!this.frontmatterError) return undefined;
        const message =
            this.frontmatterError instanceof Error
                ? this.frontmatterError.message
                : String(this.frontmatterError);
        return `${this.id}: the frontmatter does not parse.\n${message}`;
    }

    get mdast(): Root {
        return (this.tree ??= remark.parse(this.raw));
    }
}

// What a site's content is made of: every file under `dir` that `include`
// accepts, by id, in a stable order. Sorting keeps processing order --- and so
// every label and every last-writer-wins registration --- reproducible.
export function scan(root: string, dir: string, include: (id: string) => boolean): string[] {
    const base = path.resolve(root, dir);
    if (!fs.existsSync(base)) return [];
    return (fs.readdirSync(base, { recursive: true, withFileTypes: true }) as fs.Dirent[])
        .filter((entry) => entry.isFile())
        .map((entry) => toId(root, path.join(entry.parentPath, entry.name)))
        .filter(
            (id) => !id.split('/').some((part) => part == 'node_modules' || part.startsWith('.')),
        )
        .filter(include)
        .sort();
}
