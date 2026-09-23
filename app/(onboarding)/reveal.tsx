// Step 3 — Reveal. Personal life-grid appears with a staggered animation.
//
// Doc §06 says the reveal is NOT counted as setup work — no step indicator.
// Reduce-motion users get an immediate render instead of the stagger.
//
// After the reveal, "Choose what matters" leads into goal setting. The
// paywall comes at the END of onboarding, per doc §06 (step 8 Upgrade:
// "offer after the user has seen the grid and created value") and §07
// ("show once after the grid, first goal, and weekly action"). Selling
// three active goals to someone who has not made one yet asks them to
// value something they have not seen.

import React, { useCallback, useEffect, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { LifeGrid, REVEAL_DURATION_MS, useReduceMotion } from '@/features/time/LifeGrid';
import { getLifeState } from '@/domain/lifeState';
import { useOnboardingStore } from '@/store/onboarding';
import { theme } from '@/design/theme';
import { motion, space } from '@/design/tokens';
import { type } from '@/design/typography';

export default function Reveal() {
  const router = useRouter();
  const birthDate = useOnboardingStore((s) => s.birthDate);
  const projectedAge = useOnboardingStore((s) => s.projectedAge);
  const reduceMotion = useReduceMotion();

  const state = useMemo(() => {
    if (!birthDate) return null;
    return getLifeState({ birthDate, projectedAge });
  }, [birthDate, projectedAge]);

  // Choreography: the display number fades in first (500 ms), then the
  // grid runs its own staggered per-wave reveal (LifeGrid handles it via
  // the `reveal` prop). The caption + CTA follow so the composition
  // settles as one motion, not four independent fades.
  const numberOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const captionOpacity = useSharedValue(reduceMotion ? 1 : 0);
  const ctaOpacity = useSharedValue(reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) {
      numberOpacity.value = 1;
      captionOpacity.value = 1;
      ctaOpacity.value = 1;
      return;
    }
    numberOpacity.value = withTiming(1, {
      duration: motion.completion,
      easing: Easing.out(Easing.cubic),
    });
  }, [reduceMotion, numberOpacity, captionOpacity, ctaOpacity]);

  // The caption and CTA land when the grid says it has finished, rather
  // than on a delay hard-coded to match it. One source of truth for the
  // reveal's length means changing REVEAL_DURATION_MS cannot desynchronise
  // the composition — and under Reduce Motion the callback fires
  // immediately, so the CTA is never gated behind an animation that is
  // not running.
  const handleGridRevealed = useCallback(() => {
    if (reduceMotion) return;
    captionOpacity.value = withTiming(1, { duration: motion.standard });
    ctaOpacity.value = withDelay(140, withTiming(1, { duration: motion.standard }));
  }, [reduceMotion, captionOpacity, ctaOpacity]);

  // Safety net. The CTA is the only way off this screen, so it must never
  // be gated solely on an animation callback: if the reveal is interrupted
  // — remount, a cancelled animation, anything that swallows the callback —
  // an invisible button would strand the user here with no back path.
  // Worst case this fires first and the button simply appears on time.
  useEffect(() => {
    if (reduceMotion) return;
    const t = setTimeout(() => {
      captionOpacity.value = withTiming(1, { duration: motion.standard });
      ctaOpacity.value = withTiming(1, { duration: motion.standard });
    }, REVEAL_DURATION_MS + 900);
    return () => clearTimeout(t);
  }, [reduceMotion, captionOpacity, ctaOpacity]);

  const aNumber = useAnimatedStyle(() => ({ opacity: numberOpacity.value }));
  const aCaption = useAnimatedStyle(() => ({ opacity: captionOpacity.value }));
  const aCta = useAnimatedStyle(() => ({ opacity: ctaOpacity.value }));

  if (!state) {
    // Shouldn't happen — profile step guards this — but rendering a graceful
    // fallback beats a crash.
    return (
      <OnboardingScreen overline="MEMENTO">
        <View style={styles.body}>
          <Text style={styles.title}>Your birth date is missing.</Text>
          <PrimaryButton
            label="Go back"
            onPress={() => router.back()}
            variant="ghost"
          />
        </View>
      </OnboardingScreen>
    );
  }

  return (
    <OnboardingScreen overline="YOUR LIFE IN WEEKS">
      <View style={styles.body}>
        <Animated.View style={aNumber}>
          <Text style={styles.display}>{state.remainingWeeks.toLocaleString()}</Text>
          <Text style={styles.displaySub}>estimated weeks remain</Text>
        </Animated.View>

        <View style={styles.gridWrap}>
          {/* LifeGrid runs the sequential fill internally when reveal is
              set. Wrapping it in another Animated.View would fight that
              with a whole-grid opacity. */}
          <LifeGrid state={state} scale="life" reveal onRevealComplete={handleGridRevealed} />
        </View>

        <Animated.View style={aCaption}>
          <Text style={styles.caption}>About {state.remainingWeeks.toLocaleString()} weeks remain.</Text>
          <Text style={styles.captionSub}>One amber dot marks this week.</Text>
        </Animated.View>

        <View style={styles.spacer} />

        <Animated.View style={aCta}>
          <PrimaryButton
            label="Choose what matters"
            onPress={() => router.push('/(onboarding)/values')}
          />
        </Animated.View>
      </View>
    </OnboardingScreen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.md },
  display: { ...type.display, color: theme.colors.text, fontVariant: ['tabular-nums'] },
  displaySub: { ...type.small, color: theme.colors.muted, marginTop: -space.xs, marginBottom: space.lg },
  gridWrap: { alignItems: 'center', marginVertical: space.lg },
  caption: { ...type.body, color: theme.colors.text, textAlign: 'center', fontWeight: '600' },
  captionSub: { ...type.small, color: theme.colors.muted, textAlign: 'center', marginTop: space.xs },
  spacer: { flex: 1 },
});
