// ThisWeekCard — the current week's focus and how much of it is left.
//
// Countdown and focus live in one card on purpose. They are the same idea
// ("this is the week you are actually in"), and splitting them would add a
// third stacked surface to a screen whose job is to keep the grid dominant.
//
// Tone (§02): the countdown states a fact about the calendar. It stops at
// hours, never shows a ticking clock, and the empty state invites rather
// than scolds.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProgressLine } from '@/design/components/ProgressLine';
import { theme } from '@/design/theme';
import { radius, size, space } from '@/design/tokens';
import { type } from '@/design/typography';
import { weekEndDayName, type WeekCountdown } from '@/domain/week';

type Props = {
  countdown: WeekCountdown;
  /** The user's chosen action for this week, if they have set one. */
  focusText?: string | null;
  /** Title of the goal the focus is attached to, if any. */
  goalTitle?: string | null;
  onPressFocus: () => void;
};

export function ThisWeekCard({ countdown, focusText, goalTitle, onPressFocus }: Props) {
  const hasFocus = !!focusText?.trim();
  const endsOn = weekEndDayName(countdown);

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>THIS WEEK</Text>
        <Text style={styles.weekNumber}>
          Week {countdown.weekNumber} of {countdown.year}
        </Text>
      </View>

      <Pressable
        onPress={onPressFocus}
        accessibilityRole="button"
        accessibilityLabel={
          hasFocus
            ? `This week's focus: ${focusText}. Tap to change.`
            : "Set this week's focus"
        }
        style={({ pressed }) => [styles.focusPress, pressed && styles.pressed]}
      >
        <Text style={hasFocus ? styles.focusText : styles.focusEmpty}>
          {hasFocus ? focusText : 'Choose one small action for this week.'}
        </Text>
        {hasFocus && goalTitle ? (
          <Text style={styles.focusGoal}>Toward {goalTitle}</Text>
        ) : null}
      </Pressable>

      <View style={styles.countdown}>
        <ProgressLine value={countdown.progress} tone="quiet" />
        <View style={styles.countdownRow}>
          <Text style={styles.countdownText} accessibilityLabel={countdown.label}>
            {countdown.label}
          </Text>
          <Text style={styles.countdownMeta}>Resets {endsOn}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.raised,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: size.cardPadding,
    gap: space.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: { ...type.label, color: theme.colors.muted },
  weekNumber: { ...type.small, color: theme.colors.muted },
  focusPress: { minHeight: 44, justifyContent: 'center' },
  pressed: { opacity: 0.7 },
  focusText: { ...type.heading, color: theme.colors.text },
  focusEmpty: { ...type.heading, color: theme.colors.muted },
  focusGoal: { ...type.small, color: theme.colors.accent, marginTop: space.xs },
  countdown: { gap: space.sm },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  countdownText: { ...type.small, color: theme.colors.text },
  countdownMeta: { ...type.small, color: theme.colors.muted },
});
