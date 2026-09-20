// Step 2 (STEP 1 OF 5) — Time setup. Birth date + planning horizon.
//
// Doc rules (§06):
//   - Show current age as a live-computed number so the user can see the
//     projection maths in play.
//   - Explain that horizon can be changed later in Settings.
//   - Validation: invalid birth date shows inline error and keeps the
//     entered value available for correction (doc §06 validation table).

import React, { useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { OnboardingScreen } from '@/features/onboarding/OnboardingScreen';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import { useOnboardingStore } from '@/store/onboarding';
import { updateUserSettings } from '@/repositories/userSettings';

const HORIZON_OPTIONS = [80, 85, 90] as const;

const isoToDate = (iso: string | null): Date | null => {
  if (!iso) return null;
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
};

const dateToIso = (d: Date): string =>
  `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;

const formatDisplayDate = (d: Date): string =>
  d.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });

export default function Profile() {
  const router = useRouter();
  const birthDate = useOnboardingStore((s) => s.birthDate);
  const projectedAge = useOnboardingStore((s) => s.projectedAge);
  const patch = useOnboardingStore((s) => s.patch);

  const [showPicker, setShowPicker] = useState(Platform.OS === 'ios');
  const [saving, setSaving] = useState(false);

  const birthDateObj = useMemo(() => isoToDate(birthDate) ?? defaultBirthDate(), [birthDate]);

  const currentAge = useMemo(() => {
    if (!birthDate) return null;
    const today = new Date();
    const age =
      today.getUTCFullYear() -
      birthDateObj.getUTCFullYear() -
      (today.getUTCMonth() < birthDateObj.getUTCMonth() ||
      (today.getUTCMonth() === birthDateObj.getUTCMonth() &&
        today.getUTCDate() < birthDateObj.getUTCDate())
        ? 1
        : 0);
    return age;
  }, [birthDate, birthDateObj]);

  const projectionInvalid = currentAge != null && currentAge >= projectedAge;

  const canContinue = birthDate != null && currentAge != null && currentAge >= 0 && !projectionInvalid;

  const onContinue = async () => {
    if (!canContinue) return;
    setSaving(true);
    try {
      await updateUserSettings({ birthDate, projectedAge });
      router.push('/(onboarding)/reveal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <OnboardingScreen step={1}>
      <ScrollView
        style={styles.body}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Set your time{'\n'}horizon.</Text>
        <Text style={styles.subtitle}>This creates a visual estimate, not a prediction.</Text>

        <Text style={styles.label}>DATE OF BIRTH</Text>
        <Pressable
          onPress={() => setShowPicker(true)}
          style={styles.field}
          accessibilityRole="button"
          accessibilityLabel="Date of birth"
        >
          <Text style={styles.fieldText}>
            {birthDate ? formatDisplayDate(birthDateObj) : 'Choose a date'}
          </Text>
        </Pressable>
        {showPicker ? (
          <View style={styles.pickerWrap}>
            <DateTimePicker
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              value={birthDateObj}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              onChange={(event, selected) => {
                if (Platform.OS !== 'ios') setShowPicker(false);
                if (selected) patch({ birthDate: dateToIso(selected) });
              }}
              themeVariant="dark"
              textColor={theme.colors.text}
            />
          </View>
        ) : null}

        <Text style={styles.label}>PLANNING HORIZON</Text>
        <Text style={styles.helper}>Choose the age used to draw your grid.</Text>
        <View style={styles.chipRow}>
          {HORIZON_OPTIONS.map((age) => {
            const selected = age === projectedAge;
            return (
              <Pressable
                key={age}
                onPress={() => patch({ projectedAge: age })}
                style={[styles.chip, selected && styles.chipSelected]}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
              >
                <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{age}</Text>
              </Pressable>
            );
          })}
        </View>

        {currentAge != null ? (
          <View style={styles.ageCard}>
            <Text style={styles.ageLabel}>Your current age</Text>
            <View style={styles.ageRow}>
              <Text style={styles.ageValue}>{currentAge}</Text>
              <Text style={styles.ageUnit}>years</Text>
            </View>
          </View>
        ) : null}

        {projectionInvalid ? (
          <Text style={styles.error}>
            Projection age must be greater than your current age. Choose a higher horizon.
          </Text>
        ) : null}

        <Text style={styles.footnote}>You can change the horizon later in Settings.</Text>
        <PrimaryButton
          label="Show my weeks"
          onPress={onContinue}
          disabled={!canContinue}
          loading={saving}
          style={styles.cta}
        />
      </ScrollView>
    </OnboardingScreen>
  );
}

// A neutral starting date that avoids implying a specific age. Roughly 30
// years ago from today. Only used as the picker's default value before the
// user selects anything.
function defaultBirthDate(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - 30, 0, 1));
}

const styles = StyleSheet.create({
  body: { flex: 1 },
  // Bottom padding pushes the CTA above the safe-area on smaller phones
  // (iPhone SE) once the DatePicker spinner has expanded the content past
  // one screen — otherwise it sits under the home-indicator swipe zone.
  scrollContent: { paddingBottom: 40 },
  cta: { marginTop: 24 },
  title: { ...type.title, color: theme.colors.text, marginBottom: space.xs },
  subtitle: { ...type.body, color: theme.colors.muted, marginBottom: space.xl },
  label: { ...type.label, color: theme.colors.muted, marginTop: space.md, marginBottom: space.sm },
  helper: { ...type.small, color: theme.colors.muted, marginBottom: space.sm },
  field: {
    minHeight: 56,
    borderRadius: radius.input,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  fieldText: { ...type.body, color: theme.colors.text },
  pickerWrap: {
    marginTop: space.sm,
    backgroundColor: theme.colors.raised,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    overflow: 'hidden',
  },
  chipRow: { flexDirection: 'row', gap: space.sm },
  chip: {
    paddingVertical: space.md,
    paddingHorizontal: space.lg,
    borderRadius: radius.pill,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
    minWidth: 64,
    alignItems: 'center',
  },
  chipSelected: { backgroundColor: theme.colors.accent, borderColor: theme.colors.accent },
  chipText: { ...type.body, color: theme.colors.muted },
  chipTextSelected: { color: theme.colors.onAccent, fontWeight: '600' },
  ageCard: {
    marginTop: space.lg,
    padding: space.lg,
    borderRadius: radius.card,
    backgroundColor: theme.colors.raised,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  ageLabel: { ...type.small, color: theme.colors.muted, marginBottom: space.xs },
  ageRow: { flexDirection: 'row', alignItems: 'baseline', gap: space.sm },
  ageValue: { ...type.display, fontSize: 40, lineHeight: 44, color: theme.colors.text },
  ageUnit: { ...type.body, color: theme.colors.muted },
  error: { ...type.small, color: theme.colors.danger, marginTop: space.md },
  footnote: { ...type.small, color: theme.colors.muted, marginTop: space.md, textAlign: 'center' },
});
