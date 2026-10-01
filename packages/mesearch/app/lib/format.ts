import site from '$site';

export { plain } from '@mvarble/mesearch-ui';

// A site path under the configured base, always with a trailing slash.
export const href = (pathname: string) => `${site.base}/${pathname ? pathname + '/' : ''}`;
