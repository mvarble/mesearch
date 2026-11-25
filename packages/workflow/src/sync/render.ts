// The managed documents, filled in from a project's `workflow.config.ts`: its name, its kinds and
// their stages, what each stage opens, and what approval asks.
import type { Area, WorkflowConfig } from '../engine/config.ts';

const CONTENT = (config: WorkflowConfig) => config.content ?? 'site/content';
const code = (text: string) => `\`${text}\``;
const article = (word: string) => (/^[aeiou]/.test(word) ? `an ${word}` : `a ${word}`);

// "a, b or c".
function either(items: string[]): string {
    return items.length < 2
        ? (items[0] ?? '')
        : `${items.slice(0, -1).join(', ')} or ${items.at(-1)}`;
}

// A Markdown table with its columns padded, as Prettier writes one.
function table(head: string[], rows: string[][]): string {
    const widths = head.map((cell, i) =>
        Math.max(cell.length, ...rows.map((row) => row[i]!.length)),
    );
    const line = (cells: string[]) =>
        `| ${cells.map((cell, i) => cell.padEnd(widths[i]!)).join(' | ')} |`;
    return [
        line(head),
        `| ${widths.map((w) => '-'.repeat(w)).join(' | ')} |`,
        ...rows.map(line),
    ].join('\n');
}

const stagesOf = (config: WorkflowConfig) => Object.keys(config.stages);

// What the stages the engine knows by name produce, where the config does not say.
const DEFAULTS: Record<string, string> = {
    build: "the code, committed as the plan's boxes are ticked",
    publish: "the pages that say what now _is_, and the entry's `index.md`, linked to them",
};
const skillOf = (config: WorkflowConfig, stage: string) =>
    config.stages[stage]?.skill ?? `/wf-${stage}`;
const openers = (config: WorkflowConfig, area: Area) =>
    stagesOf(config).filter((stage) => config.stages[stage]!.unlocks?.includes(area));

// "`math` (or `writeup`)".
function openedAt(stages: string[]): string {
    const [first, ...rest] = stages.map(code);
    return rest.length ? `${first} (or ${either(rest)})` : (first ?? '');
}

function fill(text: string, values: Record<string, string>): string {
    return text.replace(/\{\{([a-z-]+)\}\}/g, (whole, name: string) => values[name] ?? whole);
}

function common(config: WorkflowConfig): Record<string, string> {
    const kinds = Object.keys(config.kinds);
    return {
        project: config.project,
        content: CONTENT(config),
        kinds: kinds.join('|'),
        'kinds-list': either(kinds.map(article)),
        'kinds-describe': Object.entries(config.kinds)
            .map(
                ([kind, { stages, describe }]) =>
                    `   - **${kind}** (${stages.map(code).join(' → ')}): ${describe}`,
            )
            .join('\n'),
    };
}

export function renderSkill(text: string, config: WorkflowConfig): string {
    return fill(text, common(config));
}

export function renderWorkflow(text: string, config: WorkflowConfig): string {
    const content = CONTENT(config);
    const math = config.math === false ? undefined : `${content}/${config.math ?? 'math'}/`;
    const stages = stagesOf(config);
    const documents = stages.filter((stage) => config.stages[stage]!.document);

    const areas: string[] = [];
    const mathAt = openers(config, 'math');
    if (math && mathAt.length)
        areas.push(`The math notes (${code(math)}) open at ${openedAt(mathAt)}`);
    const codeAt = openers(config, 'code');
    if (codeAt.length) {
        const what = config.describe?.code ? ` (${config.describe.code})` : '';
        areas.push(`the code${what} at ${openedAt(codeAt)}`);
    }
    const pagesAt = openers(config, 'pages');
    if (pagesAt.length) {
        areas.push(`the pages (the rest of ${code(`${content}/`)}) at ${openedAt(pagesAt)}`);
    }
    let areaText =
        `${areas.join('; ')}. Without an active entry, code is closed and the rest is open for ` +
        'housekeeping.';
    areaText = areaText.slice(0, 1).toUpperCase() + areaText.slice(1);
    if (config.free?.length) {
        const free = config.describe?.free ?? config.free.map(code).join(', ');
        areaText +=
            ` ${free.slice(0, 1).toUpperCase()}${free.slice(1)} ${config.free.length > 1 ? 'are' : 'is'} ` +
            'always open, so that a fact can be recorded the moment it is known.';
    }

    const gates = ['a document that is uncommitted, empty, or still has a `> [!TODO]`'];
    for (const stage of stages) {
        const { sections = [], checklist } = config.stages[stage]!;
        for (const section of sections) {
            gates.push(`${article(code(stage))} document without a \`## ${section}\` section`);
        }
        if (checklist) gates.push(`${article(code(stage))} document without a checklist`);
    }
    if (stages.includes('build')) gates.push('a build with unticked boxes or uncommitted work');
    gates.push(
        "a publish whose changed pages are not listed in the entry's `pages`, or whose changes to " +
            'done entries are not listed in its `amends`',
    );
    const checked = Object.keys(config.checks ?? {});
    if (checked.length) {
        gates.push(
            `and, at ${either(checked.map(code))}, whatever the project's own checks in ` +
                '`workflow.config.ts` find',
        );
    }

    const kinds = table(
        ['kind', 'stages', 'for'],
        Object.entries(config.kinds).map(([kind, { stages, describe }]) => [
            code(kind),
            stages.map(code).join(' → '),
            describe,
        ]),
    );
    const stageRows = table(
        ['stage', 'skill', 'produces'],
        stages.map((stage) => {
            const { document, describe } = config.stages[stage]!;
            const produces =
                describe ?? (document ? code(`${stage}.md`) : (DEFAULTS[stage] ?? '—'));
            return [code(stage), code(skillOf(config, stage)), produces];
        }),
    );

    return fill(text, {
        ...common(config),
        'kinds-table': kinds,
        'stages-table': stageRows,
        areas: areaText,
        gates: `${gates.join('; ')}.`,
        documents: documents.map(code).join(', '),
    });
}
