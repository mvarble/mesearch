import type { Plugin } from 'unified';

// GitHub-style alerts, so that the raw `.svx` stays plain Markdown (which is what `llms-full.txt`
// serves) while the rendered page gets a styled box:
//
//     > [!NOTE]
//     > Body text.
//
//     > [!DECISION] Why conditioning belongs to the query
//     > Body text.
//
// Anything after the marker on its first line becomes the title. The old remark that mdsvex runs
// parses `[!NOTE]` as either text or an undefined shortcut `linkReference`, so both are accepted.

export const CALLOUTS = {
    NOTE: 'Note',
    TIP: 'Tip',
    WARNING: 'Warning',
    DECISION: 'Design decision',
    TODO: 'TODO',
} as const;

type Kind = keyof typeof CALLOUTS;

// The loose mdast shape of remark 8, which predates the typings this package installs.
interface Node {
    type: string;
    value?: string;
    label?: string;
    children?: Node[];
    data?: Record<string, unknown>;
}

const MARKER = /^\[!([A-Z]+)\][ \t]*/;

function takeMarker(paragraph: Node): { kind: Kind; title: string } | null {
    const children = paragraph.children ?? [];
    const first = children[0];
    if (!first) return null;

    let kind: string | undefined;
    if (first.type == 'text' && first.value) {
        const match = MARKER.exec(first.value);
        if (!match) return null;
        kind = match[1];
        first.value = first.value.slice(match[0].length);
    } else if (first.type == 'linkReference' && first.label?.startsWith('!')) {
        kind = first.label.slice(1);
        children.shift();
    }
    if (!kind || !(kind in CALLOUTS)) return null;

    // The title is whatever remains of the first line.
    let title = '';
    const head = children[0];
    if (head?.type == 'text' && head.value !== undefined) {
        const newline = head.value.indexOf('\n');
        const line = newline < 0 ? head.value : head.value.slice(0, newline);
        title = line.trim();
        head.value = newline < 0 ? '' : head.value.slice(newline + 1);
        if (!head.value) children.shift();
    }
    return { kind: kind as Kind, title };
}

export const remarkCallouts: Plugin<[]> = () => {
    return (tree) => {
        const visit = (node: Node) => {
            for (const child of node.children ?? []) {
                if (child.type == 'blockquote') {
                    const paragraph = child.children?.[0];
                    const marker = paragraph?.type == 'paragraph' ? takeMarker(paragraph) : null;
                    if (marker && paragraph) {
                        if (!paragraph.children?.length) child.children!.shift();
                        const label = CALLOUTS[marker.kind];
                        child.data = {
                            ...(child.data ?? {}),
                            hName: 'aside',
                            hProperties: {
                                className: ['callout', `callout-${marker.kind.toLowerCase()}`],
                            },
                        };
                        child.children!.unshift({
                            type: 'paragraph',
                            data: { hProperties: { className: ['callout-title'] } },
                            children: [
                                {
                                    type: 'text',
                                    value: marker.title ? `${label}: ${marker.title}` : label,
                                },
                            ],
                        });
                    }
                }
                visit(child);
            }
        };
        visit(tree as Node);
    };
};
