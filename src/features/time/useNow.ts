// useNow — a clock that ticks only when the display would actually change.
//
// Doc §15: "Recalculate at app foreground and at the next local day or week
// boundary, not every second." So instead of an interval, the caller tells
// us how long the current value stays valid and we schedule exactly one
// timeout for that long. A dashboard showing "3 days left this week" wakes
// up once an hour; one showing hours wakes up on the hour.
//
// Foregrounding always recalculates immediately, which is what makes week
// rollover work: JS timers do not fire reliably while an app is suspended,
// so the state is derived from the current date on resume rather than
// replayed from a timer that was supposed to fire overnight.

import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';

/** Never sleep longer than this, so a stale timer self-heals. */
const MAX_DELAY_MS = 15 * 60 * 1000;
/** Never spin faster than this, whatever the caller asks for. */
const MIN_DELAY_MS = 1000;

/**
 * @param nextDelayMs  given the current instant, how long until the derived
 *                     display would change. Clamped to [1s, 15m].
 * @returns the current instant, re-issued as a new Date on each tick.
 */
export function useNow(nextDelayMs: (now: Date) => number): Date {
  const [now, setNow] = useState(() => new Date());
  const delayRef = useRef(nextDelayMs);
  delayRef.current = nextDelayMs;

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const schedule = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const current = new Date();
    const requested = delayRef.current(current);
    const delay = Math.min(
      MAX_DELAY_MS,
      Math.max(MIN_DELAY_MS, Number.isFinite(requested) ? requested : MAX_DELAY_MS),
    );
    timerRef.current = setTimeout(() => {
      if (!mountedRef.current) return;
      setNow(new Date());
      schedule();
    }, delay);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    schedule();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        // Timers are unreliable while suspended — re-derive from the clock.
        setNow(new Date());
        schedule();
      }
    });

    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearTimeout(timerRef.current);
      sub.remove();
    };
  }, [schedule]);

  return now;
}
