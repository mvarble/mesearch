import path from 'node:path';
import yaml from 'js-yaml';

import type { KatexMacros } from '@mvarble/mesearch-markdown/katex';

import { slugFromFilename, toId } from './paths.ts';

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;

// The YAML at the top of a document, or an empty mapping when there is none.
// Dates come back as `Date`s, which is what the readers below expect.
export function parseFrontmatter(source: string): Record<string, unknown> {
    const match = FRONTMATTER.exec(source);
    if (!match) return {};
    const data = yaml.load(match[1]!);
    if (data == null || typeof data != 'object' || Array.isArray(data)) return {};
    return data as Record<string, unknown>;
}

// Everything after the frontmatter block.
export const stripFrontmatter = (source: string) => source.replace(FRONTMATTER, '');

const isDate = (value: unknown): value is Date =>
    value instanceof Date && !Number.isNaN(value.valueOf());

// Documents of every kind describe themselves with overlapping frontmatter
// fields. A reader collects every problem it finds instead of stopping at the
// first, so one save reports everything wrong with a document, each message
// naming the file and the field.
export class Frontmatter {
    readonly problems: string[] = [];
    readonly filename: string;
    private readonly data: Record<string, unknown>;
    private readonly kind: string;
    private readonly root: string;

    // `filename` is relative to `root`, the way every document is identified.
    constructor(root: string, filename: string, data: unknown, kind: string) {
        this.root = root;
        this.filename = filename;
        this.data = data && typeof data == 'object' ? (data as Record<string, unknown>) : {};
        this.kind = kind;
    }

    reject(field: string, expected: string) {
        this.problems.push(
            `${this.filename}: ${this.kind} field \`${field}\` must be ${expected}.`,
        );
    }

    has(field: string): boolean {
        return field in this.data && this.data[field] !== undefined;
    }

    raw(field: string): unknown {
        return this.data[field];
    }

    requiredString(field: string): string {
        const value = this.data[field];
        if (typeof value != 'string' || !value) {
            this.reject(field, 'a non-empty string');
            return '';
        }
        return value;
    }

    optionalString(field: string): string | undefined {
        if (!this.has(field)) return undefined;
        return this.requiredString(field) || undefined;
    }

    requiredDate(field: string): Date {
        const value = this.data[field];
        if (!isDate(value)) {
            this.reject(field, 'a date');
            return new Date(0);
        }
        return value;
    }

    optionalDate(field: string): Date | undefined;
    optionalDate(field: string, fallback: Date): Date;
    optionalDate(field: string, fallback?: Date): Date | undefined {
        if (!this.has(field)) return fallback;
        return this.requiredDate(field);
    }

    optionalBoolean(field: string, fallback: boolean): boolean {
        if (!this.has(field)) return fallback;
        const value = this.data[field];
        if (typeof value != 'boolean') {
            this.reject(field, 'a boolean');
            return fallback;
        }
        return value;
    }

    optionalStrings(field: string): string[] | undefined {
        if (!this.has(field)) return undefined;
        const value = this.data[field];
        // A lone string is a list of one: `depends_on: foo` reads as it is meant.
        if (typeof value == 'string' && value) return [value];
        if (!Array.isArray(value) || value.some((item) => typeof item != 'string')) {
            this.reject(field, 'a list of strings');
            return undefined;
        }
        return value as string[];
    }

    optionalArray(field: string): unknown[] | undefined {
        if (!this.has(field)) return undefined;
        const value = this.data[field];
        if (!Array.isArray(value)) {
            this.reject(field, 'an array');
            return undefined;
        }
        return value;
    }

    katexMacros(): KatexMacros {
        const value = this.data.katex_macros ?? this.data.katexMacros;
        if (!value || typeof value != 'object') return {};
        return value as KatexMacros;
    }

    // Defaults to the filename, or to the directory name for an `index` file,
    // which is what most documents rely on.
    slug(): string {
        const value = this.data.slug;
        if (typeof value == 'string' && value) return value;
        return slugFromFilename(this.filename);
    }

    // A path written relative to the document, as a document id.
    optionalPath(field: string): string | undefined {
        if (!this.has(field)) return undefined;
        const value = this.data[field];
        if (typeof value != 'string') {
            this.reject(field, 'a string path');
            return undefined;
        }
        const absolute = path.resolve(this.root, path.dirname(this.filename), value);
        return toId(this.root, absolute);
    }

    valid(): boolean {
        return this.problems.length == 0;
    }
}
