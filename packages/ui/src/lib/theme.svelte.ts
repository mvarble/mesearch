// The reader's theme: 'light', 'dark', or 'system' to follow the device.
// `THEME_SCRIPT`, inlined in the page's `<head>`, applies the stored choice
// before the first paint; `theme` keeps it applied afterwards and tracks the
// device while following it. The theme is `data-theme` on `<html>`, and a page
// read without JavaScript keeps the light theme it ships with.

export type ThemeChoice = 'system' | 'light' | 'dark';

const KEY = 'mesearch:theme';

function stored(): ThemeChoice {
    try {
        const value = localStorage.getItem(KEY);
        return value == 'light' || value == 'dark' ? value : 'system';
    } catch {
        return 'system';
    }
}

// For `app.html`: paste inside a `<script>` in the `<head>`, before anything
// that paints. It also adds the `js` class that the `needs-js` utility uses.
export const THEME_SCRIPT = `(function () {
    var root = document.documentElement;
    var theme;
    root.classList.add('js');
    try {
        theme = localStorage.getItem('${KEY}');
    } catch (e) {}
    if (theme !== 'light' && theme !== 'dark') {
        theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    root.dataset.theme = theme;
})();`;

class Theme {
    #started = false;
    choice = $state<ThemeChoice>('system');
    systemDark = $state(false);
    resolved = $derived<'light' | 'dark'>(
        this.choice == 'system' ? (this.systemDark ? 'dark' : 'light') : this.choice,
    );

    start() {
        if (this.#started) return;
        this.#started = true;
        this.choice = stored();
        const query = matchMedia('(prefers-color-scheme: dark)');
        this.systemDark = query.matches;
        query.addEventListener('change', (event) => (this.systemDark = event.matches));
        $effect.root(() => {
            $effect(() => {
                document.documentElement.dataset.theme = this.resolved;
            });
        });
    }

    // Light and dark, in turn: every click changes what the page shows. A
    // choice that matches the device's own setting is not remembered, so
    // from then on the page follows the device again.
    toggle() {
        const next = this.resolved == 'dark' ? 'light' : 'dark';
        this.choice = next == (this.systemDark ? 'dark' : 'light') ? 'system' : next;
        try {
            if (this.choice == 'system') localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, this.choice);
        } catch {
            // Private browsing: the choice lasts as long as the page.
        }
    }
}

export const theme = new Theme();
