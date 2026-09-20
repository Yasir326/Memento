// ProgressLine — the only progress primitive in the product.
//
// Doc §09, component appearance: "Prefer weeks remaining plus a thin line;
// avoid rings, gauges, and celebratory gradients." So this is deliberately
// a 3 px track and nothing else. No labels, no percentages, no animation on
// mount — the number next to it carries the meaning.

import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { theme } from '@/design/theme';
import { radius } from '@/design/tokens';

type Props = {
  /** 0..1. Values outside the range are clamped. */
  value: number;
  /** `accent` for the user's own progress, `quiet` for elapsed time. */
  tone?: 'accent' | 'quiet';
  style?: StyleProp<ViewStyle>;
};

export function ProgressLine({ value, tone = 'accent', style }: Props) {
  const pct = `${Math.max(0, Math.min(1, value)) * 100}%` as const;
  return (
    <View style={[styles.track, style]} accessibilityElementsHidden importantForAccessibility="no">
      <View
        style={[
          styles.fill,
          { width: pct },
          tone === 'accent' ? styles.accent : styles.quiet,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 3,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  accent: { backgroundColor: theme.colors.accent },
  quiet: { backgroundColor: theme.colors.muted },
});
