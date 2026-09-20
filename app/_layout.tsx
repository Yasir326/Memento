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
import { getUserSettings } from '@/repositories/userSettings';
import { useSession } from '@/store/session';

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
  const setSettings = useSession((s) => s.setSettings);
  const markReady = useSession((s) => s.markReady);

  // Bootstrap: read the user's settings row (created by migrations) so the
  // gate below can decide where to route them.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const s = await getUserSettings();
        if (!cancelled) setSettings(s);
      } catch (e) {
        // Migrations may still be running on first launch. A retry loop
        // here is overkill for MVP — the error surfaces in Metro logs.
        if (!cancelled) setSettings(null);
      } finally {
        if (!cancelled) markReady();
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [setSettings, markReady]);

  const onLayout = useCallback(() => {
    if ((fontsLoaded || fontsError) && ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontsError, ready]);

  if ((!fontsLoaded && !fontsError) || !ready) return null;

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
 * Redirect gate — reads the loaded settings and pushes the user into
 * onboarding if they haven't completed it yet. Runs on route changes so
 * users can't skip onboarding by manually navigating to a deep link.
 */
function OnboardingGate() {
  const router = useRouter();
  const segments = useSegments();
  const settings = useSession((s) => s.settings);

  useEffect(() => {
    if (!settings) return;
    const inOnboarding = segments[0] === '(onboarding)';
    const inPaywall = segments[0] === '(paywall)';
    const completed = !!settings.onboardingCompletedAt;
    if (!completed && !inOnboarding && !inPaywall) {
      router.replace('/(onboarding)/intro');
    }
  }, [settings, segments, router]);

  return null;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: theme.colors.canvas },
});
