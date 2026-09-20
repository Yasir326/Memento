// TextField — persistent label, 16 pt text, visible focus ring, error copy
// below. Doc §09, "Inputs".

import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { theme } from '@/design/theme';
import { radius, size, space } from '@/design/tokens';
import { type } from '@/design/typography';

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  hint?: string;
};

export function TextField({ label, error, hint, style, ...rest }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...rest}
        onFocus={(e) => {
          setFocused(true);
          rest.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          rest.onBlur?.(e);
        }}
        placeholderTextColor={theme.colors.muted}
        style={[
          styles.input,
          focused && styles.inputFocused,
          !!error && styles.inputError,
          style,
        ]}
        accessibilityLabel={label}
      />
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  label: { ...type.label, color: theme.colors.muted },
  input: {
    ...type.body,
    color: theme.colors.text,
    minHeight: size.inputMinHeight,
    borderRadius: radius.input,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.canvas,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
  },
  // Doc: "amber 2 px focus border".
  inputFocused: { borderColor: theme.colors.accent, borderWidth: 2 },
  inputError: { borderColor: theme.colors.danger },
  error: { ...type.small, color: theme.colors.danger },
  hint: { ...type.small, color: theme.colors.muted },
});
