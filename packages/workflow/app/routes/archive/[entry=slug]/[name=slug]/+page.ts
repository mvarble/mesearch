import { withComponent } from '../../../../lib/load';
import type { PageLoad } from '../../../../lib/kit';

export const load: PageLoad = ({ data }) => withComponent(data);
