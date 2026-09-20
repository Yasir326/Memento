// Typography scale — verbatim from the design doc's "React Native theme
// tokens" block (p.18). Every text style in the app should reference one of
// these; never inline fontSize/lineHeight in components.

import type { TextStyle } from 'react-native';
import { font } from './tokens';

export const type = {
  // Remaining time and reveal moments — tabular numerals so digits align.
  display: {
    fontFamily: font.bold,
    fontSize: 64,
    lineHeight: 68,
    fontVariant: ['tabular-nums'],
  } satisfies TextStyle,

  // Short screen statements, two lines maximum.
  title: {
    fontFamily: font.bold,
    fontSize: 36,
    lineHeight: 42,
  } satisfies TextStyle,

  // Sections, cards, and goal names.
  heading: {
    fontFamily: font.semibold,
    fontSize: 24,
    lineHeight: 30,
  } satisfies TextStyle,

  // Controls, explanations, and input text.
  body: {
    fontFamily: font.regular,
    fontSize: 16,
    lineHeight: 24,
  } satisfies TextStyle,

  // Supporting copy and metadata.
  small: {
    fontFamily: font.regular,
    fontSize: 14,
    lineHeight: 20,
  } satisfies TextStyle,

  // Uppercase overlines with 1.2 letter spacing.
  label: {
    fontFamily: font.semibold,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  } satisfies TextStyle,

  // Quotes only — italic Source Serif 4. Attribution stays in Manrope.
  quote: {
    fontFamily: font.quote,
    fontSize: 20,
    lineHeight: 30,
    fontStyle: 'italic',
  } satisfies TextStyle,
} as const;
