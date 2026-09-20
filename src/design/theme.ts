// Theme accessor — the doc calls for a dark-first signature with an
// accessible light variant. This slice ships dark only; light is exported
// so a future slice can wire a system-preference toggle without changing
// component code.

import { palette, type Palette } from './tokens';

export const theme = {
  colors: palette.dark satisfies Palette,
} as const;

export const lightTheme = {
  colors: palette.light satisfies Palette,
} as const;

export type Theme = typeof theme;
