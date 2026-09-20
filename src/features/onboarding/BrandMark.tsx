// The Memento brand mark — a 5×5 dot field where past rows are filled
// warm-bone, the centre dot is the amber "current week", and future rows
// are hollow rings. Rendered inline as SVG (rather than importing the
// bundled PNG) so it stays sharp at any scale.
//
// Layout matches the brand kit `memento-mark-dark.svg`:
//   • Rows 0-1: 10 filled bone dots (elapsed)
//   • Row 2: 2 bone + 1 amber (centre) + 2 bone
//   • Rows 3-4: 10 hollow rings (future)
//
// Motion: the amber centre breathes on a 2400 ms loop, ease-in-out. The
// pulse is driven by an `Animated.View` overlaid at the centre position
// rather than an animated SVG <Circle>, because `useAnimatedProps` on
// react-native-svg 15 + Reanimated 3.16 is flaky for opacity. View-level
// animation is reliable across the stack.

import React, { useEffect, useState } from 'react';
import { AccessibilityInfo, View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { theme } from '@/design/theme';

type Props = {
  /** Overall size of the mark, in pt. Defaults to a screen-friendly 160. */
  size?: number;
};

export function BrandMark({ size = 160 }: Props) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const opacity = useSharedValue(1);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => sub.remove();
  }, []);

  useEffect(() => {
    if (reduceMotion) {
      opacity.value = 1;
      return;
    }
    opacity.value = withRepeat(
      withTiming(0.35, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(opacity);
  }, [reduceMotion, opacity]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  // Layout maths — geometry derived from `size` so the mark scales
  // cleanly. 5 cols/rows with a dot:gap ratio of ~1.4.
  const cols = 5;
  const rows = 5;
  const dot = size / (cols + (cols - 1) * 0.5);
  const gap = dot * 0.5;
  const totalW = cols * dot + (cols - 1) * gap;
  const totalH = rows * dot + (rows - 1) * gap;

  const centreCx = 2 * (dot + gap) + dot / 2;
  const centreCy = 2 * (dot + gap) + dot / 2;

  const dotAt = (row: number, col: number) => ({
    cx: col * (dot + gap) + dot / 2,
    cy: row * (dot + gap) + dot / 2,
  });

  return (
    <View
      style={[styles.wrap, { width: totalW, height: totalH }]}
      accessible
      accessibilityLabel="Memento brand mark"
    >
      <Svg width={totalW} height={totalH} style={StyleSheet.absoluteFillObject}>
        {Array.from({ length: rows }).map((_, row) =>
          Array.from({ length: cols }).map((_, col) => {
            const { cx, cy } = dotAt(row, col);
            const isCentre = row === 2 && col === 2;
            if (isCentre) return null; // Rendered as an animated overlay below.
            const isFuture = row >= 3;
            if (isFuture) {
              return (
                <Circle
                  key={`${row}-${col}`}
                  cx={cx}
                  cy={cy}
                  r={dot / 2 - 1.5}
                  stroke={theme.colors.muted}
                  strokeWidth={2}
                  fill="transparent"
                />
              );
            }
            return (
              <Circle
                key={`${row}-${col}`}
                cx={cx}
                cy={cy}
                r={dot / 2}
                fill={theme.colors.elapsed}
              />
            );
          }),
        )}
      </Svg>

      {/* Pulsing amber centre as a plain View overlay. */}
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: 'absolute',
            left: centreCx - dot / 2,
            top: centreCy - dot / 2,
            width: dot,
            height: dot,
            borderRadius: dot / 2,
            backgroundColor: theme.colors.accent,
          },
          !reduceMotion && pulseStyle,
        ]}
      />

      {reduceMotion ? (
        // Static ring aids visibility when motion is off.
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: centreCx - dot / 2 - 3,
            top: centreCy - dot / 2 - 3,
            width: dot + 6,
            height: dot + 6,
            borderRadius: (dot + 6) / 2,
            borderWidth: 1,
            borderColor: theme.colors.accent,
          }}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
});
