// WeeklyFocusSheet — set or change the one action for the current week.
//
// Doc §06/§08: one small action, optionally attached to a goal. Kept to a
// single input plus a goal chooser so it can be completed in the seconds
// someone has while standing up from their desk.

import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BottomSheet } from '@/design/components/BottomSheet';
import { TextField } from '@/design/components/TextField';
import { PrimaryButton } from '@/features/onboarding/PrimaryButton';
import { theme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { type } from '@/design/typography';
import type { Goal } from '@/repositories/goals';

type Props = {
  visible: boolean;
  initialText?: string | null;
  initialGoalId?: string | null;
  goals: Goal[];
  onClose: () => void;
  onSave: (text: string, goalId: string | null) => Promise<void> | void;
};

const MAX_LENGTH = 120;

export function WeeklyFocusSheet({
  visible,
  initialText,
  initialGoalId,
  goals,
  onClose,
  onSave,
}: Props) {
  const [text, setText] = useState(initialText ?? '');
  const [goalId, setGoalId] = useState<string | null>(initialGoalId ?? null);
  const [saving, setSaving] = useState(false);

  // Re-seed each time the sheet opens so a cancelled edit doesn't persist
  // into the next one.
  useEffect(() => {
    if (visible) {
      setText(initialText ?? '');
      setGoalId(initialGoalId ?? null);
      setSaving(false);
    }
  }, [visible, initialText, initialGoalId]);

  const trimmed = text.trim();

  const handleSave = async () => {
    if (!trimmed || saving) return;
    setSaving(true);
    try {
      await onSave(trimmed, goalId);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      title="Make this week count"
      subtitle="One small action you can actually finish."
      onClose={onClose}
    >
      <TextField
        label="This week"
        value={text}
        onChangeText={setText}
        placeholder="Sketch the first app flow"
        maxLength={MAX_LENGTH}
        multiline
        returnKeyType="done"
        blurOnSubmit
        onSubmitEditing={handleSave}
        hint={`${trimmed.length}/${MAX_LENGTH}`}
      />

      {goals.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.label}>TOWARD A GOAL (OPTIONAL)</Text>
          <View style={styles.chips}>
            {goals.map((goal) => {
              const selected = goal.id === goalId;
              return (
                <Pressable
                  key={goal.id}
                  onPress={() => setGoalId(selected ? null : goal.id)}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  accessibilityLabel={goal.title}
                  style={[styles.chip, selected && styles.chipSelected]}
                >
                  <Text
                    style={[styles.chipText, selected && styles.chipTextSelected]}
                    numberOfLines={1}
                  >
                    {goal.title}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      ) : null}

      <PrimaryButton
        label="Set this week's focus"
        onPress={handleSave}
        disabled={!trimmed}
        loading={saving}
      />
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  section: { gap: space.md },
  label: { ...type.label, color: theme.colors.muted },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  chip: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: space.lg,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    maxWidth: '100%',
  },
  chipSelected: { borderColor: theme.colors.accent, backgroundColor: theme.colors.canvas },
  chipText: { ...type.small, color: theme.colors.muted },
  chipTextSelected: { color: theme.colors.accent },
});
