// LifeGrid — the visual centrepiece of Memento.
//
// Renders the elapsed / current / future weeks as a memoised SVG tree, per
// the doc's rendering strategy (p.26): a SINGLE drawing surface, not one
// React component per week. On a ~85-year projection this is ~4,400 dots;
// individual React components would be catastrophically slow.
//
// The current-week dot has a subtle breathing pulse (2400ms loop, ease
// in-out) that respects the reduce-motion accessibility setting per section
// 10 of the doc — when reduced, it becomes a static amber ring.
//
// Scales: only `life` and `year` are implemented in this slice. `week` and
// `today` show placeholder content (deferred to a later slice).

import React, { useMemo, useEffect, useState } from 'react';
import { View, StyleSheet, AccessibilityInfo, useWindowDimensions } from 'react-native';
import Svg, { Rect, Circle } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import { theme } from '@/design/theme';
import { size } from '@/design/tokens';
import type { LifeState } from '@/domain/lifeState';

export type Scale = 'life' | 'year' | 'week' | 'today';

type Props = {
  state: LifeState;
  scale: Scale;
  /** Width of the parent container in points; grid sizes itself to this. */
  width?: number;
  /**
   * If true, dots appear in a staggered "wave" fill instead of rendering
   * all at once. Total duration matches the doc §10 grid-reveal window
   * (900–1300 ms). The current-week dot fades in when the wave reaches
   * its position, then starts its normal breathing pulse.
   */
  reveal?: boolean;
};

// Total reveal duration. The grid fills week-by-week in chunks over this
// window — a bit longer than the doc's 900–1300 ms spec because a fully
// sequential fill needs breathing room to actually read as dramatic.
const REVEAL_TOTAL_MS = 2200;
// Number of setState steps we drive the reveal through. ~60 chunks over
// 2.2 s = ~37 ms per step, roughly 1.7× frame rate — plenty granular so
// the eye reads it as continuous "one-by-one" while keeping React
// reconciliation cost bounded.
const REVEAL_CHUNKS = 60;
// Duration of the current-week dot breathing pulse.
const PULSE_MS = 2400;

export function LifeGrid({ state, scale, width: propWidth, reveal = false }: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const width = propWidth ?? Math.min(screenWidth - 48, 380);
  const [reduceMotion, setReduceMotion] = React.useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion);
    const sub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotion,
    );
    return () => sub.remove();
  }, []);

  if (scale === 'week' || scale === 'today') {
    // Deferred — scale switcher still lets you pick these; the placeholder
    // reads as intentional rather than broken.
    return <ScalePlaceholder scale={scale} width={width} />;
  }

  return scale === 'life' ? (
    <LifeScale state={state} width={width} reduceMotion={reduceMotion} reveal={reveal} />
  ) : (
    <YearScale state={state} width={width} reduceMotion={reduceMotion} reveal={reveal} />
  );
}

// ─── Life scale ───────────────────────────────────────────────────────────
// One dot per week for the whole projected horizon. Rows = years (52 cols).

