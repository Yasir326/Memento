// QuoteBlock — single sourced quote below the current focus.
//
// Doc rule (p.15): "One sourced quote. Refresh daily, not on every render."
// pickDailyQuote is deterministic on the day-of-year so the quote stays
// stable across cold-launches on the same day.

import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { theme } from '@/design/theme';
import { space } from '@/design/tokens';
import { type } from '@/design/typography';
import { pickDailyQuote } from '@/content/quotes';

export function QuoteBlock() {
  const quote = useMemo(() => pickDailyQuote(), []);
  return (
    <View style={styles.wrap} accessibilityRole="text">
      <Text style={styles.text}>{`"${quote.text}"`}</Text>
      <Text style={styles.author}>— {quote.author}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    alignItems: 'center',
  },
  text: {
    ...type.quote,
    color: theme.colors.text,
    textAlign: 'center',
    opacity: 0.85,
  },
  author: {
    ...type.small,
    color: theme.colors.muted,
    marginTop: space.xs,
    letterSpacing: 0.2,
  },
});
