// Memento Pro paywall. Design per doc §07.
//
// Shown as the final onboarding step, after the grid, the first goal and
// the weekly action exist — doc §06 step 8 and §07's end-of-onboarding
// trigger. Also reachable later from Settings and contextual Pro gates.
//
// This session ships a UI stub — RevenueCat integration is a follow-up.
// The stub sets isPro on UserSettings so the rest of the app can react
// to it, and shows the same UI flows a real paywall would (loading,
// success). Prices are hardcoded to the doc's launch test values; a real
// build must load them from store product data.

import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import { updateUserSettings } from '@/repositories/userSettings';
import { useSession } from '@/store/session';

const BENEFITS = [
  { label: '03', text: 'active goals with weekly focus' },
  { label: '≡', text: 'reflection history and insights' },
  { label: '◐', text: 'focused reminders and widgets' },
] as const;

type Plan = 'yearly' | 'monthly';

export default function Paywall() {
  const router = useRouter();
  const [selected, setSelected] = useState<Plan>('yearly');
  const [busy, setBusy] = useState(false);
  const refreshSession = useSession((s) => s.refresh);

  // Last step of onboarding: both paths land on the home screen, and the
  // free path is never worse than a dead end (doc §07 rule 5).
  const proceed = () => router.replace('/');

  const onStartTrial = async () => {
    setBusy(true);
    try {
      // STUB: real RevenueCat purchase happens here. Sandbox purchase, then
      // customer info refresh, then setting isPro. We simulate success.
      await new Promise((r) => setTimeout(r, 400));
      await updateUserSettings({ isPro: true });
      await refreshSession();
      proceed();
    } finally {
      setBusy(false);
    }
  };

  const onContinueFree = () => {
    // Free tier is always a first-class option per doc §07 rule 5.
    proceed();
  };

  return (
    <OnboardingScreen overline="MEMENTO PRO" showBack={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <Text style={styles.title}>Make your weeks{'\n'}count on purpose.</Text>

        <View style={styles.benefits}>
          {BENEFITS.map((b) => (
            <View key={b.text} style={styles.benefit}>
              <View style={styles.benefitIcon}>
                <Text style={styles.benefitIconText}>{b.label}</Text>
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </View>

        <View style={styles.planWrap}>
          <PlanCard
            plan="yearly"
            selected={selected === 'yearly'}
            onPress={() => setSelected('yearly')}
            title="Yearly"
            price="£29.99"
            perLabel="per year"
            badge="BEST VALUE"
            perMonthEquivalent="£2.50/mo"
            trialLine="7 days free, then £29.99/year"
          />
          <PlanCard
            plan="monthly"
            selected={selected === 'monthly'}
            onPress={() => setSelected('monthly')}
            title="Monthly"
            price="£4.99"
            perLabel="per month"
            perMonthEquivalent={null}
            trialLine={null}
          />
        </View>

        <Text style={styles.finePrint}>
          {selected === 'yearly'
            ? '7 days free, then £29.99/year. Auto-renews until cancelled. Cancel anytime.'
            : '£4.99/month, charged today. Auto-renews until cancelled. Cancel anytime.'}
        </Text>

        <PrimaryButton
          label={selected === 'yearly' ? 'Start my free trial' : 'Subscribe'}
          onPress={onStartTrial}
          loading={busy}
          style={styles.cta}
        />

        <Pressable onPress={onContinueFree} style={styles.freeBtn} accessibilityRole="button">
          <Text style={styles.freeBtnText}>Continue with Free</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerLink}>Restore purchase</Text>
          <Text style={styles.footerLink}>Cancel anytime · Terms · Privacy</Text>
        </View>
      </ScrollView>
    </OnboardingScreen>
  );
}

// ─── Plan card ─────────────────────────────────────────────────────────
function PlanCard({
  plan: _plan,
  selected,
  onPress,
  title,
  price,
  perLabel,
  badge,
  perMonthEquivalent,
  trialLine,
}: {
  plan: Plan;
  selected: boolean;
  onPress: () => void;
  title: string;
  price: string;
  perLabel: string;
  badge?: string;
  perMonthEquivalent: string | null;
  trialLine: string | null;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.plan, selected && styles.planSelected]}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${title} plan`}
    >
      {badge ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      ) : null}
      <View style={styles.planRow}>
        <View style={styles.planMain}>
          <Text style={styles.planTitle}>{title}</Text>
          <Text style={styles.planPer}>{perLabel}</Text>
        </View>
        <View style={styles.planPriceCol}>
          <Text style={styles.planPrice}>{price}</Text>
          {perMonthEquivalent ? <Text style={styles.planPerMonth}>{perMonthEquivalent}</Text> : null}
        </View>
      </View>
      {trialLine ? <Text style={styles.planTrial}>{trialLine}</Text> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scroll: { flexGrow: 1 },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.xl },
  benefits: { gap: space.md, marginBottom: space.xl },
  benefit: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitIconText: { ...type.small, color: theme.colors.accent, fontWeight: '700' },
  benefitText: { ...type.body, color: theme.colors.text },
  planWrap: { gap: space.md, marginBottom: space.lg },
  plan: {
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    position: 'relative',
  },
  planSelected: { borderColor: theme.colors.accent, borderWidth: 2 },
  badge: {
    position: 'absolute',
    top: -10,
    right: 16,
    backgroundColor: theme.colors.accent,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  badgeText: { ...type.label, color: theme.colors.onAccent, fontSize: 10 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  planMain: { gap: space.xs },
  planTitle: { ...type.heading, color: theme.colors.text },
  planPer: { ...type.small, color: theme.colors.muted },
  planPriceCol: { alignItems: 'flex-end', gap: 2 },
  planPrice: { ...type.heading, color: theme.colors.text, fontFamily: undefined },
  planPerMonth: { ...type.small, color: theme.colors.accent, fontWeight: '600' },
  planTrial: {
    ...type.small,
    color: theme.colors.muted,
    marginTop: space.sm,
    paddingTop: space.sm,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  finePrint: {
    ...type.small,
    color: theme.colors.muted,
    textAlign: 'center',
    marginBottom: space.md,
    lineHeight: 20,
  },
  cta: { marginBottom: space.md },
  freeBtn: { alignItems: 'center', paddingVertical: space.md, marginBottom: space.sm },
  freeBtnText: { ...type.body, color: theme.colors.text, fontWeight: '600' },
  footer: { alignItems: 'center', gap: space.xs, marginTop: space.sm },
  footerLink: { ...type.small, color: theme.colors.muted },
});
