// GoalFormSheet — create or edit a goal.
//
// Doc §06: ask only three things — what it is, when it should happen, why it
// matters (optional). Offer 3 / 6 / 12-month chips plus a custom date, and
// show the result in weeks immediately so the commitment is legible before
// it is made.
//
// Doc §06 validation: a target date in the past blocks save and offers the
// nearest valid date rather than silently changing it.

import React, { useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BottomSheet } from '@/design/components/BottomSheet';
import { TextField } from '@/design/components/TextField';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import {
  addMonths,
  plainFromISO,
  toISODate,
  toLocalMidnightInstant,
  todayPlain,
  toPlainDate,
  weeksBetween,
  type PlainDate,
} from '@/domain/dates';
import { formatTargetDate } from '@/domain/goalTimeline';
import type { Goal } from '@/repositories/goals';

type Timeframe = 3 | 6 | 12 | 'custom';

const TIMEFRAMES: Array<{ value: Timeframe; label: string }> = [
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '1 year' },
];

export type GoalDraft = {
  title: string;
  reason: string | null;
  targetDate: string;
};

type Props = {
  visible: boolean;
  /** Pass a goal to edit it; omit to create a new one. */
  goal?: Goal | null;
  onClose: () => void;
  onSave: (draft: GoalDraft) => Promise<void> | void;
  /** Surfaced when the three-active-goal limit blocks the save. */
  error?: string | null;
};

export function GoalFormSheet({ visible, goal, onClose, onSave, error }: Props) {
  const [title, setTitle] = useState('');
  const [reason, setReason] = useState('');
  const [timeframe, setTimeframe] = useState<Timeframe>(6);
  const [customDate, setCustomDate] = useState<PlainDate | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [touched, setTouched] = useState(false);
  // Re-read the calendar day each time the sheet opens, so a sheet left
  // open across midnight doesn't offer a target measured from yesterday.
  const [today, setToday] = useState<PlainDate>(() => todayPlain());

  useEffect(() => {
    if (!visible) return;
    setToday(todayPlain());
    setTitle(goal?.title ?? '');
    setReason(goal?.reason ?? '');
    setSaving(false);
    setTouched(false);
    setShowPicker(false);
    if (goal) {
      // An existing goal always shows its real date rather than snapping to
      // whichever chip happens to be closest.
      setTimeframe('custom');
      setCustomDate(plainFromISO(goal.targetDate));
    } else {
      setTimeframe(6);
      setCustomDate(null);
    }
  }, [visible, goal]);

  const target = useMemo<PlainDate | null>(() => {
    if (timeframe === 'custom') return customDate;
    return addMonths(today, timeframe);
  }, [timeframe, customDate, today]);

  const weeks = target ? weeksBetween(today, target) : 0;
  const isPast = target != null && target.getTime() < today.getTime();
  const trimmedTitle = title.trim();
  const canSave = trimmedTitle.length > 0 && target != null && !isPast;

  const handleSave = async () => {
    setTouched(true);
    if (!canSave || saving || !target) return;
    setSaving(true);
    try {
      await onSave({
        title: trimmedTitle,
        reason: reason.trim() || null,
        targetDate: toISODate(target),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title={goal ? 'Edit this goal' : 'Choose one thing worth your time'}
      subtitle={goal ? undefined : 'Three active goals at most. Make them count.'}
      onClose={onClose}
    >
      <TextField
        label="Goal"
        value={title}
        onChangeText={setTitle}
        placeholder="Launch my first product"
        maxLength={80}
        autoCapitalize="sentences"
        returnKeyType="next"
        error={touched && !trimmedTitle ? 'Give the goal a name.' : null}
      />

      <View style={styles.section}>
        <Text style={styles.label}>TIMEFRAME</Text>
        <View style={styles.chipRow}>
          {TIMEFRAMES.map((tf) => {
            const selected = timeframe === tf.value;
            return (
              <Pressable
                key={tf.value}
                onPress={() => {
                  setTimeframe(tf.value);
                  setCustomDate(null);
                }}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                  {tf.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            setTimeframe('custom');
            setShowPicker(true);
          }}
          accessibilityRole="button"
          accessibilityLabel="Choose a custom target date"
          style={[styles.customRow, timeframe === 'custom' && styles.customRowSelected]}
        >
          <Text style={styles.customText}>
            {timeframe === 'custom' && customDate
              ? formatTargetDate(customDate)
              : 'Custom date'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {showPicker && timeframe === 'custom' ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={toLocalMidnightInstant(customDate ?? addMonths(today, 6))}
              minimumDate={toLocalMidnightInstant(today)}
              onChange={(_, selected) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                // The picker hands back a local instant; store the calendar
                // day it lands on, not the timestamp.
                if (selected) setCustomDate(toPlainDate(selected));
              }}
              themeVariant="dark"
              textColor={theme.colors.text}
            />
          </View>
        ) : null}
      </View>

      <TextField
        label="Why it matters"
        value={reason}
        onChangeText={setReason}
        placeholder="Build something of my own"
        maxLength={200}
        multiline
        style={styles.multiline}
        hint="Optional"
      />

      {target && !isPast ? (
        <View style={styles.preview}>
          <Text style={styles.previewValue}>
            {weeks.toLocaleString()} {weeks === 1 ? 'week' : 'weeks'} to make progress
          </Text>
          <Text style={styles.previewHint}>
            {formatTargetDate(target)} · you can change this at any time.
          </Text>
        </View>
      ) : null}

      {isPast ? <Text style={styles.error}>Choose a date in the future.</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <PrimaryButton
        label={goal ? 'Save changes' : 'Create my goal'}
        onPress={handleSave}
        disabled={!canSave}
        loading={saving}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  label: { ...type.label, color: theme.colors.muted },
  chipRow: { flexDirection: 'row', gap: space.sm },
  chip: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.canvas,
  },
  chipSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { ...type.small, color: theme.colors.muted },
  chipTextSelected: { color: theme.colors.onAccent, fontWeight: '600' },
  customRow: {
    minHeight: 56,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: space.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customRowSelected: { borderColor: theme.colors.accent },
  customText: { ...type.body, color: theme.colors.text },
  chevron: { color: theme.colors.muted, fontSize: 22 },
  pickerWrap: {
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.canvas,
    overflow: 'hidden',
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
  preview: {
    padding: space.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: space.xs,
  },
  previewValue: { ...type.heading, color: theme.colors.text },
  previewHint: { ...type.small, color: theme.colors.muted },
  error: { ...type.small, color: theme.colors.danger },
});
