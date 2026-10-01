// The reader's theme: 'light', 'dark', or 'system' to follow the device.
// `app.html` applies the stored choice before the first paint; this keeps it
// applied afterwards and tracks the device while following it.

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

class Theme {
    choice = $state<ThemeChoice>('system');
    systemDark = $state(false);
    resolved = $derived<'light' | 'dark'>(
        this.choice == 'system' ? (this.systemDark ? 'dark' : 'light') : this.choice,
    );

    start() {
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

    // system → light → dark → system.
    cycle() {
        this.choice =
            this.choice == 'system' ? 'light' : this.choice == 'light' ? 'dark' : 'system';
        try {
            if (this.choice == 'system') localStorage.removeItem(KEY);
            else localStorage.setItem(KEY, this.choice);
        } catch {
            // Private browsing: the choice lasts as long as the page.
        }
    }
}

export const theme = new Theme();
