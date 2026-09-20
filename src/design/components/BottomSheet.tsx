// BottomSheet — the product's one modal surface.
//
// Doc §09: "Near-black raised surface, large top radius, short title, and
// one main action." Built on RN's Modal rather than a gesture library so it
// inherits platform dismissal (Android back button, iOS accessibility
// escape) for free, and so Reduce Motion is handled by the OS.
//
// Deliberately not a drag-to-dismiss sheet: every sheet here holds a text
// input, and a drag handle above a keyboard is a reliable way to lose
// someone's typing.

import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '@/design/theme';
import { radius, size, space } from '@/design/tokens';
import { type } from '@/design/typography';

type Props = {
  visible: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function BottomSheet({ visible, title, subtitle, onClose, children }: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.root}>
        <Pressable
          style={styles.scrim}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.sheetWrap}
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + size.bottomSheetPadding }]}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.body}
            >
              {children}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.scrim },
  sheetWrap: { width: '100%' },
  sheet: {
    backgroundColor: theme.colors.raised,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: size.bottomSheetPadding,
    paddingTop: size.bottomSheetPadding,
    maxHeight: '88%',
  },
  header: { gap: space.xs, marginBottom: space.lg },
  title: { ...type.heading, color: theme.colors.text },
  subtitle: { ...type.small, color: theme.colors.muted },
  body: { gap: space.lg, paddingBottom: space.sm },
});
