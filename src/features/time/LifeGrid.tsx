// LifeGrid — the visual centrepiece of Memento.
//
// ─── How the reveal works ─────────────────────────────────────────────────
//
// The obvious way to fill a grid "one dot at a time" is to hold a count in
// React state and render the first N dots. That is what this component used
// to do, and it is a trap: every tick re-reconciles the whole SVG tree —
// roughly 4,400 <Circle> nodes for an 85-year projection — on the JS thread.
// Sixty ticks meant sixty full reconciliations, which drops frames badly on
// mid-range Android and competes with anything else the app is doing.
//
// This version never re-renders during the animation. Not once.
//
// Three static layers, drawn exactly once:
//
//   1. ELAPSED    every lived week, in warm white. Always fully drawn.
//   2. CURTAIN B  a one-row-tall opaque band carrying a row of placeholder
//                 dots. Sits over the row currently being filled.
//   3. CURTAIN A  a full-height opaque block carrying placeholder dots.
//                 Sits over every row below the one being filled.
//
// The curtains are painted in the card's own surface colour and carry the
// low-contrast "future" dots, so they are indistinguishable from an unfilled
// grid. Revealing a dot means sliding a curtain off it. Both curtains move
// by TRANSFORM ONLY — no layout, no React state, no SVG prop mutation — so
// the entire animation runs on the UI thread as compositor work.
//
// The horizontal sweep is quantised to whole dot positions. That keeps each
// curtain's dot pattern perfectly aligned with the grid underneath it (the
// whole trick depends on translating by exact multiples of the dot pitch),
// and it is also what makes the fill read as discrete weeks landing rather
// than a bar wiping across.
//
// Reduce Motion (§17): the shared value is set to its final value on mount
// instead of animating. Same render path, no special-case tree — the grid
// simply appears complete, and the current-week dot becomes a static ring.

