import { MediaQuery } from 'svelte/reactivity';
import { Persisted } from './persisted.svelte';

import { THEME_KEY } from '$site';

// Copied from the blog. The key (`<site name>:theme`, unless `src/lib/site.ts` sets `THEME_KEY`)
// must match the inline script in `app.html`, which applies the theme before first paint.
export { THEME_KEY };

class Theme {
    #preference = new Persisted<'system' | 'light' | 'dark'>(THEME_KEY, 'system');
    #query = new MediaQuery('prefers-color-scheme: dark');
    #system = $derived<'dark' | 'light'>(this.#query.current ? 'dark' : 'light');

    get current() {
        return this.#preference.current === 'system' ? this.#system : this.#preference.current;
    }

    set current(value: 'light' | 'dark') {
        this.#preference.current = value === this.#system ? 'system' : value;
    }
}

export const theme = new Theme();
