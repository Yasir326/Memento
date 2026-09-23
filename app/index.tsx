// Time home — the dashboard.
//
// One question per screen (§02): "how much time do I have, and what am I
// doing with this week?" The grid answers the first and stays the dominant
// element; everything below it answers the second and is deliberately
// quieter — labels, thin lines, no second big number competing with the
// headline.
//
// Everything on this screen is derived, never stored. `useNow` re-issues
// the current instant at the next hour or week boundary and on foreground,
// and every figure recomputes from it. So when a week rolls over the
// remaining count drops by one, the lived count rises by one, the next dot
// becomes the current week, and the countdown resets — with no timers to
// replay and no week records to migrate (doc §12 edge case: "the app is not
// opened for several weeks; derive the current state rather than replaying
// timers").

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LifeGrid, type Scale } from '@/features/time/LifeGrid';
import { ScaleSwitcher } from '@/features/time/ScaleSwitcher';
import { QuoteBlock } from '@/features/time/QuoteBlock';
import { ThisWeekCard } from '@/features/time/ThisWeekCard';
import { WeeklyFocusSheet } from '@/features/time/WeeklyFocusSheet';
import { useNow } from '@/features/time/useNow';
import { GoalCard } from '@/features/goals/GoalCard';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { getLifeState } from '@/domain/lifeState';
import { getWeekCountdown } from '@/domain/week';
import { getGoalTimeline } from '@/domain/goalTimeline';
import { toISODate } from '@/domain/dates';
import { listActiveGoals, MAX_ACTIVE_GOALS, type Goal } from '@/repositories/goals';
import { getFocusForWeek, setFocusForWeek, type WeeklyFocus } from '@/repositories/weeklyFocus';
import { updateUserSettings } from '@/repositories/userSettings';
import { useSession } from '@/store/session';
import { theme } from '@/design/theme';
import { radius, size, space } from '@/design/tokens';
import { type } from '@/design/typography';

