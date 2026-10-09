import type { RootContent } from 'mdast';

import type { SourceFile } from '../core/source.ts';
import type { Store } from '../core/store.ts';

// Prose as the presets need it outside a rendered page: summaries for previews,
// titles taken from headings, and reading times.

// A reference as a preview shows it: as the page renders it, without the link.
export function referenceText(store: Store, doc: string) {
    return (url: string, text: string): string | undefined => {
        const [, scheme, written] = /^(cite|statement|eq):(.+)$/.exec(url) ?? [];
        if (!scheme || !written) return undefined;
        const resolver = { cite: 'citation', statement: 'statement', eq: 'equation' }[scheme]!;
        const target = store.ref(doc, resolver, written)?.target as
            { label: string; kind?: string; full?: string } | undefined;
        if (!target) return text;
        if (resolver == 'citation')
            return text ? `[${target.label}, ${text}]` : `[${target.label}]`;
        if (resolver == 'equation') return `(${target.label})`;
        return text
            .replaceAll('%label', target.label)
            .replaceAll('%kind', target.kind ?? '')
            .replaceAll('%full', target.full ?? '');
    };
}

export function firstHeading(file: SourceFile): string | undefined {
    const heading = file.mdast.children.find((node) => node.type == 'heading');
    return heading ? plainText([heading]) : undefined;
}

// Prose as a reader would see it in a preview: inline math keeps its `$`s so
// that it can be rendered, everything else is flattened to text. `link` may
// say what a link reads as instead of its own text.
export function plainText(
    nodes: RootContent[],
    link?: (url: string, text: string) => string | undefined,
): string {
    const text = (node: RootContent): string => {
        if (node.type == 'inlineMath') return `$${node.value}$`;
        if (node.type == 'link' && link) {
            const own = node.children.map(text).join('');
            return link(node.url, own) ?? own;
        }
        if (node.type == 'text' || node.type == 'inlineCode') return node.value;
        if (node.type == 'html' || node.type == 'yaml' || node.type == 'code') return '';
        if ('children' in node) return (node.children as RootContent[]).map(text).join('');
        return '';
    };
    return nodes
        .map(text)
        .join('\n\n')
        .replace(/[ \t]*\n[ \t]*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

export function wordCount(nodes: RootContent[]): number {
    const text = nodes
        .filter((node) => node.type != 'yaml' && node.type != 'html')
        .map((node) => plainText([node]))
        .join(' ');
    return text.split(/\s+/).filter(Boolean).length;
}
