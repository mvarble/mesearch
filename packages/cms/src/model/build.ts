// Where every position-dependent label on the site is decided.
//
// Labels used to be computed in four places at once -- a running `item` and
// `itemPrefix` threaded through the markdown walk, a prefix-change reset in the
// sequence loop, an appendix-lettering block inside the sequence insert, and a
// `${label}.${i}` string built during the page-tree recursion. Nothing in that
// arrangement could be read, or tested, without a database underneath it.
//
// Both rules live here instead, as plain functions over plain data.

// A page of a sequence, as far as labelling is concerned.
export interface PageTree {
    // Pages from the first appendix onwards are lettered rather than numbered.
    appendix: boolean;
    children?: PageTree[];
}

// Labels for the pages of a sequence, keyed by the page.
//
// Top-level pages count from zero. From the first one marked as an appendix
// they switch to letters restarting at 'A', so a sequence of four pages whose
// last is an appendix reads '0', '1', '2', 'A'. A nested page extends its
// parent's label, making the second child of page 1 '1.1'.
export type PageLabels = ReadonlyMap<PageTree, string>;

export function labelPages(children: readonly PageTree[]): PageLabels {
    const labels = new Map<PageTree, string>();
    let appendixStart: number | undefined = undefined;
    for (let i = 0; i < children.length; i++) {
        const child = children[i]!;
        if (child.appendix && appendixStart === undefined) appendixStart = i;
        const label =
            appendixStart === undefined
                ? String(i)
                : String.fromCharCode('A'.charCodeAt(0) + i - appendixStart);
        labelDescendants(labels, child, label);
    }
    return labels;
}

function labelDescendants(labels: Map<PageTree, string>, node: PageTree, label: string) {
    labels.set(node, label);
    (node.children ?? []).forEach((child, i) => labelDescendants(labels, child, `${label}.${i}`));
}

// The single counter behind every statement and equation label.
//
// Statements and equations share one run of numbers, in the order a reader
// meets them, so a page whose first two items are an equation and a statement
// labels them 0 and 1 -- not 0 and 0. Inside an enumerated sequence the page's
// own label prefixes that number, giving '3.0', '3.1', and so on.
export class Numbering {
    private item = 0;
    private prefix: string | undefined;

    // `prefix` is the label of the first page to be numbered: the sequence root
    // carries '0' when the sequence is enumerated, and a post carries none.
    //
    // Written out rather than as a constructor parameter property, which emits
    // code and so cannot be stripped: keeping this file free of anything but
    // types is what lets the tests import it without a build step.
    constructor(prefix?: string) {
        this.prefix = prefix;
    }

    // Move on to the page labelled `label`, restarting the count if that is a
    // different prefix from the page before.
    //
    // The reset is keyed on the prefix rather than on the page because of a
    // quirk that is load-bearing for already-published content: an enumerated
    // sequence's root and its first child both carry the label '0', so the
    // child continues the root's run instead of restarting at '0.0'. A page
    // with no label -- every page of an unenumerated sequence -- never resets,
    // leaving one continuous count across the whole sequence.
    enter(label: string | undefined) {
        if (typeof label == 'string' && label != this.prefix) {
            this.item = 0;
            this.prefix = label;
        }
    }

    // The label for the next statement or equation, consuming a number.
    next(): string {
        const item = this.item++;
        return typeof this.prefix == 'string' ? `${this.prefix}.${item}` : `${item}`;
    }
}
