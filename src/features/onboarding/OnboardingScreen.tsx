// Shared onboarding screen chrome. Every onboarding step composes this so
// the top label, step indicator, back affordance, and content padding stay
// consistent per doc §06 "Progress and interaction rules".

import React from 'react';
import { KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Svg, { Path } from 'react-native-svg';
import { theme } from '@/design/theme';
import { size, space } from '@/design/tokens';
import { type } from '@/design/typography';

type Props = {
  /**
   * Step index (1..5) for the visible "Step X of 5" label. Doc rule: the
   * reveal and paywall are NOT counted as setup work — only input screens.
   * Omit `step` to hide the indicator entirely.
   */
  step?: number;
  totalSteps?: number;
  /** Optional short label above the title (e.g. "MEMENTO", "STEP 1 OF 5"). */
  overline?: string;
  /** Show a back chevron in the top-left. Default true; opening screen sets false. */
  showBack?: boolean;
  children: React.ReactNode;
};

const DEFAULT_TOTAL = 5;

export function OnboardingScreen({
  step,
  totalSteps = DEFAULT_TOTAL,
  overline,
  showBack = true,
  children,
}: Props) {
  const router = useRouter();
  const label = overline ?? (step != null ? `STEP ${step} OF ${totalSteps}` : undefined);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          {showBack ? (
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
                  strokeWidth={1.75}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </Svg>
            </Pressable>
          ) : (
            <View style={styles.backBtn} />
          )}
          {label ? <Text style={styles.overline}>{label}</Text> : null}
          <View style={styles.backBtn} />
        </View>
        <View style={styles.body}>{children}</View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.canvas },
  flex: { flex: 1 },
  header: {
    height: 48,
    paddingHorizontal: size.screenPaddingH,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center' },
  overline: { ...type.label, color: theme.colors.accent },
  body: {
    flex: 1,
    paddingHorizontal: size.screenPaddingH,
    paddingTop: space.lg,
    paddingBottom: space.xl,
  },
});
