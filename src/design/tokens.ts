// Design tokens — verbatim from the Memento product design doc, section 09
// (Visual design system). These are the shared source of truth for every
// screen, widget, empty state, and paywall. Do not import raw hex codes or
// magic numbers elsewhere; import from here.

export const font = {
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
  quote: 'SourceSerif4_400Regular_Italic',
} as const;

// Colour tokens — dark theme is the signature. Light theme lives here too so
// accessibility (system-level Dark Mode override) can flip cleanly.
export const palette = {
  dark: {
    canvas: '#0B0B0C', // Primary background
    raised: '#141416', // Cards, sheets, controls
    border: '#28282C',
    text: '#F4F0E8', // Headings and key values
    muted: '#85858B', // Supporting text
    elapsed: '#EDE8DE', // Elapsed dots (warm white)
    future: '#303034', // Future dots (low-contrast graphite)
    accent: '#C6A36A', // Current week and primary action (muted amber)
    onAccent: '#17120B',
    danger: '#A84B3F', // Errors only, never elapsed time
    success: '#6E8B74',
    scrim: '#00000099',
  },
  light: {
    canvas: '#F4F1EA',
    raised: '#FFFFFF',
    border: '#E0DDD6',
    text: '#171719',
    muted: '#626268',
    elapsed: '#1B1B1D',
    future: '#D8D5CF',
    accent: '#9C743B',
    onAccent: '#FFFFFF',
    danger: '#983E33',
    success: '#527059',
    scrim: '#17171966',
  },
} as const;

// Spacing scale — space.N maps to N * 4 for the smaller steps and jumps up
// for section-level rhythm. Component padding should compose from these.
export const space = {
  xs: 4, // Icon and label micro-spacing (space.1 in the doc)
  sm: 8, // Inline gaps (space.2)
  md: 12, // Compact component padding (space.3)
  lg: 16, // Default content gap (space.4)
  xl: 24, // Section spacing (space.6)
  xxl: 32, // Major separation (space.8)
} as const;

// Corner radii — grouped by intent. Inputs are slightly less rounded than
// controls so they read as fields; pills are for status only.
export const radius = {
  input: 16,
  control: 20,
  card: 28,
  sheet: 32,
  pill: 999,
} as const;

// Motion durations — every animation should pick one of these, not a bespoke
// value. Reduce Motion falls back to `completion`-only colour changes.
export const motion = {
  quick: 120,
  standard: 260,
  completion: 450,
  reveal: 1100,
} as const;

// Component sizing defaults — surfaces the doc's "default component
// measurements" table so components don't invent their own dimensions.
export const size = {
  screenPaddingH: 24,
  screenGapV: 16,
  primaryButtonMinHeight: 56,
  inputMinHeight: 56,
  cardPadding: 20,
  bottomSheetTopRadius: 32,
  bottomSheetPadding: 24,
  iconStroke: 1.75,
  iconSm: 20,
  iconMd: 22,
  iconLg: 24,
  // Life dot geometry — resolved responsively per grid at render time.
  lifeDotMin: 6,
  lifeDotMax: 10,
  lifeDotGapMin: 4,
  lifeDotGapMax: 6,
} as const;

// Palette shape as an interface so both `dark` and `light` variants can be
// typed against it — using `typeof palette.dark` would freeze the literal
// values and reject the light variant's differing string values.
export interface Palette {
  canvas: string;
  raised: string;
  border: string;
  text: string;
  muted: string;
  elapsed: string;
  future: string;
  accent: string;
  onAccent: string;
  danger: string;
  success: string;
  scrim: string;
}
