import path from 'node:path';

// The repository the site documents, which file references quote from: the parent of `site/`,
// where the build runs. Resolved from the working directory rather than `import.meta.dirname`,
// because the prerendered `.md` endpoints run this module from inside the bundled server output.
export const REPO_ROOT = path.resolve(process.cwd(), '..');
