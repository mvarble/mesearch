import { navigation, siteOrigin } from '@mvarble/mesearch-workflow/app/lib/nav.ts';

export const load = () => ({ nav: navigation(), origin: siteOrigin() });
