// Step 4 (STEP 2 OF 5) — Direction. Optional life areas to seed goal ideas.
//
// Doc §06 explicitly marks this step as skippable. Max 3 selections. The
// answers are not used for goal creation on this session — they're stored
// on UserSettings so a future "suggest a goal" flow can read them.

import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import { useOnboardingStore } from '@/store/onboarding';
import { updateUserSettings } from '@/repositories/userSettings';
import { useSession } from '@/store/session';

const AREAS = [
  'Family',
  'Health',
  'Faith',
  'Create',
  'Career',
  'Adventure',
  'Learning',
  'Community',
  'Financial freedom',
  'Other',
] as const;

const MAX_AREAS = 3;

export default function Values() {
  const router = useRouter();
  const refreshSession = useSession((s) => s.refresh);
  const lifeAreas = useOnboardingStore((s) => s.lifeAreas);
  const patch = useOnboardingStore((s) => s.patch);

  const toggle = (area: string) => {
    if (lifeAreas.includes(area)) {
      patch({ lifeAreas: lifeAreas.filter((a) => a !== area) });
    } else if (lifeAreas.length < MAX_AREAS) {
      patch({ lifeAreas: [...lifeAreas, area] });
    }
  };

  const onContinue = async () => {
    await updateUserSettings({ lifeAreas: lifeAreas.length > 0 ? lifeAreas : null });
    await refreshSession();
    router.push('/(onboarding)/first-goal');
  };

  const onSkip = async () => {
    patch({ lifeAreas: [] });
    await updateUserSettings({ lifeAreas: null });
    await refreshSession();
    router.push('/(onboarding)/first-goal');
  };

  return (
    <OnboardingScreen step={2}>
      <View style={styles.body}>
        <Text style={styles.title}>What should your{'\n'}weeks mean?</Text>
        <Text style={styles.subtitle}>Choose up to three. You can skip this.</Text>

        <View style={styles.chipCloud}>
          {AREAS.map((area) => {
            const selected = lifeAreas.includes(area);
            const disabled = !selected && lifeAreas.length >= MAX_AREAS;
            return (
              <Pressable
                key={area}
                onPress={() => toggle(area)}
                disabled={disabled}
                style={[
                  styles.chip,
                  selected && styles.chipSelected,
                  disabled && styles.chipDisabled,
                ]}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: selected, disabled }}
                accessibilityLabel={area}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{area}</Text>
              </Pressable>
            );
          })}
        </View>

        {lifeAreas.length > 0 ? (
          <View style={styles.summaryCard}>
            <Text style={styles.summaryLabel}>Your direction</Text>
            <Text style={styles.summaryValue}>{lifeAreas.join(' · ')}</Text>
            <Text style={styles.summaryHint}>We will use these only to suggest goal ideas.</Text>
          </View>
        ) : null}

        <View style={styles.spacer} />

        <PrimaryButton label="Continue" onPress={onContinue} />
        <Pressable onPress={onSkip} style={styles.skip} accessibilityRole="button" accessibilityLabel="Skip for now">
          <Text style={styles.skipText}>Skip for now</Text>
        </Pressable>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.xs },
  subtitle: { ...type.body, color: theme.colors.muted, marginBottom: space.xl },
  chipCloud: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  chipSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipDisabled: { opacity: 0.4 },
  chipText: { ...type.small, color: theme.colors.text, fontWeight: '500' },
  chipTextSelected: { color: theme.colors.onAccent, fontWeight: '600' },
  summaryCard: {
    marginTop: space.xl,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  summaryLabel: { ...type.small, color: theme.colors.muted, marginBottom: space.xs },
  summaryValue: { ...type.heading, color: theme.colors.text, marginBottom: space.sm },
  summaryHint: { ...type.small, color: theme.colors.muted },
  spacer: { flex: 1 },
  skip: { alignItems: 'center', paddingVertical: space.md, marginTop: space.sm },
  skipText: { ...type.body, color: theme.colors.muted },
});
