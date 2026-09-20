// Step 6 (STEP 4 OF 5) — This week's focus. Doc §06 rule: create one weekly
// action before showing the finished home screen so the first session is
// useful, not only reflective.

import React, { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import { useOnboardingStore } from '@/store/onboarding';

// Suggestions are generic small first actions; the doc's screen concept
// literally uses these. Deliberately vague — the user substitutes the noun.
const SUGGESTIONS = [
  '30 min research',
  'Write one page',
  'Make the first call',
];

export default function WeeklyFocusStep() {
  const router = useRouter();
  const weeklyFocusText = useOnboardingStore((s) => s.weeklyFocusText);
  const goalTitle = useOnboardingStore((s) => s.goalTitle);
  const patch = useOnboardingStore((s) => s.patch);

  const canContinue = weeklyFocusText.trim().length > 0;

  return (
    <OnboardingScreen step={4}>
      <View style={styles.body}>
        <Text style={styles.title}>Make this{'\n'}week count.</Text>
        <Text style={styles.subtitle}>Choose one small action you can complete.</Text>

        {goalTitle ? (
          <>
            <Text style={styles.label}>GOAL</Text>
            <View style={styles.goalCard}>
              <Text style={styles.goalText}>{goalTitle}</Text>
            </View>
          </>
        ) : null}

        <Text style={styles.label}>THIS WEEK</Text>
        <TextInput
          value={weeklyFocusText}
          onChangeText={(t) => patch({ weeklyFocusText: t })}
          placeholder="Sketch the first app flow"
          placeholderTextColor={theme.colors.muted}
          style={styles.input}
          maxLength={80}
          autoCapitalize="sentences"
          returnKeyType="done"
        />

        <Text style={styles.label}>QUICK IDEAS</Text>
        <View style={styles.suggestionList}>
          {SUGGESTIONS.map((s) => (
            <Pressable
              key={s}
              onPress={() => patch({ weeklyFocusText: s })}
              style={styles.suggestion}
              accessibilityRole="button"
              accessibilityLabel={`Use suggestion: ${s}`}
            >
              <Text style={styles.suggestionText}>{s}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.spacer} />
        <PrimaryButton
          label="Set this week's focus"
          onPress={() => router.push('/(onboarding)/finish')}
          disabled={!canContinue}
        />
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.xs },
  subtitle: { ...type.body, color: theme.colors.muted, marginBottom: space.xl },
  label: { ...type.label, color: theme.colors.muted, marginTop: space.md, marginBottom: space.sm },
  goalCard: {
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  goalText: { ...type.heading, color: theme.colors.text },
  input: {
    minHeight: 56,
    borderRadius: radius.input,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.accent, // amber outline shows this is the focus field
    paddingHorizontal: 16,
    color: theme.colors.text,
    ...type.body,
  },
  suggestionList: { gap: space.sm },
  suggestion: {
    minHeight: 48,
    borderRadius: radius.input,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  suggestionText: { ...type.body, color: theme.colors.text },
  spacer: { flex: 1 },
});
