// The theme's colours as plain strings, for whatever cannot read CSS
// variables itself: a plotting library such as Plotly, a canvas, WebGL.
// `palette` is reactive state that follows `data-theme` on `<html>` and the
// variables the stylesheets set, a project's overrides included, so an effect
// that draws with it draws again when the reader switches theme.
//
// Markup and styles need none of this: `var(--series-1)` already follows the
// theme. On the server, `palette` holds the light theme's defaults from
// `styles/tokens.css`, as a page read without JavaScript shows; in the
// browser, a variable the styles have not set yet keeps its default for the
// theme in use.

export interface ThemePalette {
    theme: 'light' | 'dark';
    // Paper and ink: the page, a raised surface such as a card or a chart,
    // and a sunken one; text, softer text, labels, and the faintest marks.
    paper: string;
    paperRaised: string;
    paperSunken: string;
    ink: string;
    inkSoft: string;
    muted: string;
    faint: string;
    // Hairlines, such as gridlines, and stronger ones, such as axes.
    rule: string;
    ruleStrong: string;
    accent: string;
    accentSoft: string;
    // The colour of each kind of document.
    concept: string;
    writeup: string;
    sequence: string;
    // Colours for a chart's series, to be used in this order (`--series-1`
    // to `--series-8`).
    series: string[];
    // Typefaces, as `font-family` lists: body text, the interface, and code.
    fontBody: string;
    fontUi: string;
    fontMono: string;
}

type Colour = Exclude<keyof ThemePalette, 'theme' | 'series'>;

// The variable behind each colour and typeface.
const VARIABLES: Record<Colour, string> = {
    paper: '--paper',
    paperRaised: '--paper-raised',
    paperSunken: '--paper-sunken',
    ink: '--ink',
    inkSoft: '--ink-soft',
    muted: '--muted',
    faint: '--faint',
    rule: '--rule',
    ruleStrong: '--rule-strong',
    accent: '--accent',
    accentSoft: '--accent-soft',
    concept: '--concept',
    writeup: '--writeup',
    sequence: '--sequence',
    fontBody: '--font-body',
    fontUi: '--font-ui',
    fontMono: '--font-mono',
};

const SERIES = 8;

const FONTS = {
    fontBody: "'Source Serif 4 Variable', 'Source Serif Pro', Georgia, 'Times New Roman', serif",
    fontUi: "'Inter Variable', Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
    fontMono: "'Fira Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
};

// The values in `styles/tokens.css`, for when the stylesheets cannot be read.
export const DEFAULT_PALETTES: Record<'light' | 'dark', Readonly<ThemePalette>> = {
    light: {
        theme: 'light',
        paper: '#f9f8f3',
        paperRaised: '#fefdf9',
        paperSunken: '#f0efe6',
        ink: '#1a1d1c',
        inkSoft: '#343a38',
        muted: '#626a63',
        faint: '#9aa096',
        rule: '#e2e2d6',
        ruleStrong: '#cbcdbd',
        accent: '#3d3a8c',
        accentSoft: 'rgba(61, 58, 140, 0.09)',
        concept: '#24668f',
        writeup: '#9a3a63',
        sequence: '#3d7046',
        series: [
            '#2a78d6',
            '#eb6834',
            '#1baf7a',
            '#eda100',
            '#e87ba4',
            '#008300',
            '#4a3aa7',
            '#e34948',
        ],
        ...FONTS,
    },
    dark: {
        theme: 'dark',
        paper: '#12141c',
        paperRaised: '#181b25',
        paperSunken: '#0d0f15',
        ink: '#e7e6df',
        inkSoft: '#c9c9c0',
        muted: '#969a95',
        faint: '#666a6b',
        rule: '#262a38',
        ruleStrong: '#383e54',
        accent: '#a9a8f0',
        accentSoft: 'rgba(169, 168, 240, 0.12)',
        concept: '#86bfe6',
        writeup: '#eb9bb8',
        sequence: '#98cc9a',
        series: [
            '#3987e5',
            '#d95926',
            '#199e70',
            '#c98500',
            '#d55181',
            '#008300',
            '#9085e9',
            '#e66767',
        ],
        ...FONTS,
    },
};

const state: ThemePalette = $state(structuredClone(DEFAULT_PALETTES.light));

export const palette: Readonly<ThemePalette> = state;

// Reads the palette off the page. A variable the stylesheets do not set (they
// may not have loaded yet) keeps the theme's default.
function read(): ThemePalette {
    const root = document.documentElement;
    const theme = root.dataset.theme == 'dark' ? 'dark' : 'light';
    const fallback = DEFAULT_PALETTES[theme];
    const style = getComputedStyle(root);
    const value = (name: string, otherwise: string) =>
        style.getPropertyValue(name).trim() || otherwise;
    const next = { ...fallback, series: [...fallback.series] };
    for (const [key, name] of Object.entries(VARIABLES) as [Colour, string][]) {
        next[key] = value(name, fallback[key]);
    }
    for (let i = 0; i < SERIES; i++) {
        next.series[i] = value(`--series-${i + 1}`, fallback.series[i]!);
    }
    return next;
}

// Assigns only what changed, so an effect that uses one colour does not run
// again for a change to another.
function update(next: ThemePalette) {
    if (state.theme != next.theme) state.theme = next.theme;
    for (const key of Object.keys(VARIABLES) as Colour[]) {
        if (state[key] != next[key]) state[key] = next[key];
    }
    next.series.forEach((colour, i) => {
        if (state.series[i] != colour) state.series[i] = colour;
    });
}

// Reads the palette off the page again. The palette already follows the
// theme; call this after changing a variable from a script.
export function refreshPalette() {
    if (typeof document != 'undefined') update(read());
}

if (typeof document != 'undefined' && typeof MutationObserver != 'undefined') {
    refreshPalette();
    // The theme is switched by setting `data-theme`; a site may also switch
    // a class, or set variables inline.
    new MutationObserver(refreshPalette).observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme', 'class', 'style'],
    });
    // In development the stylesheets arrive after the scripts.
    if (document.readyState != 'complete') {
        addEventListener('load', refreshPalette, { once: true });
    }
}
