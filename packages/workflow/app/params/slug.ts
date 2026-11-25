import type { ParamMatcher } from '@sveltejs/kit';

// A document's folder name: never a dot in it, so that `/math/retraction.md` is the Markdown
// export and not a note named `retraction.md`.
export const match: ParamMatcher = (param) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(param);
