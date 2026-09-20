// GoalCard — one active commitment, in weeks.
//
// Doc §08: "Each goal has a title, optional reason, target date, status,
// progress method, and current weekly action" and "Translate the target
// date into weeks: '38 weeks left.' Dates remain visible in detail view."
//
// So the card leads with the week count, keeps the date as quiet metadata,
// and uses the thin line for time elapsed rather than a self-reported
// percentage — time is the thing this product is actually about, and it
// updates itself without the user having to maintain it.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProgressLine } from '@/design/components/ProgressLine';
import { theme } from '@/design/theme';
import { radius, size, space } from '@/design/tokens';
import { type } from '@/design/typography';
import { formatTargetDate, type GoalTimeline } from '@/domain/goalTimeline';
import type { Goal } from '@/repositories/goals';

type Props = {
  goal: Goal;
  timeline: GoalTimeline;
  /** 1-based position, shown as the "01" overline in the design. */
  index: number;
  onPress?: () => void;
  /** Compact form for the dashboard; full form on the Goals screen. */
  compact?: boolean;
};

export function GoalCard({ goal, timeline, index, onPress, compact = false }: Props) {
  const dateLabel = formatTargetDate(timeline.target);
  const body = (
    <>
      <View style={styles.headerRow}>
        <Text style={styles.index}>{String(index).padStart(2, '0')}</Text>
        {timeline.isOverdue ? <Text style={styles.flag}>NEEDS A DECISION</Text> : null}
        {timeline.isDueThisWeek ? <Text style={styles.flagDue}>DUE THIS WEEK</Text> : null}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {goal.title}
      </Text>

      <View style={styles.metaRow}>
        <Text style={[styles.weeks, timeline.isOverdue && styles.weeksOverdue]}>
          {timeline.label}
        </Text>
        <Text style={styles.date}>{dateLabel}</Text>
      </View>

      <ProgressLine
        value={timeline.elapsed}
        tone={timeline.isOverdue ? 'quiet' : 'accent'}
      />

      {!compact && goal.reason ? (
        <Text style={styles.reason} numberOfLines={2}>
          {goal.reason}
        </Text>
      ) : null}
    </>
  );

  const a11y = `${goal.title}. ${timeline.label}. Target ${dateLabel}.`;

  if (!onPress) {
    return (
      <View style={styles.card} accessible accessibilityLabel={a11y}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.raised,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: size.cardPadding,
    gap: space.sm,
    minHeight: 44,
  },
  pressed: { opacity: 0.8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  index: { ...type.label, color: theme.colors.accent },
  flag: { ...type.label, color: theme.colors.danger },
  flagDue: { ...type.label, color: theme.colors.accent },
  title: { ...type.heading, color: theme.colors.text },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: space.sm,
  },
  weeks: { ...type.small, color: theme.colors.text },
  weeksOverdue: { color: theme.colors.danger },
  date: { ...type.small, color: theme.colors.muted },
  reason: { ...type.small, color: theme.colors.muted, marginTop: space.xs },
});
