import type { ParamMatcher } from '@sveltejs/kit';

import { TRACKS } from '$site';

export const match: ParamMatcher = (param) => TRACKS.some((track) => track.id == param);
