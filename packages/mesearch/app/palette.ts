// What a document imports to colour a plot by the theme:
//
//     import { palette } from '@mvarble/mesearch/palette';
//
// `palette` is reactive, so an `$effect` that draws with it draws again when
// the reader switches between light and dark. See `@mvarble/mesearch-ui`.

export { DEFAULT_PALETTES, palette, refreshPalette, type ThemePalette } from '@mvarble/mesearch-ui';
