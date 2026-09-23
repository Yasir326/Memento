// Root layout — loads fonts + SQLite settings, holds the splash until both
// resolve, then either lets the user into the app or redirects to
// onboarding based on UserSettings.onboardingCompletedAt.
//
// The doc calls for a local-first architecture (§13). This gate is the
// only place navigation depends on database state; every screen below
// just reads from useSession.

import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Stack, useRouter, useSegments } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts as useManrope,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
} from '@expo-google-fonts/manrope';
import { SourceSerif4_400Regular_Italic } from '@expo-google-fonts/source-serif-4';
import { theme } from '@/design/theme';
import { useSession } from '@/store/session';
import { resumeRoute, useOnboardingStore } from '@/store/onboarding';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontsError] = useManrope({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    SourceSerif4_400Regular_Italic,
  });

  const ready = useSession((s) => s.ready);
  const refreshSession = useSession((s) => s.refresh);
  const markReady = useSession((s) => s.markReady);
  // The persisted onboarding draft is read asynchronously; routing must not
  // run against an empty draft or every resume starts at the intro.
  const draftHydrated = useOnboardingStore((s) => s.hasHydrated);

  // Bootstrap: read the user's settings row (created by migrations) so the
  // gate below can decide where to route them. Uses the store's own refresh
  // so there is exactly one place that loads this row.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded = await refreshSession();
      // On a cold first launch migrations may still be creating the row.
      // One retry costs nothing and avoids booting into a blank screen
      // with no way forward, since the gate cannot route on null settings.
      if (!loaded && !cancelled) {
        await new Promise((r) => setTimeout(r, 300));
        if (!cancelled) loaded = await refreshSession();
      }
      if (!cancelled) markReady();
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSession, markReady]);

  const onLayout = useCallback(() => {
    if ((fontsLoaded || fontsError) && ready && draftHydrated) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError, ready, draftHydrated]);

  if ((!fontsLoaded && !fontsError) || !ready || !draftHydrated) return null;

  return (
    <SafeAreaProvider>
      <View style={styles.root} onLayout={onLayout}>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: theme.colors.canvas },
            animation: 'fade',
          }}
        />
        <OnboardingGate />
      </View>
    </SafeAreaProvider>
  );
}

/**
 * Redirect gate — sends anyone who has not finished setup back into it, at
 * the step they left off rather than the beginning (doc §06: "resume at the
 * last completed step with prior answers restored").
 *
 * Only acts from outside the onboarding and paywall groups, so it redirects
 * on app entry without fighting navigation inside the flow — including the
 * back chevron, which users are allowed to use on every step.
 */
function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const settings = useSession((s) => s.settings);
  const hasHydrated = useOnboardingStore((s) => s.hasHydrated);
  const lastCompletedStep = useOnboardingStore((s) => s.lastCompletedStep);

  useEffect(() => {
    if (!settings || !hasHydrated) return;
    const group = segments[0];
    if (group === '(onboarding)' || group === '(paywall)') return;
    if (settings.onboardingCompletedAt) return;
    router.replace(resumeRoute(lastCompletedStep));
  }, [settings, hasHydrated, lastCompletedStep, segments, router]);

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.canvas },
});
