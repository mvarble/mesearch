export interface OpenQuestion {
    title: string;
    href: string;
}

// A heading's anchor, as `.agents/reference/authoring.md` says the content database makes it.
const anchor = (heading: string) =>
    heading
        .toLowerCase()
        .replace(/\$/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

// The `[!TODO]` callouts in a Markdown source: each is a question that keeps a stage from being
// approved. A callout has no anchor of its own, so a question links to the heading above it. The
// marker is matched as `tools/wf/lib.ts` matches it, so the two count the same questions.
export function questionsIn(source: string, href: string): OpenQuestion[] {
    const questions: OpenQuestion[] = [];
    let heading: string | undefined;
    const lines = source.split('\n');
    lines.forEach((line, i) => {
        const title = /^#{2,3}\s+(.*)$/.exec(line)?.[1];
        if (title) heading = title;
        const todo = /^>\s*\[!TODO\]\s*(.*)$/.exec(line);
        if (!todo) return;
        const body = /^>\s*(.*)$/.exec(lines[i + 1] ?? '')?.[1];
        questions.push({
            title: todo[1] || body || 'An open question',
            href: heading ? `${href}#${anchor(heading)}` : href,
        });
    });
    return questions;
}
