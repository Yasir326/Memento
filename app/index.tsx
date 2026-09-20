// Time home — the default entry after onboarding completes. Reads
// UserSettings + the current week's focus + the daily quote and composes
// them into the doc's Section 08 spec.
//
// If the user hasn't completed onboarding, OnboardingGate in _layout.tsx
// pushes them to /(onboarding)/intro before this screen ever mounts. So
// we can safely assume UserSettings.birthDate is not null here — but we
// still guard for the type system.

import React, { useCallback, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { LifeGrid, type Scale } from '@/features/time/LifeGrid';
import { ScaleSwitcher } from '@/features/time/ScaleSwitcher';
import { QuoteBlock } from '@/features/time/QuoteBlock';
import { getLifeState } from '@/domain/lifeState';
import { startOfWeek } from '@/domain/dates';
import { getFocusForWeek, type WeeklyFocus } from '@/repositories/weeklyFocus';
import { useSession } from '@/store/session';
import { theme } from '@/design/theme';
import { size, space } from '@/design/tokens';
import { type } from '@/design/typography';

export default function TimeHome() {
  const [scale, setScale] = useState<Scale>('life');
  const settings = useSession((s) => s.settings);
  const [focus, setFocus] = useState<WeeklyFocus | null>(null);

  // Refresh the current week's focus every time this screen gains focus
  // (e.g. returning from a reflection flow later on). Cheap query — safe
  // to run on focus.
  useFocusEffect(
    useCallback(() => {
      if (!settings?.birthDate) return;
      const week = startOfWeek(new Date(), settings.weekStartsOn);
      const iso = `${week.getUTCFullYear()}-${String(week.getUTCMonth() + 1).padStart(2, '0')}-${String(week.getUTCDate()).padStart(2, '0')}`;
      getFocusForWeek(iso).then(setFocus).catch(() => setFocus(null));
    }, [settings?.birthDate, settings?.weekStartsOn]),
  );

  const state = useMemo(() => {
    if (!settings?.birthDate) return null;
    return getLifeState({
      birthDate: settings.birthDate,
      projectedAge: settings.projectedAge,
      weekStartsOn: settings.weekStartsOn,
    });
  }, [settings?.birthDate, settings?.projectedAge, settings?.weekStartsOn]);

  const remainingLabel = useMemo(() => {
    if (!state) return '';
    if (scale === 'life') return `${state.remainingWeeks.toLocaleString()}`;
    if (scale === 'year') return `${52 - weekOfYear(state.currentWeekStart) - 1}`;
    return '';
  }, [scale, state]);

  const remainingSubtitle = useMemo(() => {
    if (scale === 'life') return 'estimated weeks remaining';
    if (scale === 'year') return 'weeks remaining this year';
    return 'coming next';
  }, [scale]);

  // While the session is bootstrapping (or onboarding hasn't run yet),
  // render a blank canvas — OnboardingGate handles routing.
  if (!settings || !state) {
    return <View style={styles.blank} />;
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        accessibilityLabel={
          scale === 'life'
            ? `${state.livedWeeks.toLocaleString()} weeks lived, ${state.remainingWeeks.toLocaleString()} estimated remaining.`
            : undefined
        }
      >
        <Text style={styles.brand}>MEMENTO</Text>

        <View style={styles.headline}>
          <Text style={styles.display}>{remainingLabel}</Text>
          <Text style={styles.displaySub}>{remainingSubtitle}</Text>
        </View>

        <LifeGrid state={state} scale={scale} />

        <View style={styles.legend}>
          <Text style={styles.legendText}>Each dot represents one week</Text>
        </View>

        <ScaleSwitcher value={scale} onChange={setScale} />

        <View style={styles.focus}>
          <Text style={styles.focusLabel}>THIS WEEK</Text>
          <Text style={styles.focusText}>
            {focus?.text ?? 'Set a focus for this week from Goals.'}
          </Text>
        </View>

        <QuoteBlock />
      </ScrollView>
    </SafeAreaView>
  );
}

function weekOfYear(currentWeekStart: Date): number {
  const yearStart = new Date(Date.UTC(currentWeekStart.getUTCFullYear(), 0, 1));
  const days = Math.floor((currentWeekStart.getTime() - yearStart.getTime()) / 86_400_000);
  return Math.max(0, Math.min(51, Math.floor(days / 7)));
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  blank: { flex: 1, backgroundColor: theme.colors.canvas },
  scrollContent: {
    paddingHorizontal: size.screenPaddingH,
    paddingBottom: 48,
    gap: space.lg,
  },
  brand: { ...type.label, color: theme.colors.accent, marginTop: space.sm },
  headline: { marginBottom: space.sm },
  display: { ...type.display, color: theme.colors.text, fontVariant: ['tabular-nums'] },
  displaySub: { ...type.small, color: theme.colors.muted, marginTop: -space.xs },
  legend: { alignItems: 'center', marginTop: -space.sm },
  legendText: { ...type.small, color: theme.colors.muted, opacity: 0.7 },
  focus: {
    backgroundColor: theme.colors.raised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: size.cardPadding,
    gap: space.xs,
  },
  focusLabel: { ...type.label, color: theme.colors.muted },
  focusText: { ...type.heading, color: theme.colors.text },
});
