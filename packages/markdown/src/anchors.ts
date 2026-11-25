import type { Element, Root } from 'hast';
import type { Plugin } from 'unified';

// Gives every `h2`/`h3` that has an `id` a trailing `#` link to itself. The ids, and the table of
// contents they match, come from the content database (`cms.remark`), which numbers them the way
// the outline it serves does.
export const rehypeHeadingAnchors: Plugin<[]> = () => {
    return (tree) => {
        const visit = (node: Root | Element) => {
            for (const child of node.children) {
                if (child.type != 'element') continue;
                const id = child.properties?.id;
                if ((child.tagName == 'h2' || child.tagName == 'h3') && typeof id == 'string') {
                    child.children.push({
                        type: 'element',
                        tagName: 'a',
                        properties: {
                            className: ['heading-anchor'],
                            href: `#${id}`,
                            ariaLabel: 'Link to this section',
                        },
                        children: [{ type: 'text', value: '#' }],
                    });
                    continue;
                }
                visit(child);
            }
        };
        visit(tree as Root);
    };
};
