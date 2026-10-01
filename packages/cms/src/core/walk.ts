import { unified } from 'unified';
import rehypeParse from 'rehype-parse';
import { visit } from 'unist-util-visit';
import { fromJs } from 'esast-util-from-js';
import type { RootContent as RemarkContent } from 'mdast';
import type { RootContent as RehypeContent } from 'hast';
import type { Node as EstreeNode, ImportDeclaration } from 'estree';

import type { Heading } from '../model/outline.ts';
import { headingSlugs } from '../model/outline.ts';
import type { SourceFile } from './source.ts';
import { resolveId } from './paths.ts';

const rehype = unified().use(rehypeParse);

// `<Statement {...x} />`, which mdsvex leaves in the text of a paragraph rather
// than as HTML.
const componentRegex = /<(\w+)\s+\{\.\.\.(\w+)\}\s*(\/?)>/g;

// The document being walked, and where its contents end up.
export interface WalkTarget {
    doc: string;
    scope: string;
    // The page it is shown on, and the document that owns that page.
    page: string;
    host: string;
}

export interface WalkOptions {
    // A math block, in reading order.
    onMath?(tex: string, target: WalkTarget): void;
    // A document this one renders inline, by id: an imported `.svx` used as an
    // element, or one spread into a component that `isComponent` accepts.
    onImport?(id: string, target: WalkTarget): void;
    // Whether an import specifier, written in `from`, is the component whose
    // spread props pull in another document.
    isComponent?(specifier: string, from: string): boolean;
}

// Walks a document in reading order --- through the markdown, into raw HTML,
// and down into the documents it renders --- so that anything numbered on the
// way is numbered in the order a reader meets it.
export function walkDocument(file: SourceFile, target: WalkTarget, options: WalkOptions) {
    type Node =
        { kind: 'remark'; source: RemarkContent } | { kind: 'rehype'; source: RehypeContent };
    const nodes: Node[] = [];
    const imports: Record<string, string> = {};
    const remarkNodes = (children: RemarkContent[]) =>
        children.toReversed().map((source) => ({ kind: 'remark', source }) as Node);
    const rehypeNodes = (children: RehypeContent[]) =>
        children.toReversed().map((source) => ({ kind: 'rehype', source }) as Node);

    nodes.push(...remarkNodes(file.mdast.children));

    while (nodes.length > 0) {
        const typed = nodes.pop()!;

        if (typed.kind == 'remark') {
            const node = typed.source;
            if ('children' in node && Array.isArray(node.children) && node.children.length) {
                nodes.push(...remarkNodes(node.children as RemarkContent[]));
            }
            if (node.type == 'html') {
                nodes.push(...rehypeNodes(rehype.parse(node.value).children));
            }
            if (node.type == 'math') options.onMath?.(node.value, target);

            // Components that mdsvex does not see as HTML. A spread of an
            // imported document into the statement component renders it.
            if (node.type == 'text') {
                for (const [, component, prop] of node.value.matchAll(componentRegex)) {
                    const componentPath = imports[component!];
                    const propPath = imports[prop!];
                    if (
                        componentPath &&
                        propPath &&
                        options.isComponent?.(componentPath, file.id)
                    ) {
                        options.onImport?.(resolveId(file.id, propPath), target);
                    }
                }
            }
        } else {
            const node = typed.source;
            if ('children' in node && Array.isArray(node.children) && node.children.length) {
                nodes.push(...rehypeNodes(node.children as RehypeContent[]));
            }
            collectImports(node, imports);
            if (node.type == 'element') {
                const componentPath = imports[node.tagName];
                if (componentPath && componentPath.endsWith('.svx')) {
                    options.onImport?.(resolveId(file.id, componentPath), target);
                }
            }
        }
    }
}

// The default and namespace imports of a `<script>` block that could name a
// document or a component, by local name.
function collectImports(node: RehypeContent, imports: Record<string, string>) {
    if (
        node.type != 'element' ||
        node.tagName != 'script' ||
        node.children.length != 1 ||
        node.children[0]!.type != 'text'
    ) {
        return;
    }
    let program;
    try {
        program = fromJs(node.children[0]!.value, { module: true });
    } catch {
        // TypeScript, or a script still being typed. Neither can import a
        // document the content layer would need to number.
        return;
    }
    for (const statement of program.body) {
        visit(statement as never, 'ImportDeclaration', (found: EstreeNode) => {
            const declaration = found as ImportDeclaration;
            const source = declaration.source.value;
            const [specifier, ...rest] = declaration.specifiers;
            if (
                typeof source == 'string' &&
                source &&
                specifier &&
                rest.length == 0 &&
                (specifier.type == 'ImportDefaultSpecifier' ||
                    specifier.type == 'ImportNamespaceSpecifier')
            ) {
                imports[specifier.local.name] = source;
            }
        });
    }
}

export interface HeadingOptions {
    // The deepest heading collected.
    depth: number;
    // Keep inline math wrapped in `$`, so a table of contents can render it,
    // rather than as bare TeX.
    mathDelimiters?: boolean;
}

// A document's own top-level headings, with the slugs their rendered `id`s get.
//
// Only the document's own: a statement it imports is a theorem or a remark,
// whose content belongs to the page's numbering rather than to its outline.
export function parseHeadings(file: SourceFile, options: HeadingOptions): Heading[] {
    const headings: Omit<Heading, 'slug'>[] = [];
    for (const node of file.mdast.children) {
        if (node.type != 'heading' || node.depth > options.depth) continue;
        headings.push({ depth: node.depth, title: textOf(node, options.mathDelimiters ?? false) });
    }
    const slugs = headingSlugs(headings.map(({ title }) => title.replaceAll('$', '')));
    return headings.map((heading, item) => ({ ...heading, slug: slugs[item]! }));
}

// A heading's text as a reader sees it, near enough: inline markup contributes
// its own text, and anything without any --- an image, say --- contributes
// nothing. Math is left as its source.
function textOf(node: RemarkContent, delimit: boolean): string {
    if (node.type == 'inlineMath') return delimit ? `$${node.value}$` : node.value;
    if (node.type == 'text' || node.type == 'inlineCode') return node.value;
    if ('children' in node && Array.isArray(node.children)) {
        return (node.children as RemarkContent[]).map((child) => textOf(child, delimit)).join('');
    }
    return '';
}
