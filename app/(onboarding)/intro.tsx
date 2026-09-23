// Step 1 — Meaning. Opens with the brand mark front and centre so the
// user meets the metaphor visually before reading a single word.
//
// Not counted as "Step 1 of 5" — the counter starts at the first INPUT
// screen (Time setup). Back is hidden because there's nowhere to go back
// to.

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useOnboardingStore } from '@/store/onboarding';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { BrandMark } from '@/features/onboarding/BrandMark';
import { theme } from '@/design/theme';
import { space } from '@/design/tokens';
import { type } from '@/design/typography';

export default function Intro() {
  const router = useRouter();
  const completeStep = useOnboardingStore((s) => s.completeStep);

  const onBegin = () => {
    completeStep('intro');
    router.push('/(onboarding)/profile');
  };
  return (
    <OnboardingScreen overline="MEMENTO" showBack={false}>
      <View style={styles.body}>
        <View style={styles.markWrap}>
          <BrandMark size={180} />
          <Text style={styles.tagline}>Your life in weeks</Text>
        </View>

        <Text style={styles.title}>Your time is finite.{'\n'}Make it visible.</Text>
        <Text style={styles.subtitle}>
          This is not a prediction. It is a way to turn abstract time into deliberate action.
        </Text>

        <View style={styles.spacer} />
        <PrimaryButton label="Begin" onPress={onBegin} />
        <Text style={styles.footnote}>Private by default · Stored on your device</Text>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: 'center' },
  markWrap: {
    alignItems: 'center',
    marginBottom: space.xxl,
  },
  tagline: {
    ...type.label,
    color: theme.colors.accent,
    marginTop: space.md,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  title: {
    ...type.title,
    color: theme.colors.text,
    marginBottom: space.md,
    textAlign: 'center',
  },
  subtitle: {
    ...type.body,
    color: theme.colors.muted,
    marginBottom: space.xl,
    textAlign: 'center',
    alignSelf: 'center',
    maxWidth: 320,
  },
  spacer: { flex: 1 },
  footnote: {
    ...type.small,
    color: theme.colors.muted,
    textAlign: 'center',
    marginTop: space.md,
    opacity: 0.75,
  },
});
