// What a site adds to the shared pages, exported as `hooks` from its `src/lib/server/site.ts`:
//
//     import type { SiteHooks } from '@mvarble/mesearch-workflow';
//     export const hooks: SiteHooks = { entryChanges: (entry) => [...] };
import type { SiteDocument, SiteEntry } from './preset/types.ts';

// A document as the Markdown exports see it: its `<script>` block, and its file on disk.
export interface MarkdownContext {
    doc: SiteDocument;
    script: string;
    file: string;
}

export interface ChangeLink {
    href: string;
    label: string;
    /** Set the label in the monospace face, as a crate's name. */
    code?: boolean;
}

// A list an entry's page shows under "What it changed", after its pages.
export interface ChangeGroup {
    /** The sentence before the list: "The crates it changed:". */
    intro: string;
    links: ChangeLink[];
}

export interface SiteHooks {
    /** What an entry changed besides its pages, as skoro lists the crates a branch touched. */
    entryChanges?(entry: SiteEntry): ChangeGroup[];
    /**
     * Rewrites of a document's body for its Markdown export (`/<key>.md`, `llms-full.txt`), run in
     * order after `<ModelGraph>` is described and before statements are quoted: replace a
     * component of the site's own with text a reader without a browser can follow.
     */
    markdown?: ((body: string, context: MarkdownContext) => string)[];
}