export default function TimeHome() {
  const router = useRouter();
  const settings = useSession((s) => s.settings);
  const refreshSession = useSession((s) => s.refresh);
  const weekStartsOn = settings?.weekStartsOn ?? 1;

  const [scale, setScale] = useState<Scale>('life');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [focus, setFocus] = useState<WeeklyFocus | null>(null);
  const [focusSheetOpen, setFocusSheetOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // One timer, scheduled to the next moment the copy would change.
  const now = useNow(
    useCallback(
      (instant: Date) => getWeekCountdown(instant, weekStartsOn).nextBoundaryMs,
      [weekStartsOn],
    ),
  );

  const countdown = useMemo(
    () => getWeekCountdown(now, weekStartsOn),
    [now, weekStartsOn],
  );
  const weekIso = toISODate(countdown.weekStart);

  const state = useMemo(() => {
    if (!settings?.birthDate) return null;
    return getLifeState(
      {
        birthDate: settings.birthDate,
        projectedAge: settings.projectedAge,
        weekStartsOn,
      },
      now,
    );
  }, [settings?.birthDate, settings?.projectedAge, weekStartsOn, now]);

  const load = useCallback(async () => {
    const [nextGoals, nextFocus] = await Promise.all([
      listActiveGoals().catch(() => [] as Goal[]),
      getFocusForWeek(weekIso).catch(() => null),
    ]);
    setGoals(nextGoals);
    setFocus(nextFocus);
  }, [weekIso]);

  // Refresh on focus (returning from the Goals screen) and whenever the
  // week rolls over underneath us, since the focus is week-scoped.
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const handleSaveFocus = useCallback(
    async (text: string, goalId: string | null) => {
      await setFocusForWeek({ weekStartDate: weekIso, goalId, text });
      await load();
    },
    [weekIso, load],
  );

  const timelines = useMemo(
    () => goals.map((goal) => getGoalTimeline(goal, now, weekStartsOn)),
    [goals, now, weekStartsOn],
  );

  // ─── The upgrade offer, raised once from here ───
  // Doc §06 steps 7-8: onboarding ends on this screen, then Pro is offered.
  // Showing it a beat after the screen settles means the first thing a new
  // user sees is their own grid, not a price — and `paywallSeenAt` is
  // written by the paywall itself on mount, so this cannot fire twice.
  const paywallRaised = useRef(false);
  useEffect(() => {
    if (paywallRaised.current) return;
    if (!settings?.onboardingCompletedAt) return;
    if (settings.paywallSeenAt || settings.isPro) return;
    paywallRaised.current = true;
    const t = setTimeout(() => router.push('/(paywall)'), 900);
    return () => clearTimeout(t);
  }, [
    settings?.onboardingCompletedAt,
    settings?.paywallSeenAt,
    settings?.isPro,
    router,
  ]);

  const showIntro =
    !!settings?.onboardingCompletedAt && !settings?.homeIntroSeenAt;

  const dismissIntro = useCallback(async () => {
    await updateUserSettings({ homeIntroSeenAt: new Date().toISOString() });
    await refreshSession();
  }, [refreshSession]);

  const focusGoalTitle = useMemo(
    () => goals.find((g) => g.id === focus?.goalId)?.title ?? null,
    [goals, focus?.goalId],
  );

  // OnboardingGate in _layout routes unfinished users away; this is the
  // brief window before that lands.
  if (!settings || !state) {
    return <View style={styles.blank} />;
  }

  const headlineValue =
    scale === 'life'
      ? state.remainingWeeks.toLocaleString()
      : scale === 'year'
        ? String(Math.max(0, 52 - countdown.weekNumber))
        : '—';

  const headlineCaption =
    scale === 'life'
      ? 'estimated weeks remaining'
      : scale === 'year'
        ? 'weeks remaining this year'
        : 'coming next';

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.colors.muted}
          />
        }
      >
        <Text style={styles.brand}>MEMENTO</Text>

        {/* ─── Headline: the number this product exists to show ─── */}
        <View
          accessible
          accessibilityRole="summary"
          accessibilityLabel={`${state.remainingWeeks.toLocaleString()} estimated weeks remaining. ${state.livedWeeks.toLocaleString()} weeks lived.`}
        >
          {/* Doc §17: support platform font scaling, but cap the one
              64 pt number so a large accessibility size cannot push the
              grid below a legible width. Everything else scales freely. */}
          <Text style={styles.display} maxFontSizeMultiplier={1.3}>
            {headlineValue}
          </Text>
          <Text style={styles.displayCaption}>{headlineCaption}</Text>
          <Text style={styles.livedLine}>
            {state.livedWeeks.toLocaleString()} weeks lived
            <Text style={styles.dot}> · </Text>
            {Math.round(state.progress * 100)}% of your horizon
          </Text>
        </View>

        {/* ─── The grid. The point of the screen. ─── */}
        <LifeGrid state={state} scale={scale} />
        <Text style={styles.legend}>Each dot is one week</Text>

        <ScaleSwitcher value={scale} onChange={setScale} />

        {/* ─── First run: the weekly loop, explained in place ───
            Doc §06 step 7 asks the last onboarding beat to "show the
            complete home screen and explain the weekly loop". Explaining it
            here, attached to the card it describes, beats a separate screen
            the user taps past to get somewhere. */}
        {showIntro ? (
          <View style={styles.intro}>
            <Text style={styles.introTitle}>How this works</Text>
            <Text style={styles.introBody}>
              Each dot is one week. Choose one small action for the week
              ahead, and when it ends Memento asks how it went — thirty
              seconds, no judgement. Then the grid moves on.
            </Text>
            <Pressable
              onPress={dismissIntro}
              accessibilityRole="button"
              accessibilityLabel="Got it, hide this"
              style={({ pressed }) => [styles.introBtn, pressed && styles.introBtnPressed]}
            >
              <Text style={styles.introBtnText}>Got it</Text>
            </Pressable>
          </View>
        ) : null}

        {/* ─── This week ─── */}
        <ThisWeekCard
          countdown={countdown}
          focusText={focus?.text}
          goalTitle={focusGoalTitle}
          onPressFocus={() => setFocusSheetOpen(true)}
        />

        {/* ─── Goals ─── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionLabel}>ACTIVE GOALS</Text>
            <Text style={styles.sectionMeta}>
              {goals.length} of {MAX_ACTIVE_GOALS}
            </Text>
          </View>

          {goals.length === 0 ? (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                Nothing has claimed these weeks yet.
              </Text>
              <Text style={styles.emptyHint}>
                Pick one thing worth your time. You can add up to three.
              </Text>
            </View>
          ) : (
            goals.map((goal, i) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                timeline={timelines[i]}
                index={i + 1}
                compact
                onPress={() => router.push('/goals')}
              />
            ))
          )}

          <PrimaryButton
            label={goals.length === 0 ? 'Choose what matters' : 'Review goals'}
            variant={goals.length === 0 ? 'primary' : 'ghost'}
            onPress={() => router.push('/goals')}
          />
        </View>

        <QuoteBlock />
      </ScrollView>

      <WeeklyFocusSheet
        visible={focusSheetOpen}
        initialText={focus?.text}
        initialGoalId={focus?.goalId}
        goals={goals}
        onClose={() => setFocusSheetOpen(false)}
        onSave={handleSaveFocus}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  blank: { flex: 1, backgroundColor: theme.colors.canvas },
  scroll: {
    paddingHorizontal: size.screenPaddingH,
    paddingBottom: space.xxl + space.xl,
    gap: space.lg,
  },
  brand: { ...type.label, color: theme.colors.accent, marginTop: space.sm },

  display: { ...type.display, color: theme.colors.text },
  displayCaption: { ...type.small, color: theme.colors.muted, marginTop: -space.xs },
  livedLine: { ...type.small, color: theme.colors.muted, marginTop: space.md },
  dot: { color: theme.colors.border },

  legend: {
    ...type.small,
    color: theme.colors.muted,
    opacity: 0.7,
    textAlign: 'center',
    marginTop: -space.sm,
  },

  section: { gap: space.md, marginTop: space.sm },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: { ...type.label, color: theme.colors.muted },
  sectionMeta: { ...type.small, color: theme.colors.muted },

  intro: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    padding: size.cardPadding,
    gap: space.sm,
  },
  introTitle: { ...type.label, color: theme.colors.accent },
  introBody: { ...type.small, color: theme.colors.text, lineHeight: 22 },
  introBtn: { minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start' },
  introBtnPressed: { opacity: 0.7 },
  introBtnText: { ...type.small, color: theme.colors.accent, fontWeight: '600' },

  empty: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: size.cardPadding,
    gap: space.xs,
  },
  emptyText: { ...type.body, color: theme.colors.text },
  emptyHint: { ...type.small, color: theme.colors.muted },
});
