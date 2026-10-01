import type { Plugin } from 'unified';
import type { Root, Element, ElementContent, RootContent } from 'hast';

const isDisplayMath = (node: RootContent): node is Element =>
    node.type == 'element' &&
    node.tagName == 'div' &&
    Array.isArray(node.properties?.className) &&
    node.properties.className.includes('math-display');

const div = (className: string, children: ElementContent[]): Element => ({
    type: 'element',
    tagName: 'div',
    properties: { className: [className] },
    children,
});

// A display equation is one unbreakable box: on a narrow screen it either
// overflows the page or gets clipped. Wrapping it in a scroll container lets the
// equation slide sideways on its own while the prose around it stays put.
const scrollBox = (math: Element) => div('math-scroll-container', [div('math-container', [math])]);

// The KaTeX markup of a `\tag`, cut out of the rendered equation so that it can
// sit beside the scroll box rather than scroll away with the equation.
//
// The equation reaches here as the `{@html "..."}` text node `rehypeKatex`
// leaves, so this works on the escaped string: it finds the tag's opening span,
// walks to the span that closes it, and drops the tag's first child --- a
// `katex-strut` that sizes the line for the equation it no longer sits in.
function liftTag(math: Element): string | undefined {
    const text = math.children[0];
    if (math.children.length != 1 || text?.type != 'text' || !text.value.startsWith('{@html')) {
        return undefined;
    }
    const start = text.value.indexOf('<span class=\\"katex-tag\\"');
    if (start <= 0) return undefined;

    const rest = text.value.slice(start);
    let length = 0;
    let depth = 0;
    let strutStart = 0;
    let strutStop = 0;
    while (length < rest.length) {
        if (rest.slice(length, length + 5) === '<span') {
            if (depth == 1 && strutStart == 0) strutStart = length;
            depth++;
            length += 5;
            while (length < rest.length && rest[length] !== '>') length++;
            length++;
        } else if (rest.slice(length, length + 7) === '</span>') {
            depth--;
            length += 7;
            if (strutStart != 0 && strutStop == 0) strutStop = length;
            if (depth === 0) break;
        } else {
            length++;
        }
    }

    text.value = text.value.slice(0, start) + text.value.slice(start + length);
    return rest.slice(0, strutStart) + rest.slice(strutStop, length);
}

export interface MathBoxOptions {
    /** Move a `\tag` out of the scroll box, so the number stays in view. */
    liftTags?: boolean;
}

export const rehypeMathBox: Plugin<[MathBoxOptions?], Root> = (options = {}) => {
    return (tree) => {
        const stack: Array<Root | Element> = [tree];
        while (stack.length > 0) {
            const children = stack.pop()!.children;
            for (let i = 0; i < children.length; i++) {
                const child = children[i]!;
                if (child.type != 'element') continue;
                // The wrapper is not descended into: it still contains the
                // display-math node, and revisiting it would wrap it again,
                // forever.
                if (!isDisplayMath(child)) {
                    stack.push(child);
                    continue;
                }
                const tag = options.liftTags ? liftTag(child) : undefined;
                const box = scrollBox(child);
                children[i] = tag
                    ? div('math-tag-container', [
                          box,
                          div('math-tag', [{ type: 'text', value: `{@html "${tag}"}` }]),
                      ])
                    : box;
            }
        }
    };
};
