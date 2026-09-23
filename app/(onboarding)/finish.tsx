// Step 7 (STEP 5 OF 5) — Finish. Commits the draft to SQLite, marks
// onboarding complete, and hands the user to the Time home screen.
//
// This is the ONLY place that writes the goal + weekly focus to the
// database — up to now they've lived in the Zustand draft. That way the
// user can safely back out of any step without leaving orphan rows.

import React, { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { space } from '@/design/tokens';
import { type } from '@/design/typography';
import { computeGoalTargetDate, useOnboardingStore } from '@/store/onboarding';
import { updateUserSettings } from '@/repositories/userSettings';
import { createGoal } from '@/repositories/goals';
import { createFocus } from '@/repositories/weeklyFocus';
import { useSession } from '@/store/session';
import { currentWeekStart, toISODate } from '@/domain/dates';

export default function Finish() {
  const router = useRouter();
  const draft = useOnboardingStore((s) => s);
  const reset = useOnboardingStore((s) => s.reset);
  const refreshSession = useSession((s) => s.refresh);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onEnter = async () => {
    setSaving(true);
    setError(null);
    try {
      const targetDate = computeGoalTargetDate(draft);
      if (!targetDate) throw new Error('Goal target date is missing');

      const goal = await createGoal({
        title: draft.goalTitle,
        reason: draft.goalReason.trim() || null,
        targetDate,
      });

      const weekIso = toISODate(currentWeekStart(1));

      await createFocus({
        weekStartDate: weekIso,
        goalId: goal.id,
        text: draft.weeklyFocusText,
      });

      await updateUserSettings({
        onboardingCompletedAt: new Date().toISOString(),
      });

      // Critical ordering: refresh the session cache BEFORE navigating.
      // OnboardingGate reads onboardingCompletedAt from the store, so
      // leaving here with a stale null bounces the user straight back to
      // step one and the home screen renders blank behind it.
      await refreshSession();

      reset();
      // Doc §06 step 8 / §07: the upgrade offer is the last thing, once the
      // grid, a goal and a weekly action all exist.
      router.replace('/(paywall)');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScreen step={5}>
      <View style={styles.body}>
        <Text style={styles.title}>You're set.</Text>
        <Text style={styles.subtitle}>
          Each week Memento asks a small question. Reflect for 30 seconds, choose the next action,
          and let the grid do the rest.
        </Text>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>THIS WEEK</Text>
          <Text style={styles.cardValue}>{draft.weeklyFocusText}</Text>
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <View style={styles.spacer} />
        <PrimaryButton label="Enter Memento" onPress={onEnter} loading={saving} />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.md },
  subtitle: { ...type.body, color: theme.colors.muted, marginBottom: space.xl },
  card: {
    padding: space.lg,
    borderRadius: 28,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: space.xs,
  },
  cardLabel: { ...type.label, color: theme.colors.muted },
  cardValue: { ...type.heading, color: theme.colors.text },
  error: { ...type.small, color: theme.colors.danger, marginTop: space.md, textAlign: 'center' },
  spacer: { flex: 1 },
});