import React, { useCallback, useEffect, useMemo } from 'react';
import { AccessibilityInfo, StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import Animated, {
  Easing,
  cancelAnimation,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { theme } from '@/design/theme';
import { radius, size, space } from '@/design/tokens';
import { weekOfYear } from '@/domain/dates';
import type { LifeState } from '@/domain/lifeState';

export type Scale = 'life' | 'year' | 'week' | 'today';

type Props = {
  state: LifeState;
  scale: Scale;
  /** Width of the parent container in points; the grid sizes itself to this. */
  width?: number;
  /** Run the sequential fill. When false the grid renders complete. */
  reveal?: boolean;
  /**
   * Total fill duration. The brief calls for 3–5 s: long enough to feel
   * deliberate, short enough that nobody waits on it. Default sits at the
   * lower end because the user cannot interact until it lands.
   */
  revealDurationMs?: number;
  /** Fires once the last dot lands (or immediately under Reduce Motion). */
  onRevealComplete?: () => void;
};

export const REVEAL_DURATION_MS = 3400;
/** Current-week breathing loop (doc §10: 2400 ms, ease in-out). */
const PULSE_MS = 2400;
/** How long the amber dot takes to settle in after the sweep passes it. */
const CURRENT_DOT_IN_MS = 420;
const WEEKS_PER_ROW = 52;

export function LifeGrid({
  state,
  scale,
  width: propWidth,
  reveal = false,
  revealDurationMs = REVEAL_DURATION_MS,
  onRevealComplete,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const width = propWidth ?? Math.min(screenWidth - size.screenPaddingH * 2, 380);
  // `null` until the OS setting is known — see useReduceMotionState.
  const reduceMotion = useReduceMotionState();

  if (scale === 'week' || scale === 'today') {
    // Deferred scales. The placeholder reads as intentional rather than broken.
    return <ScalePlaceholder scale={scale} width={width} />;
  }

  return scale === 'life' ? (
    <LifeScale
      state={state}
      width={width}
      reduceMotion={reduceMotion}
      reveal={reveal}
      revealDurationMs={revealDurationMs}
      onRevealComplete={onRevealComplete}
    />
  ) : (
    <YearScale state={state} width={width} reduceMotion={reduceMotion} />
  );
}

// ─── Life scale ───────────────────────────────────────────────────────────
// One dot per week across the whole projected horizon. 52 columns, one row
// per year, so rows read as years and columns as weeks within a year.

type ScaleProps = {
  state: LifeState;
  width: number;
  /** null while the OS setting is still being read. */
  reduceMotion: boolean | null;
  reveal: boolean;
  revealDurationMs: number;
  onRevealComplete?: () => void;
};

function LifeScale({
  state,
  width,
  reduceMotion,
  reveal,
  revealDurationMs,
  onRevealComplete,
}: ScaleProps) {
  const rows = Math.ceil(state.totalWeeks / WEEKS_PER_ROW);

  // Geometry. Dot and gap scale together inside the doc's 6–10 px / 4–6 px
  // range, so the grid stays legible from a small phone to a tablet.
  const geom = useMemo(() => {
    const available = width - GRID_INSET * 2;
    // available = cols*dot + (cols-1)*gap, holding dot:gap at 6:4.
    const step = available / (WEEKS_PER_ROW + (WEEKS_PER_ROW - 1) * (4 / 6));
    const dot = clampNumber(step, size.lifeDotMin, size.lifeDotMax);
    const gap = clampNumber(dot * (4 / 6), size.lifeDotGapMin, size.lifeDotGapMax);
    const colStep = dot + gap;
    const rowStep = dot + gap;
    return {
      dot,
      gap,
      colStep,
      rowStep,
      padding: GRID_INSET,
      svgWidth: WEEKS_PER_ROW * dot + (WEEKS_PER_ROW - 1) * gap + GRID_INSET * 2,
      svgHeight: rows * dot + (rows - 1) * gap + GRID_INSET * 2,
    };
  }, [width, rows]);

  const { dot, colStep, rowStep, padding, svgWidth, svgHeight } = geom;
  const livedWeeks = state.livedWeeks;

  // ─── Static layer 1: every elapsed week ───
  // One <Path> holding every dot as a sub-path, not one node per week. Doc
  // §15 is explicit about this: a single drawing surface, never thousands
  // of elements. At 4,400 weeks the difference is three native nodes on
  // this screen instead of nearly nine thousand.
  const elapsedPath = useMemo(
    () => dotsPath(0, livedWeeks, dot, colStep, rowStep, padding, padding),
    [livedWeeks, dot, colStep, rowStep, padding],
  );

  // ─── Static layer 2: the curtains' placeholder dots ───
  // Curtain A carries a full block of rows; curtain B carries a single row.
  // Both are drawn relative to their own view, then positioned by transform.
  const curtainAPath = useMemo(
    () => dotsPath(0, rows * WEEKS_PER_ROW, dot, colStep, rowStep, padding, 0),
    [rows, dot, colStep, rowStep, padding],
  );
  const curtainBPath = useMemo(
    () => dotsPath(0, WEEKS_PER_ROW, dot, colStep, rowStep, padding, 0),
    [dot, colStep, rowStep, padding],
  );

  // ─── The one animated value ───
  // Counts revealed weeks, 0 → livedWeeks. Everything else is derived from
  // it inside worklets, so nothing here crosses back to the JS thread.
  const revealed = useSharedValue(reveal ? 0 : livedWeeks);
  const currentDotIn = useSharedValue(reveal ? 0 : 1);
  const pulse = useSharedValue(1);

  const handleComplete = useCallback(() => {
    onRevealComplete?.();
  }, [onRevealComplete]);

  useEffect(() => {
    // Hold at the start state until we know whether motion is welcome.
    if (reduceMotion === null) return;

    if (!reveal || reduceMotion) {
      revealed.value = livedWeeks;
      currentDotIn.value = 1;
      handleComplete();
      return;
    }

    revealed.value = 0;
    currentDotIn.value = 0;
    revealed.value = withTiming(
      livedWeeks,
      {
        duration: revealDurationMs,
        // Decisive start, long settle — the final weeks land with weight
        // instead of whipping past. Doc §10 calls this "staggered ease out".
        easing: Easing.out(Easing.cubic),
      },
      (finished) => {
        'worklet';
        if (finished) runOnJS(handleComplete)();
      },
    );
    currentDotIn.value = withDelay(
      revealDurationMs,
      withTiming(1, { duration: CURRENT_DOT_IN_MS, easing: Easing.out(Easing.quad) }),
    );

    return () => {
      cancelAnimation(revealed);
      cancelAnimation(currentDotIn);
    };
  }, [
    reveal,
    reduceMotion,
    livedWeeks,
    revealDurationMs,
    revealed,
    currentDotIn,
    handleComplete,
  ]);

  // Breathing pulse on the current-week dot. Runs for the life of the
  // component; Reduce Motion pins it to full opacity and we draw a ring
  // instead, so state is still conveyed without motion (doc §17).
  useEffect(() => {
    if (reduceMotion !== false) {
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

  // ─── Derived transforms (UI thread only) ───
  const curtainAStyle = useAnimatedStyle(() => {
    const row = Math.floor(revealed.value / WEEKS_PER_ROW);
    return { transform: [{ translateY: padding + (row + 1) * rowStep }] };
  });

  const curtainBStyle = useAnimatedStyle(() => {
    const row = Math.floor(revealed.value / WEEKS_PER_ROW);
    const col = Math.floor(revealed.value - row * WEEKS_PER_ROW);
    return {
      transform: [
        { translateY: padding + row * rowStep },
        // Quantised to the dot pitch so the curtain's own dots stay in
        // register with the grid beneath it.
        { translateX: padding + col * colStep },
      ],
    };
  });

  const currentDotStyle = useAnimatedStyle(() => ({
    opacity: currentDotIn.value * pulse.value,
    transform: [{ scale: 0.55 + 0.45 * currentDotIn.value }],
  }));

  const currentDotRingStyle = useAnimatedStyle(() => ({
    opacity: currentDotIn.value,
  }));

  const tailPatch = useMemo(() => {
    const surplusFrom = state.totalWeeks % WEEKS_PER_ROW;
    if (surplusFrom === 0) return null;
    const gap = colStep - dot;
    const left = padding + surplusFrom * colStep - gap / 2;
    return {
      left,
      top: padding + (rows - 1) * rowStep - gap / 2,
      width: Math.max(0, svgWidth - left),
      height: rowStep,
    };
  }, [state.totalWeeks, rows, dot, colStep, rowStep, padding, svgWidth]);

  const currentPos = useMemo(() => {
    if (state.currentWeekIndex < 0) return null;
    const col = state.currentWeekIndex % WEEKS_PER_ROW;
    const row = (state.currentWeekIndex / WEEKS_PER_ROW) | 0;
    return {
      left: padding + col * colStep,
      top: padding + row * rowStep,
    };
  }, [state.currentWeekIndex, padding, colStep, rowStep]);

  return (
    <View
      style={styles.card}
      accessible
      accessibilityRole="image"
      accessibilityLabel={gridSummary(state)}
    >
      <View style={{ width: svgWidth, height: svgHeight, overflow: 'hidden' }}>
        {/* Layer 1 — every lived week. Static. */}
        <Svg width={svgWidth} height={svgHeight} style={StyleSheet.absoluteFill}>
          <Path d={elapsedPath} fill={theme.colors.elapsed} />
        </Svg>

        {/* Layer 3 — rows below the fill. Drawn before B so B wins on overlap. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.curtain,
            { width: svgWidth, height: svgHeight },
            curtainAStyle,
          ]}
        >
          <Svg width={svgWidth} height={svgHeight}>
            <Path d={curtainAPath} fill={theme.colors.future} />
          </Svg>
        </Animated.View>

        {/* Layer 2 — the row being filled right now. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.curtain,
            { width: svgWidth, height: rowStep },
            curtainBStyle,
          ]}
        >
          <Svg width={svgWidth} height={rowStep}>
            <Path d={curtainBPath} fill={theme.colors.future} />
          </Svg>
        </Animated.View>

        {/* The final row is rarely full — an 85-year horizon ends 16 dots
            into its last row. The curtains paint whole rows, so without
            this patch the grid would show a tail of weeks that are past
            the horizon and do not exist. Static, and never overlaps the
            current week (which is always inside the horizon). */}
        {tailPatch ? (
          <View pointerEvents="none" style={[styles.curtain, tailPatch]} />
        ) : null}

        {/* The current week. Lands after the sweep, then breathes. */}
        {currentPos ? (
          reduceMotion ? (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.currentRing,
                {
                  left: currentPos.left - 2,
                  top: currentPos.top - 2,
                  width: dot + 4,
                  height: dot + 4,
                  borderRadius: (dot + 4) / 2,
                },
                currentDotRingStyle,
              ]}
            />
          ) : (
            <Animated.View
              pointerEvents="none"
              style={[
                styles.currentDot,
                {
                  left: currentPos.left,
                  top: currentPos.top,
                  width: dot,
                  height: dot,
                  borderRadius: dot / 2,
                },
                currentDotStyle,
              ]}
            />
          )
        ) : null}
      </View>
    </View>
  );
}

// ─── Year scale ───────────────────────────────────────────────────────────
// A single row of 52 dots for the current calendar year.

function YearScale({
  state,
  width,
  reduceMotion,
}: Pick<ScaleProps, 'state' | 'width' | 'reduceMotion'>) {
  // A few calendar years contain a 53rd week; the row holds 52, so the
  // final days fold into the last dot rather than drawing off the edge.
  const week = Math.min(WEEKS_PER_ROW - 1, weekOfYear(state.currentWeekStart));

  const { dot, gap, svgWidth, svgHeight } = useMemo(() => {
    const available = width - GRID_INSET * 2;
    const step = available / (WEEKS_PER_ROW + (WEEKS_PER_ROW - 1) * 0.7);
    const d = clampNumber(step, 10, 14);
    const g = d * 0.7;
    return {
      dot: d,
      gap: g,
      svgWidth: WEEKS_PER_ROW * d + (WEEKS_PER_ROW - 1) * g + GRID_INSET * 2,
      svgHeight: d + GRID_INSET * 2,
    };
  }, [width]);

  const circles = useMemo(() => {
    const out: React.ReactNode[] = [];
    for (let i = 0; i < WEEKS_PER_ROW; i++) {
      if (i === week) continue; // the amber overlay draws this one
      out.push(
        <Circle
          key={i}
          cx={GRID_INSET + i * (dot + gap) + dot / 2}
          cy={GRID_INSET + dot / 2}
          r={dot / 2}
          fill={i < week ? theme.colors.elapsed : theme.colors.future}
        />,
      );
    }
    return out;
  }, [dot, gap, week]);

  const pulse = useSharedValue(1);
  useEffect(() => {
    if (reduceMotion !== false) {
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
    <View
      style={styles.card}
      accessible
      accessibilityRole="image"
      accessibilityLabel={`Week ${week + 1} of 52 this year. ${51 - week} weeks remain.`}
    >
      <View style={{ width: svgWidth, height: svgHeight }}>
        <Svg width={svgWidth} height={svgHeight}>
          {circles}
        </Svg>
        <Animated.View
          pointerEvents="none"
          style={[
            styles.currentDot,
            {
              left: GRID_INSET + week * (dot + gap),
              top: GRID_INSET,
              width: dot,
              height: dot,
              borderRadius: dot / 2,
            },
            reduceMotion === false && pulseStyle,
          ]}
        />
      </View>
    </View>
  );
}

// ─── Placeholder for deferred scales ──────────────────────────────────────

function ScalePlaceholder({ scale, width }: { scale: Scale; width: number }) {
  return (
    <View
      style={[styles.card, { width, height: Math.max(180, width * 0.55) }]}
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

const GRID_INSET = 12;

/**
 * Build one SVG path covering week indices [from, to) laid out on the grid
 * lattice. Each dot is a sub-path of two arcs, so an entire layer is a
 * single native node with a single fill.
 *
 * Coordinates are rounded to one decimal: sub-pixel precision beyond that
 * buys nothing visually and costs string length, which is the only real
 * expense here (~240 KB for a full 85-year block, built once and memoised).
 */
function dotsPath(
  from: number,
  to: number,
  dot: number,
  colStep: number,
  rowStep: number,
  offsetX: number,
  offsetY: number,
): string {
  if (to <= from) return '';
  const r = dot / 2;
  const rr = r.toFixed(2);
  const span = (dot).toFixed(2);
  const negSpan = (-dot).toFixed(2);
  const arc = `a${rr} ${rr} 0 1 0 ${span} 0a${rr} ${rr} 0 1 0 ${negSpan} 0`;

  // Column offsets repeat every row — compute them once.
  const colX: string[] = new Array(WEEKS_PER_ROW);
  for (let c = 0; c < WEEKS_PER_ROW; c++) {
    colX[c] = (offsetX + c * colStep).toFixed(1);
  }

  const parts: string[] = [];
  for (let i = from; i < to; i++) {
    const col = i % WEEKS_PER_ROW;
    const row = (i / WEEKS_PER_ROW) | 0;
    // Start at the dot's left edge, since the arcs sweep from there.
    parts.push(`M${colX[col]} ${(offsetY + row * rowStep + r).toFixed(1)}${arc}`);
  }
  return parts.join('');
}

/**
 * One sentence for screen readers, per doc §17: the grid is a single
 * accessible image, never thousands of focus stops.
 */
function gridSummary(state: LifeState): string {
  const lived = state.livedWeeks.toLocaleString();
  const remaining = state.remainingWeeks.toLocaleString();
  if (state.currentWeekIndex < 0) {
    return `Life in weeks. ${lived} weeks lived. This projection horizon has passed.`;
  }
  return `Life in weeks. ${lived} weeks lived, ${remaining} estimated weeks remaining. Each dot is one week.`;
}

function clampNumber(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/**
 * The OS Reduce Motion setting, or `null` while it is still being read.
 *
 * The null state matters: `isReduceMotionEnabled()` is async, so a naive
 * `useState(false)` claims motion is fine for the first frame or two. That
 * is long enough to start a 3.4-second animation and then yank it away from
 * someone who has explicitly asked not to be shown one. Callers wait.
 */
export function useReduceMotionState(): boolean | null {
  const [reduceMotion, setReduceMotion] = React.useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (!cancelled) setReduceMotion(v);
      })
      .catch(() => {
        if (!cancelled) setReduceMotion(false);
      });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
  return reduceMotion;
}

/** Convenience for callers that have nothing to gate on the pending state. */
export function useReduceMotion(): boolean {
  return useReduceMotionState() ?? false;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.raised,
    borderRadius: radius.control,
    borderWidth: 1,
    borderColor: theme.colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: space.md,
    paddingHorizontal: space.md,
    overflow: 'hidden',
  },
  // Painted in the card's own surface colour so it is invisible as a shape;
  // only the dots it carries are ever seen.
  curtain: {
    position: 'absolute',
    left: 0,
    top: 0,
    backgroundColor: theme.colors.raised,
  },
  currentDot: {
    position: 'absolute',
    backgroundColor: theme.colors.accent,
  },
  currentRing: {
    position: 'absolute',
    borderWidth: 1,
    borderColor: theme.colors.accent,
  },
  placeholderInner: { opacity: 0.4 },
});
