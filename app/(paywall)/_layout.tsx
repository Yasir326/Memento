// Paywall stack. Presented as a modal-ish overlay so it feels distinct from
// the onboarding stack but still respects the top-level dark theme.

import { Stack } from 'expo-router';
import { theme } from '@/design/theme';

export default function PaywallLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        contentStyle: { backgroundColor: theme.colors.canvas },
        animation: 'fade_from_bottom',
      }}
    />
  );
}
