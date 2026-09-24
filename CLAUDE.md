# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Expo/React Native (TypeScript) habit tracker built around a core-loop/core-function/
accessory-features/retention-hook app-design framework. Six screens, using Expo Router
with routes under `src/app/` per the convention in AGENTS.md above: onboarding, a 4-tab
group (Today, Progress, Challenges, Settings), and a modal add/edit-habit screen. The
entry point is `expo-router/entry` (set via `package.json`'s `main` field) — there is no
`App.tsx` or `index.ts`; the root layout is `src/app/_layout.tsx`.

## Commands

- `npx expo start` (or `npm start`) — start the dev server
- `npm run android` / `npm run ios` / `npm run web` — start the dev server targeting a platform
- `npx tsc --noEmit` — typecheck; run this before considering any change done
- `npx expo lint` — lint (ESLint config is `eslint-config-expo`, scaffolded via `expo lint`'s first run)
- `npx expo-doctor` — diagnose dependency/config issues
- `npx expo install <package>` — always use instead of `npm`/`yarn`/`pnpm add` so native package versions stay compatible with the installed Expo SDK

If `npm install`/`npx expo install` fails with an `ERESOLVE` conflict over `react-dom@*`
wanting a newer `react` than the pinned version, re-run with `npm install --legacy-peer-deps`
— this is a pre-existing transitive peer conflict from Expo's own optional devtools/web
dependencies, unrelated to this app's own code (the app has no react-dom/web runtime
dependency in normal use).

## Architecture

- **Routing** (`src/app/`): `_layout.tsx` (root `Stack`, mounts `HabitsProvider`/
  `RewardsProvider`/the notification scheduler), `onboarding.tsx`, `add-habit.tsx` (modal;
  `?habitId=` for edit, `?source=onboarding` for the first-run flow), and a `(tabs)/` group
  (`index.tsx` = Today/core loop, `progress.tsx`, `challenges.tsx`, `settings.tsx`). The
  `Stack` itself always renders (never swapped for a placeholder `View` while loading) —
  Expo Router resolves the initial URL as soon as the root component mounts and expects a
  navigator already in place, so all three screens (`onboarding`, `(tabs)`, `add-habit`) are
  wrapped in `Stack.Protected guard={loaded && ...}` instead, including `add-habit` (guarded
  on `loaded` alone) so it can't become the only registered route during the blank window
  and get picked as the initial route.
- **Data model** (`src/types.ts`): `Habit` supports `type: 'binary' | 'count'` (a count
  habit tracks partial daily progress via `completions[dateKey]` against `targetCount`;
  a day only counts as complete, advancing `streak`/`lastCompletedDate`, once the count
  is reached). `Challenge` models the 3-day-kickstart mechanic (`completedDays`, `status`).
  `AppMeta`/`NotificationPrefs` round out app-level state.
- **Storage** (`src/lib/storage.ts`): AsyncStorage under the `habit-tracker-v2-*` key
  namespace. `initializeStorageIfNeeded()` runs once per install: first upconverts the old
  single-screen demo's `habit-tracker-demo-*` keys (binary-only, no `completions` history)
  if present, then — only for a genuinely empty habit list (`AppMeta.seeded` false) —
  seeds `DEFAULT_HABITS` (the original demo's starter habits) and marks onboarding complete,
  so fresh installs see a populated app instead of the "create your first habit" wizard.
  `resetAllData()` wipes all current-schema and legacy keys (Settings' "Reset all data").
- **Store** (`src/hooks/useHabitsStore.tsx`): a Context + `useState`/refs store (no
  Zustand/Redux) exposing habit/challenge CRUD plus `completeBinary`/`incrementCount`,
  both of which return `{ justCompleted, completedChallenge }` so callers can decide
  which reward variant to trigger. Streak logic still follows the original app's
  `todayKey()`/`yesterdayKey()` (`Date.toDateString()`) comparison pattern, now in
  `src/lib/date.ts`.
- **Rewards** (`src/hooks/useRewards.tsx` + `src/components/RewardOverlay.tsx`): a
  root-mounted overlay driven by `celebrateHabit`/`celebrateChallenge`. Per-habit
  completions get a non-blocking haptic+particle+chime burst; challenge completions get
  a bigger blocking variant (double haptic, richer chime, explicit dismiss). No animation
  library beyond core RN `Animated`; the two chime assets under `assets/sounds/` are
  locally-synthesized WAV tones, not downloaded audio.
- **Notifications** (`src/lib/notifications.ts`, `src/hooks/useNotificationScheduler.ts`,
  `src/hooks/useHabitReminders.ts`): `expo-notifications` throws on import on Android inside
  Expo Go (a library-level side effect, needs a dev build there), so `notifications.ts` never
  imports it statically — `getNotifications()` lazily `require`s and caches the module, gated
  by `notificationsSupported()` (`isRunningInExpoGo() && Platform.OS === 'android'` → module
  disabled); every exported function in the file no-ops/returns null through that gate. Two
  daily local triggers (general check-in nudges) have their *content* (not just schedule)
  recomputed and rescheduled on every habit/challenge change and app-foreground event, since
  local notification content is fixed at schedule time. Separately, each `Habit` can carry its
  own custom-time reminder (`reminderTime`/`reminderIntention`/`reminderNotificationId`);
  `useHabitReminders` caches a per-habit signature across renders and only cancels+reschedules
  that habit's native trigger when `reminderTime`/`reminderIntention` actually changes, not on
  every habit-array update (e.g. a completion ticking a streak). Permission is requested via an
  in-app soft-ask shown once, right after the user's first-ever habit completion (see
  `NotificationSoftAsk` in the Today screen), not during onboarding.
- **Charts**: `src/components/ConsistencyChart.tsx` is a plain-`View` calendar heatmap —
  no charting library.
- Theming lives in `src/theme/colors.ts` (the original hardcoded dark hex palette,
  extracted, `userInterfaceStyle` in `app.json` is `"automatic"`).
