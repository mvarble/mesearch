// The types SvelteKit generates as `./$types` for a route in a project, which a route shipped in
// this package has none of: the same shapes, with parameters left as strings.
import type { Load, RequestHandler as KitRequestHandler, ServerLoad } from '@sveltejs/kit';

type Params = Record<string, string>;

export type EntryGenerator = () => Params[] | Promise<Params[]>;
export type PageServerLoad = ServerLoad<Params>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PageLoad = Load<Params, any>;
export type RequestHandler = KitRequestHandler<Params>;
