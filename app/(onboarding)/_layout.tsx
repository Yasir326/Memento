// Onboarding stack. Disables swipe-back on all steps so the user can't
// accidentally lose progress with an edge swipe; back is still available
// via the header chevron on every step per doc §06.

import { Stack } from 'expo-router';
import { theme } from '@/design/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        gestureEnabled: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: theme.colors.canvas },
      }}
    />
  );
}
