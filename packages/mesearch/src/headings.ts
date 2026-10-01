import type { Root, Element } from 'hast';

// A document's `#` is a section of the page, whose only `<h1>` is the title
// in its header --- so every heading in a document is rendered one level
// down: `#` as `<h2>`, `##` as `<h3>`, and so on, `######` staying `<h6>`.
export const rehypeDemoteHeadings = () => (tree: Root) => {
    const stack: Array<Root | Element> = [tree];
    while (stack.length) {
        for (const child of stack.pop()!.children) {
            if (child.type != 'element') continue;
            const level = /^h([1-6])$/.exec(child.tagName)?.[1];
            if (level) child.tagName = `h${Math.min(6, Number(level) + 1)}`;
            stack.push(child);
        }
    }
};
