// Goals — up to three active commitments, measured in weeks.
//
// Doc §05/§08: "Maximum of three active goals; additional goals require
// archiving or completing one first." The limit is enforced in the
// repository, but this screen makes it legible *before* the user hits it —
// the add button explains itself rather than failing on tap.
//
// Everything here is time-relative and recomputed from the current instant,
// so a goal's "38 weeks left" ticks down on its own as weeks pass.

import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { GoalCard } from '@/features/goals/GoalCard';
import { GoalFormSheet, type GoalDraft } from '@/features/goals/GoalFormSheet';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { useNow } from '@/features/time/useNow';
import { getGoalTimeline } from '@/domain/goalTimeline';
import { getWeekCountdown } from '@/domain/week';
import {
  createGoal,
  listGoals,
  setGoalStatus,
  updateGoal,
  MAX_ACTIVE_GOALS,
  type Goal,
} from '@/repositories/goals';
import { useSession } from '@/store/session';
import { theme } from '@/design/theme';
import { radius, size, space } from '@/design/tokens';
import { type } from '@/design/typography';

export default function Goals() {
  const router = useRouter();
  const settings = useSession((s) => s.settings);
  const weekStartsOn = settings?.weekStartsOn ?? 1;

  const [goals, setGoals] = useState<Goal[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<Goal | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Goal timelines only change at week boundaries, so the same one-timer
  // approach the dashboard uses is more than enough here.
  const now = useNow(
    useCallback(
      (instant: Date) => getWeekCountdown(instant, weekStartsOn).nextBoundaryMs,
      [weekStartsOn],
    ),
  );

  const load = useCallback(async () => {
    const all = await listGoals().catch(() => [] as Goal[]);
    setGoals(all);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const active = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const settled = useMemo(
    () => goals.filter((g) => g.status === 'completed' || g.status === 'archived'),
    [goals],
  );
  const atLimit = active.length >= MAX_ACTIVE_GOALS;

  const openCreate = () => {
    setEditing(null);
    setSaveError(null);
    setSheetOpen(true);
  };

  const openEdit = (goal: Goal) => {
    setEditing(goal);
    setSaveError(null);
    setSheetOpen(true);
  };

  const handleSave = useCallback(
    async (draft: GoalDraft) => {
      try {
        if (editing) {
          await updateGoal(editing.id, draft);
        } else {
          await createGoal(draft);
        }
        setSheetOpen(false);
        setEditing(null);
        await load();
      } catch (e) {
        setSaveError(
          e instanceof Error && e.message.includes('three')
            ? 'You already have three active goals. Complete or archive one first.'
            : 'That could not be saved. Try again.',
        );
      }
    },
    [editing, load],
  );

  const changeStatus = useCallback(
    async (goal: Goal, status: Goal['status'], confirmTitle: string, confirmBody: string) => {
      Alert.alert(confirmTitle, confirmBody, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              await setGoalStatus(goal.id, status);
              await load();
            } catch {
              Alert.alert(
                'Three active goals already',
                'Complete or archive one before reopening this.',
              );
            }
          },
        },
      ]);
    },
    [load],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={16}
          accessibilityRole="button"
          accessibilityLabel="Back"
          style={styles.backBtn}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
            <Path
              d="M15 6L9 12L15 18"
              stroke={theme.colors.muted}
              strokeWidth={size.iconStroke}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </Svg>
        </Pressable>
        <Text style={styles.overline}>GOALS</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>What deserves{'\n'}your weeks?</Text>

        {active.length === 0 ? (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No active goals.</Text>
            <Text style={styles.emptyHint}>
              One is enough to start. You can hold up to three at a time.
            </Text>
          </View>
        ) : (
          active.map((goal, i) => (
            <View key={goal.id} style={styles.goalBlock}>
              <GoalCard
                goal={goal}
                timeline={getGoalTimeline(goal, now, weekStartsOn)}
                index={i + 1}
                onPress={() => openEdit(goal)}
              />
              <View style={styles.actions}>
                <Pressable
                  onPress={() =>
                    changeStatus(
                      goal,
                      'completed',
                      'Mark as complete?',
                      `"${goal.title}" moves to your finished goals and frees a slot.`,
                    )
                  }
                  accessibilityRole="button"
                  style={styles.action}
                >
                  <Text style={styles.actionText}>Complete</Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    changeStatus(
                      goal,
                      'archived',
                      'Archive this goal?',
                      'It stays in your history and stops taking up an active slot.',
                    )
                  }
                  accessibilityRole="button"
                  style={styles.action}
                >
                  <Text style={styles.actionText}>Archive</Text>
                </Pressable>
              </View>
            </View>
          ))
        )}

        <PrimaryButton
          label={atLimit ? 'Three active goals' : 'Add a goal'}
          onPress={openCreate}
          disabled={atLimit}
          variant={active.length === 0 ? 'primary' : 'ghost'}
        />
        <Text style={styles.limitNote}>
          {atLimit
            ? 'Complete or archive one to make room for something new.'
            : `${MAX_ACTIVE_GOALS - active.length} of ${MAX_ACTIVE_GOALS} slots free.`}
        </Text>

        {settled.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>FINISHED AND ARCHIVED</Text>
            {settled.map((goal) => (
              <Pressable
                key={goal.id}
                style={styles.settledRow}
                accessibilityRole="button"
                accessibilityLabel={`${goal.title}, ${goal.status}. Tap to reopen.`}
                onPress={() =>
                  changeStatus(
                    goal,
                    'active',
                    'Make this active again?',
                    'It will take one of your three active slots.',
                  )
                }
              >
                <Text style={styles.settledTitle} numberOfLines={1}>
                  {goal.title}
                </Text>
                <Text style={styles.settledStatus}>
                  {goal.status === 'completed' ? 'Completed' : 'Archived'}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <GoalFormSheet
        visible={sheetOpen}
        goal={editing}
        error={saveError}
        onClose={() => {
          setSheetOpen(false);
          setEditing(null);
        }}
        onSave={handleSave}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  header: {
    height: 48,
    paddingHorizontal: size.screenPaddingH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  overline: { ...type.label, color: theme.colors.accent },
  scroll: {
    paddingHorizontal: size.screenPaddingH,
    paddingTop: space.lg,
    paddingBottom: space.xxl + space.xl,
    gap: space.lg,
  },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.sm },

  goalBlock: { gap: space.sm },
  actions: { flexDirection: 'row', gap: space.xl, paddingHorizontal: space.xs },
  action: { minHeight: 44, justifyContent: 'center' },
  actionText: { ...type.small, color: theme.colors.muted },

  empty: {
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: size.cardPadding,
    gap: space.xs,
  },
  emptyText: { ...type.body, color: theme.colors.text },
  emptyHint: { ...type.small, color: theme.colors.muted },

  limitNote: { ...type.small, color: theme.colors.muted, textAlign: 'center', marginTop: -space.sm },

  section: { gap: space.sm, marginTop: space.lg },
  sectionLabel: { ...type.label, color: theme.colors.muted, marginBottom: space.xs },
  settledRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  settledTitle: { ...type.body, color: theme.colors.muted, flex: 1 },
  settledStatus: { ...type.small, color: theme.colors.future },
});
