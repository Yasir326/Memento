# Memento

A calm, visual time-awareness app that turns your remaining weeks into a
single dot grid, then connects those weeks to a small set of meaningful
goals and one weekly action.

Built to the specification in *Memento — React Native Product Design and
Technical Specification* (v1.2, 17 September 2026).

## Current status

**Life grid + dashboard.** The Time home screen shows estimated weeks
remaining, weeks lived, the life grid with a sequential reveal, the
current week's focus with a countdown to the week boundary, and active
goals with their target dates and weeks left. A Goals screen handles the
three-active-goal limit, editing, completion and archiving.

Not yet built: weekly reflection, notifications, real RevenueCat
purchases, settings, widget. See the design doc's Section 19 "Delivery
plan" for the intended sequence.

## Run locally

```bash
npm install
npx expo run:ios      # iOS device or simulator
npx expo run:android  # Android emulator (foundation is cross-platform)
```

`npm start` launches Metro if you want to attach a running client.

```bash
npm run typecheck     # tsc --noEmit
npm run test:domain   # date/life-state/countdown/goal-timeline unit tests
```

`src/domain` is RN-free and deterministic, so its tests run under plain
Node with the built-in test runner — no simulator, no jest transform. Run
them under a few zones before shipping date changes:

```bash
TZ=Pacific/Auckland npm run test:domain
TZ=America/Los_Angeles npm run test:domain
```

## Project structure

Follows the doc's Section 13 layering:

```
app/                       # Expo Router file-based routes
  _layout.tsx              # Root layout, font loading, splash gate
  index.tsx                # Time home (default entry)
src/
  design/                  # Tokens, typography, theme — shared source of truth
  domain/                  # Pure functions (dates, life state) — no RN imports
  features/time/           # Screen-level composition for the Time area
  content/                 # Local quote set (offline-first per doc p.21)
```

## Design decisions worth knowing

- **Dark is the signature theme.** Light theme tokens exist in `tokens.ts`
  but no toggle is wired yet.
- **Fonts.** `@expo-google-fonts/manrope` and `@expo-google-fonts/source-serif-4`
  bundle the **static** TTF weight files at build time. This satisfies the
  doc's "static TTF/OTF rather than variable fonts" rule (p.17); the
  distinction is not "local files vs npm package" but "static vs variable."
- **Grid rendering.** Each layer is a single `<Path>` whose `d` string holds
  every dot as a sub-path — three native nodes for ~4,400 weeks, not 4,400
  elements. Doc Section 15's "one drawing surface" rule, taken literally.
- **The reveal never re-renders.** The sequential fill is two opaque
  "curtains" carrying the placeholder dot pattern, slid off the finished
  grid by transform only, driven by one Reanimated shared value on the UI
  thread. No React state changes during the 3.4 s animation. See the header
  comment in `LifeGrid.tsx` for why the obvious approach is a trap.
- **Reduce motion.** Honoured before the animation starts, not after:
  `isReduceMotionEnabled()` is async, so the grid holds its start state
  until the setting is known rather than beginning a reveal it may have to
  yank away. The current-week dot becomes a static amber ring.
- **Plain dates vs instants.** `src/domain/dates.ts` distinguishes the two
  explicitly. A week boundary is Monday 00:00 *in the user's zone*; reading
  UTC components off a local `Date` silently shifts it by a day for anyone
  outside UTC.
- **One week lattice.** Lived, current and remaining weeks are indices on a
  single lattice anchored to the birth week, so they always sum to the
  number of dots drawn. Measuring lived weeks from the birth date and
  remaining weeks from the current week start uses two different 7-day
  grids and disagrees by one for most birth dates.
- **Nothing is stored per week.** Week state is derived from the current
  date on every render, so the app is correct after being closed for a
  month with no timers to replay.
- **Domain purity.** `src/domain/*` is deterministic and RN-free; it can be
  unit-tested in Node without a test host.

## What to build next (per doc)

1. Weekly reflection (Section 08) — three-question review, tied to one week
2. Local notification schedules (Section 11) — three intensity presets
3. RevenueCat paywall (Section 07) — 7-day trial + monthly fallback
4. Settings (Section 05) — projection, week start, theme, export and delete
5. Week and Today scales (Section 08) — currently placeholders
6. Home-screen widget (Section 15) — after the core app is stable
