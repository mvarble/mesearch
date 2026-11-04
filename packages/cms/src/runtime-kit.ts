// What a preset's runtime module --- the one exporting `bind(snapshot)` --- and
// the browser may import: nothing here reads the filesystem or parses markdown.
export { live } from './runtime.ts';
export { buildOutline, type Heading, type OutlineEntry } from './model/outline.ts';
export { citationLabel, type Citation, type CitationAuthor } from './resolvers/citation.ts';
export type { StatementInjection } from './core/statements.ts';
