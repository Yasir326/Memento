// ScaleSwitcher — segmented control for the four time scales.
//
// Doc spec (p.20): tap or horizontal swipe; preserve selected scale across
// mounts. This slice implements taps only; swipe is a future addition.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import type { Scale } from './LifeGrid';

const scales: { key: Scale; label: string }[] = [
  { key: 'life', label: 'Life' },
  { key: 'year', label: 'Year' },
  { key: 'week', label: 'Week' },
  { key: 'today', label: 'Today' },
];

type Props = {
  value: Scale;
  onChange: (scale: Scale) => void;
};

export function ScaleSwitcher({ value, onChange }: Props) {
  return (
    <View
      style={styles.wrap}
      accessibilityRole="tablist"
      accessibilityLabel="Time scale"
    >
      {scales.map(({ key, label }) => {
        const selected = key === value;
        return (
          <Pressable
            key={key}
            onPress={() => onChange(key)}
            style={[styles.segment, selected && styles.segmentSelected]}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={label}
          >
            <Text style={[styles.label, selected && styles.labelSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    backgroundColor: theme.colors.raised,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 4,
    gap: 2,
  },
  segment: {
    flex: 1,
    paddingVertical: space.sm + 2,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentSelected: {
    backgroundColor: theme.colors.accent,
  },
  label: {
    ...type.small,
    color: theme.colors.muted,
  },
  labelSelected: {
    color: theme.colors.onAccent,
    fontWeight: '600',
  },
});
