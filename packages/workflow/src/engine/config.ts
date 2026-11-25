// What a project says about its workflow, in `workflow.config.ts` at the root of its repository:
// its kinds of entry, their stages, what each stage opens for editing, and what counts as its
// code. Everything else (the stage machine, the locks, the guard, amendments, `check`) is the
// engine's, and the same in every project.
//
// The engine runs from `.workflow/engine/`, vendored into the project, before anything is
// installed, so the config must load under Node alone: it may import types from this package
// (they are erased), and nothing else from `node_modules`.

// The parts of a repository that open at a stage. `entry` (the entry's own folder) is open from
// the start, and anything that is none of these is open always.
export type Area = 'math' | 'code' | 'pages';

export interface StageConfig {
    // Written as a document of its own, `<stage>.md` (or `.svx`) in the entry's folder, which is
    // frozen once the stage is approved.
    document?: boolean;
    // What the stage opens, for the rest of the entry's life.
    unlocks?: Area[];
    // The skill that works on the stage; `/wf-<stage>` by default.
    skill?: string;
    // Headings the document must have before it is approved, as `## Tests`.
    sections?: string[];
    // The document is a checklist: it needs one, its boxes are ticked at a later stage without
    // reopening it, its hash ignores the ticks, and the stage that ticks them is approved only once
    // every box is ticked.
    checklist?: boolean;
    // Later stages at which the document may still be edited (a plan's boxes, ticked at `build`).
    editableDuring?: string[];
    // A sentence for the reference documents: what the stage is for.
    describe?: string;
}

export interface KindConfig {
    stages: string[];
    // A sentence for `wf-start` and the reference documents: when an entry is of this kind.
    describe: string;
}

// What a project's own check at a stage is given.
export interface CheckContext {
    root: string;
    slug: string;
    // The entry's `index.md`, by path from the root, and its text.
    index: string;
    text: string;
    // Every path the branch changed, when there is a base to compare with.
    changed?: string[];
    // A list field of the entry's frontmatter.
    list(field: string): string[] | undefined;
}

export interface WorkflowConfig {
    // How the project is named in skills and messages: "skoro", "the box".
    project: string;
    // The documentation's content directory, from the root.
    content?: string;
    // The math notes' directory within `content`, or `false` for a project without them.
    math?: string | false;
    // What counts as the project's code: changed only once an entry reaches a stage that unlocks
    // `code`.
    code: RegExp[];
    // Paths (prefixes, from the root) open at every stage, such as a ledger kept as it is learned.
    free?: string[];
    // How the reference documents name the code and the paths always open, in prose, since the
    // patterns read poorly: "`crates/`, `Cargo.*`".
    describe?: { code?: string; free?: string };
    kinds: Record<string, KindConfig>;
    stages: Record<string, StageConfig>;
    // Frontmatter `start` writes into a new entry's `index.md` beside `title` and `pages`, as
    // field → YAML value.
    entryFields?: Record<string, string>;
    // Kinds whose publish need not change a documentation page.
    pagesOptional?: string[];
    // The home page's prose, by name within `content`.
    landing?: string;
    // The project's own conditions for approving a stage, beside the engine's. Each returns its
    // problems, as sentences.
    checks?: Partial<Record<string, (context: CheckContext) => string[]>>;
}

// A config is written as
//
//     import type { WorkflowConfig } from '@mvarble/mesearch-workflow';
//     export default { project: 'skoro', ... } satisfies WorkflowConfig;
//
// with a type-only import, so that it loads before the package is installed.
export const CONFIG_FILE = 'workflow.config.ts';
