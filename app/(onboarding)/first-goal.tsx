// Step 5 (STEP 3 OF 5) — First goal.
//
// Doc §06 rules:
//   - Ask only three things: what, when, why (the reason is optional).
//   - Offer 3/6/12-month chips + custom date. Show the resulting weeks
//     immediately so the user sees the projection.
//   - Use the selected life areas to suggest examples, but never force
//     templates or AI generation. Tapping an idea fills the field and
//     nothing more; it stays editable and can be ignored.

import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import { computeGoalTargetDate, useOnboardingStore } from '@/store/onboarding';
import { suggestionsForAreas } from '@/content/goalSuggestions';
import {
  addMonths,
  plainFromISO,
  toISODate,
  toLocalMidnightInstant,
  toPlainDate,
  todayPlain,
  weeksBetween,
} from '@/domain/dates';
import { formatTargetDate } from '@/domain/goalTimeline';

const TIMEFRAMES: Array<{ months: number; label: string }> = [
  { months: 3, label: '3 months' },
  { months: 6, label: '6 months' },
  { months: 12, label: '1 year' },
];

export default function FirstGoal() {
  const router = useRouter();
  const goalTitle = useOnboardingStore((s) => s.goalTitle);
  const goalTimeframeMonths = useOnboardingStore((s) => s.goalTimeframeMonths);
  const goalCustomDate = useOnboardingStore((s) => s.goalCustomDate);
  const goalReason = useOnboardingStore((s) => s.goalReason);
  const lifeAreas = useOnboardingStore((s) => s.lifeAreas);
  const patch = useOnboardingStore((s) => s.patch);
  const completeStep = useOnboardingStore((s) => s.completeStep);

  // Empty when the user skipped the Direction step, which hides the whole
  // section rather than falling back to generic ideas they did not ask for.
  const suggestions = useMemo(() => suggestionsForAreas(lifeAreas, 3), [lifeAreas]);

  const [showCustomPicker, setShowCustomPicker] = useState(false);

  const draft = useOnboardingStore((s) => s);
  const targetDateIso = useMemo(() => computeGoalTargetDate(draft), [draft]);
  const targetDate = targetDateIso ? plainFromISO(targetDateIso) : null;
  const weeksToTarget = targetDate ? weeksBetween(todayPlain(), targetDate) : 0;

  const goalDateInPast = targetDate != null && targetDate.getTime() < todayPlain().getTime();

  const canContinue = goalTitle.trim().length > 0 && targetDateIso != null && !goalDateInPast;

  const onContinue = () => {
    if (!canContinue) return;
    completeStep('first-goal');
    router.push('/(onboarding)/weekly-focus');
  };

  return (
    <OnboardingScreen step={3}>
      {/* Scrolls because the ideas section, the date picker and the reason
          field together exceed one viewport on a small phone. */}
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Choose one thing{'\n'}worth your time.</Text>
        <Text style={styles.subtitle}>You can add two more goals later.</Text>

        <Text style={styles.label}>GOAL</Text>
        <TextInput
          value={goalTitle}
          onChangeText={(t) => patch({ goalTitle: t })}
          placeholder="Launch my first product"
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
          maxLength={80}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        {suggestions.length > 0 && goalTitle.trim().length === 0 ? (
          <>
            <Text style={styles.label}>IDEAS FROM WHAT YOU CHOSE</Text>
            <View style={styles.suggestionList}>
              {suggestions.map((idea) => (
                <Pressable
                  key={idea}
                  onPress={() => patch({ goalTitle: idea })}
                  style={styles.suggestion}
                  accessibilityRole="button"
                  accessibilityLabel={`Use this idea: ${idea}`}
                >
                  <Text style={styles.suggestionText}>{idea}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.label}>TIMEFRAME</Text>
        <View style={styles.chipRow}>
          {TIMEFRAMES.map((tf) => {
            const selected = goalTimeframeMonths === tf.months;
            return (
              <Pressable
                key={tf.months}
                onPress={() => patch({ goalTimeframeMonths: tf.months, goalCustomDate: null })}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{tf.label}</Text>
              </Pressable>
            );
          })}
        </View>

        <Pressable
          onPress={() => {
            patch({ goalTimeframeMonths: 'custom' });
            setShowCustomPicker(true);
          }}
          style={[styles.customBtn, goalTimeframeMonths === 'custom' && styles.customBtnSelected]}
          accessibilityRole="button"
          accessibilityLabel="Choose a custom date"
        >
          <Text style={styles.customBtnText}>
            {goalTimeframeMonths === 'custom' && goalCustomDate
              ? formatTargetDate(plainFromISO(goalCustomDate))
              : 'Custom date'}
          </Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>

        {showCustomPicker && goalTimeframeMonths === 'custom' ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={toLocalMidnightInstant(
                goalCustomDate ? plainFromISO(goalCustomDate) : addMonths(todayPlain(), 6),
              )}
              minimumDate={toLocalMidnightInstant(todayPlain())}
              onChange={(_, selected) => {
                if (Platform.OS !== 'ios') setShowCustomPicker(false);
                // The picker returns a local instant; store the calendar day.
                if (selected) patch({ goalCustomDate: toISODate(toPlainDate(selected)) });
              }}
              themeVariant="dark"
              textColor={theme.colors.text}
            />
          </View>
        ) : null}

        <Text style={styles.label}>WHY IT MATTERS</Text>
        <TextInput
          value={goalReason}
          onChangeText={(t) => patch({ goalReason: t })}
          placeholder="Build something of my own"
          placeholderTextColor={theme.colors.muted}
          style={[styles.input, styles.inputMultiline]}
          maxLength={200}
          multiline
        />
        <Text style={styles.helper}>Optional</Text>

        {targetDate ? (
          <View style={styles.previewCard}>
            <Text style={styles.previewValue}>
              {weeksToTarget} {weeksToTarget === 1 ? 'week' : 'weeks'} to make progress
            </Text>
            <Text style={styles.previewHint}>You can change this at any time.</Text>
          </View>
        ) : null}

        {goalDateInPast ? (
          <Text style={styles.error}>Choose a date in the future.</Text>
        ) : null}

        <PrimaryButton
          label="Create my goal"
          onPress={onContinue}
          disabled={!canContinue}
          style={styles.cta}
        />
      </ScrollView>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  scrollContent: { paddingBottom: 40 },
  cta: { marginTop: space.xl },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.xs },
  subtitle: { ...type.body, color: theme.colors.muted, marginBottom: space.xl },
  label: { ...type.label, color: theme.colors.muted, marginTop: space.md, marginBottom: space.sm },
  helper: { ...type.small, color: theme.colors.muted, marginTop: space.xs },
  input: {
    minHeight: 56,
    borderRadius: radius.input,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    color: theme.colors.text,
    ...type.body,
  },
  inputMultiline: { minHeight: 88, paddingVertical: 14, textAlignVertical: 'top' },
  suggestionList: { gap: space.sm },
  suggestion: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.input,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  suggestionText: { ...type.small, color: theme.colors.muted },
  chipRow: { flexDirection: 'row', gap: space.sm },
  chip: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 72,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { ...type.body, color: theme.colors.muted },
  chipTextSelected: { color: theme.colors.onAccent, fontWeight: '600' },
  customBtn: {
    marginTop: space.sm,
    minHeight: 56,
    borderRadius: radius.input,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customBtnSelected: { borderColor: theme.colors.accent },
  customBtnText: { ...type.body, color: theme.colors.text },
  chevron: { color: theme.colors.muted, fontSize: 22 },
  pickerWrap: {
    marginTop: space.sm,
    backgroundColor: theme.colors.raised,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  previewCard: {
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  previewValue: { ...type.heading, color: theme.colors.text },
  previewHint: { ...type.small, color: theme.colors.muted, marginTop: space.xs },
  error: { ...type.small, color: theme.colors.danger, marginTop: space.md },
});
