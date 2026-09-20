# Memento

A calm, visual time-awareness app that turns your remaining weeks into a
single dot grid, then connects those weeks to a small set of meaningful
goals and one weekly action.

Built to the specification in *Memento — React Native Product Design and
Technical Specification* (v1.2, 17 September 2026).

## Current status

**Vertical slice — Life grid.** This build renders the Time home screen
with a memoised SVG life grid, a breathing current-week dot, a scale
switcher (Life / Year / Week / Today), and the daily quote block.

Not yet built: onboarding, goals, weekly reflection, notifications,
paywall, persistence, settings, widget. See the design doc's Section 19
"Delivery plan" for the intended sequence.

## Run locally

```bash
npm install
npx expo run:ios      # iOS device or simulator
npx expo run:android  # Android emulator (foundation is cross-platform)
```

`npm start` launches Metro if you want to attach a running client.

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
- **Grid rendering.** Single SVG tree with memoised cell layout, per the doc's
  Section 15 rendering strategy. Not one React component per week.
- **Reduce motion.** The current-dot pulse honours `AccessibilityInfo.
  isReduceMotionEnabled()` and falls back to a static amber ring.
- **Domain purity.** `src/domain/*` is deterministic and RN-free; it can be
  unit-tested in Node without a test host.

## What to build next (per doc)

1. Onboarding flow (Section 06) — birth date + projection + first goal
2. SQLite migrations (Section 14 entities) + repositories layer
3. Goals feature (Section 05) — three-active-goal limit, weekly focus
4. Weekly reflection (Section 08) — three-question review
5. Local notification schedules (Section 11) — three intensity presets
6. RevenueCat paywall (Section 07) — 7-day trial + monthly fallback