function LifeScale({
  state,
  width,
  reduceMotion,
  reveal,
}: {
  state: LifeState;
  width: number;
  reduceMotion: boolean;
  reveal: boolean;
}) {
  const cols = 52;
  const rows = Math.ceil(state.totalWeeks / cols);

  // Geometry — dots and gaps scale together within the doc's 6-10 px range.
  const { dot, gap, padding, svgWidth, svgHeight } = useMemo(() => {
    const available = width - 24; // ~ small internal breathing room
    // width = cols*dot + (cols-1)*gap; ratio dot:gap held at 6:4
    const step = available / (cols + (cols - 1) * (4 / 6));
    const rawDot = Math.max(size.lifeDotMin, Math.min(size.lifeDotMax, step));
    const rawGap = Math.max(size.lifeDotGapMin, Math.min(size.lifeDotGapMax, rawDot * (4 / 6)));
    const w = cols * rawDot + (cols - 1) * rawGap + 24;
    const h = rows * rawDot + (rows - 1) * rawGap + 24;
    return { dot: rawDot, gap: rawGap, padding: 12, svgWidth: w, svgHeight: h };
  }, [width, rows]);

  // Precompute per-cell layout as a single flat array — dramatically cheaper
  // than deriving positions inside each Circle at render time.
  const cells = useMemo(() => {
    const out: Array<{
      key: string;
      cx: number;
      cy: number;
      kind: 'elapsed' | 'current' | 'future';
    }> = [];
    for (let i = 0; i < state.totalWeeks; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = padding + col * (dot + gap) + dot / 2;
      const cy = padding + row * (dot + gap) + dot / 2;
      const kind: 'elapsed' | 'current' | 'future' =
        i < state.livedWeeks ? 'elapsed' : i === state.livedWeeks ? 'current' : 'future';
      out.push({ key: `${row}-${col}`, cx, cy, kind });
    }
    return out;
  }, [state.totalWeeks, state.livedWeeks, dot, gap, padding]);

  const currentCell = cells[state.livedWeeks];
  const elapsedTotal = state.livedWeeks;

  // Progressive count-driven reveal — ONLY the filled (elapsed) dots
  // cascade in. The future/hollow grid is drawn statically as the visual
  // container of a life yet to be lived, and the bone dots fill into it
  // one by one until the amber current-week dot lands. This makes the
  // animation *mean* something — you are watching elapsed weeks fill up.
  //
  // `revealedElapsed` grows from 0 to livedWeeks across REVEAL_CHUNKS
  // setTimeout ticks. Each tick React re-renders the SVG with only the
  // first N elapsed cells visible.
  const [revealedElapsed, setRevealedElapsed] = useState(
    reveal && !reduceMotion ? 0 : elapsedTotal,
  );

  useEffect(() => {
    if (!reveal || reduceMotion) {
      setRevealedElapsed(elapsedTotal);
      return;
    }
    setRevealedElapsed(0);
    const stepMs = REVEAL_TOTAL_MS / REVEAL_CHUNKS;
    let cancelled = false;
    let step = 0;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const tick = () => {
      if (cancelled) return;
      step += 1;
      const frac = step / REVEAL_CHUNKS;
      // Ease-out cubic — starts fast, decelerates into the current week,
      // so the final dots land with weight rather than whipping past.
      const eased = 1 - Math.pow(1 - frac, 3);
      const count = Math.min(elapsedTotal, Math.floor(eased * elapsedTotal));
      setRevealedElapsed(count);
      if (step < REVEAL_CHUNKS) {
        timer = setTimeout(tick, stepMs);
      }
    };
    timer = setTimeout(tick, stepMs);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [reveal, reduceMotion, elapsedTotal]);

  // Current-week dot breathing pulse — the "last dot pulsating" the
  // user sees once the reveal completes. Rendered as a plain
  // `Animated.View` overlay at the SVG's (cx, cy) so opacity animates
  // reliably at the native View level.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.45, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // The amber current-week dot lands as soon as every elapsed dot before
  // it has been drawn — the "you are here" cap on the cascade.
  const currentDotVisible = revealedElapsed >= elapsedTotal;

  return (
    <View style={styles.gridWrap}>
      <View style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
        <Svg width={svgWidth} height={svgHeight}>
          {/* Future dots — always rendered so the empty grid is visible
              from the start, forming the visual container that the
              elapsed dots fill into. */}
          {cells.map((c) => {
            if (c.kind !== 'future') return null;
            return (
              <Circle
                key={c.key}
                cx={c.cx}
                cy={c.cy}
                r={dot / 2}
                fill={theme.colors.future}
              />
            );
          })}
          {/* Elapsed dots — cascade in one at a time. */}
          {cells.map((c, i) => {
            if (c.kind !== 'elapsed') return null;
            if (i >= revealedElapsed) return null;
            return (
              <Circle
                key={c.key}
                cx={c.cx}
                cy={c.cy}
                r={dot / 2}
                fill={theme.colors.elapsed}
              />
            );
          })}
        </Svg>

        {currentCell && currentDotVisible ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: currentCell.cx - dot / 2,
                top: currentCell.cy - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: theme.colors.accent,
              },
              !reduceMotion && pulseStyle,
            ]}
          />
        ) : null}
        {reduceMotion && currentCell && currentDotVisible ? (
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: currentCell.cx - dot / 2 - 2,
              top: currentCell.cy - dot / 2 - 2,
              width: dot + 4,
              height: dot + 4,
              borderRadius: (dot + 4) / 2,
              borderWidth: 1,
              borderColor: theme.colors.accent,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Year scale ───────────────────────────────────────────────────────────
// Single row of 52 dots for the current year, with weeks-so-far filled.

function YearScale({
  state,
  width,
  reduceMotion,
  reveal,
}: {
  state: LifeState;
  width: number;
  reduceMotion: boolean;
  reveal: boolean;
}) {
  // Year scale is 52 cells — no need for waves. Suppress the `reveal` prop
  // here: whichever screen uses year scale gets an instant render.
  void reveal;
  const cols = 52;
  const weekOfYear = weekOfYearFor(state.currentWeekStart);

  const { dot, gap, svgWidth, svgHeight } = useMemo(() => {
    const available = width - 24;
    const step = available / (cols + (cols - 1) * 0.7);
    const rawDot = Math.max(10, Math.min(14, step));
    const rawGap = rawDot * 0.7;
    return {
      dot: rawDot,
      gap: rawGap,
      svgWidth: cols * rawDot + (cols - 1) * rawGap + 24,
      svgHeight: rawDot + 24,
    };
  }, [width]);

  const cells = useMemo(() => {
    const out: Array<{
      key: number;
      cx: number;
      cy: number;
      kind: 'elapsed' | 'current' | 'future';
    }> = [];
    for (let i = 0; i < cols; i++) {
      out.push({
        key: i,
        cx: 12 + i * (dot + gap) + dot / 2,
        cy: 12 + dot / 2,
        kind: i < weekOfYear ? 'elapsed' : i === weekOfYear ? 'current' : 'future',
      });
    }
    return out;
  }, [dot, gap, weekOfYear]);

  const currentCell = cells[weekOfYear];

  // Year-scale current dot pulse — same View-overlay pattern as LifeScale.
  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion) {
      pulse.value = 1;
      return;
    }
    pulse.value = withRepeat(
      withTiming(0.45, { duration: PULSE_MS, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
    return () => cancelAnimation(pulse);
  }, [reduceMotion, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View style={styles.gridWrap}>
      <View style={{ width: svgWidth, height: svgHeight, position: 'relative' }}>
        <Svg width={svgWidth} height={svgHeight}>
          {cells.map((c) => {
            if (c.kind === 'current') return null;
            return (
              <Circle
                key={c.key}
                cx={c.cx}
                cy={c.cy}
                r={dot / 2}
                fill={c.kind === 'elapsed' ? theme.colors.elapsed : theme.colors.future}
              />
            );
          })}
        </Svg>
        {currentCell ? (
          <Animated.View
            pointerEvents="none"
            style={[
              {
                position: 'absolute',
                left: currentCell.cx - dot / 2,
                top: currentCell.cy - dot / 2,
                width: dot,
                height: dot,
                borderRadius: dot / 2,
                backgroundColor: theme.colors.accent,
              },
              !reduceMotion && pulseStyle,
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

// ─── Placeholder for deferred scales ──────────────────────────────────────

function ScalePlaceholder({ scale, width }: { scale: Scale; width: number }) {
  return (
    <View
      style={[
        styles.gridWrap,
        styles.placeholder,
        { width, height: Math.max(180, width * 0.55) },
      ]}
      accessibilityLabel={`${scale} scale — coming next`}
    >
      <View style={styles.placeholderInner}>
        <Svg width={64} height={64}>
          <Rect x={16} y={16} width={32} height={32} rx={8} fill={theme.colors.future} />
        </Svg>
      </View>
    </View>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function weekOfYearFor(currentWeekStart: Date): number {
  // Simple ISO-style: weeks since Jan 1 of the same year, clamped to [0, 51].
  const yearStart = new Date(
    Date.UTC(currentWeekStart.getUTCFullYear(), 0, 1),
  );
  const days = Math.floor(
    (currentWeekStart.getTime() - yearStart.getTime()) / 86_400_000,
  );
  return Math.max(0, Math.min(51, Math.floor(days / 7)));
}

const styles = StyleSheet.create({
  gridWrap: {
    backgroundColor: theme.colors.raised,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderInner: {
    opacity: 0.4,
  },
});
