import type { ParamMatcher } from '@sveltejs/kit';

// The folders documents live in, which are also the first segment of a URL.
export const match: ParamMatcher = (param) =>
    param == 'concepts' || param == 'writeups' || param == 'sequences';
