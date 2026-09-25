# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Expo/React Native (TypeScript) habit tracker built around a core-loop/core-function/
accessory-features/retention-hook app-design framework. Screens, using Expo Router with
routes under `src/app/` per the convention in AGENTS.md above: `auth.tsx` (email/password
sign-in/sign-up, gates everything else), onboarding, a 4-tab group (Today, Progress,
Challenges, Settings), and a modal add/edit-habit screen. The entry point is
`expo-router/entry` (set via `package.json`'s `main` field) — there is no `App.tsx` or
`index.ts`; the root layout is `src/app/_layout.tsx`.

Backed by Supabase (Postgres + Auth) for cross-device sync, with AsyncStorage as an
always-authoritative-for-reads local cache — see **Auth & sync** below.

### Supabase setup

Requires a Supabase project. Copy `.env.example` to `.env` and fill in
`EXPO_PUBLIC_SUPABASE_URL`/`EXPO_PUBLIC_SUPABASE_ANON_KEY` (dashboard → Settings → API —
the anon/publishable key, never the `service_role` key). Then run `supabase/schema.sql`
once in the dashboard's SQL Editor (Project → SQL Editor → New query) to create the
`habits`/`challenges`/`notification_prefs` tables and their Row Level Security policies.
It's idempotent, so re-running it after a schema change is safe.

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

- **Routing** (`src/app/`): `_layout.tsx` (root `Stack`, mounts `AuthProvider`/
  `HabitsProvider`/`RewardsProvider`/the notification scheduler), `auth.tsx`,
  `onboarding.tsx`, `add-habit.tsx` (modal; `?habitId=` for edit, `?source=onboarding` for
  the first-run flow), `how-it-works.tsx` (static "how this app works" modal, linked from
  Settings), and a `(tabs)/` group (`index.tsx` = Today/core loop, `progress.tsx`,
  `challenges.tsx`, `settings.tsx`). The `Stack` itself always renders (never swapped for a
  placeholder `View` while loading) — Expo Router resolves the initial URL as soon as the
  root component mounts and expects a navigator already in place, so every screen is
  wrapped in `Stack.Protected guard={...}` on some combination of `authed`
  (`!authLoading && !!session`) and `loaded` (habit data ready) instead, including
  `add-habit`/`how-it-works` (guarded on `authed && loaded` alone, no onboarding check) so
  neither can become the only registered route during the blank window and get picked as
  the initial route. During that same blank window (and again whenever `userId` changes —
  see **Auth & sync**), `<WelcomeLoadingScreen>` renders as a sibling overlay on top of the
  `Stack`, not swapped in for it, so the always-mounted-navigator invariant above still
  holds.
- **Data model** (`src/types.ts`): `Habit` supports `type: 'binary' | 'count'` (a count
  habit tracks partial daily progress via `completions[dateKey]` against `targetCount`;
  a day only counts as complete, advancing `streak`/`lastCompletedDate`, once the count
  is reached). `Challenge` models the 3-day-kickstart mechanic (`completedDays`, `status`).
  `AppMeta`/`NotificationPrefs` round out app-level state. `Habit.icon` is not
  user-chosen — `iconForHabitName()` (`src/lib/icons.ts`) derives it from the habit's name
  via ordered keyword matching (falls back to 🎯), called both on `addHabit` and on
  `editHabit` whenever `name` is part of the patch, so renaming a habit re-derives its icon.
- **Storage** (`src/lib/storage.ts`): AsyncStorage keyed per signed-in user
  (`habit-tracker-v3-${userId}-*`) so two accounts on one device never see each other's
  cache. `initializeStorageIfNeeded(userId)` runs once per (user, device): if this device
  has unclaimed pre-auth data (from before sign-in existed, tracked by a one-time global
  `habit-tracker-pre-auth-claimed` flag) it's migrated into this user's namespace —
  upconverting the older pre-v2 single-screen demo shape first if that's all that's present
  — otherwise, for a genuinely fresh start, it seeds `DEFAULT_HABITS` (the original demo's
  starter habits) and marks onboarding complete, so fresh accounts see a populated app
  instead of the "create your first habit" wizard. `resetAllData(userId)` wipes this user's
  local cache (Settings' "Reset all data" also calls `deleteRemoteData` to clear Supabase).
- **Auth & sync** (`src/lib/supabase.ts`, `src/hooks/useAuth.tsx`, `src/lib/sync.ts`):
  email/password auth via `supabase-js`, session persisted through the same AsyncStorage
  (auto-refresh is paused while backgrounded via `AppState`, per Supabase's RN guidance).
  Sign-up's `name` field is passed as `options: { data: { name } }` on `supabase.auth.signUp`
  (lands in `auth.users.raw_user_meta_data`, never in any table this app's code can read)
  — a `security definer` trigger (`handle_new_user` in `supabase/schema.sql`) reads it back
  out to populate `public.profiles` (`email`, `name`) on insert. The password itself is
  never written anywhere but Supabase Auth's own protected `auth.users` table — `profiles`
  has no password column and never will.
  `HabitsProvider`'s load effect (keyed on `userId`, including to/from `null` so switching
  accounts never leaks state) loads the local cache first for an instant read, then does a
  best-effort remote pull (`pullRemoteSnapshot`): if Supabase already has rows for this
  user, remote wins and overwrites the local cache; if remote is empty (new account), the
  local cache — freshly seeded/migrated — is left as-is and gets pushed up once loaded.
  After that, two effects watch `habits`/`challenges` and upsert the *whole* current
  collection to Supabase on every change (diffing against the previously-pushed id set to
  also delete removed rows), rather than pushing per-mutation — reuses the same
  whole-collection-on-change shape as the existing local-persist effects, and keeps every
  add/edit/delete call site free of sync code. All pushes are fire-and-forget with failures
  swallowed (no offline queue yet — a failed push is silently superseded by the next state
  change's push, so a change made while offline needs *some* later change, or a re-login,
  to actually reach Supabase). RLS policies (`supabase/schema.sql`) restrict every row to
  `auth.uid() = user_id`, so cross-user access is enforced server-side, not just by the app
  namespacing its local cache.
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
  `NotificationSoftAsk` in the Today screen), not during onboarding. Every notifications.ts
  function that touches prefs takes `userId` and writes through `saveNotificationPrefs`,
  which persists locally then fire-and-forget pushes to Supabase (same pattern as habits/
  challenges above).
- **Charts**: `src/components/ConsistencyChart.tsx` is a plain-`View` calendar heatmap —
  no charting library.
- Theming lives in `src/theme/colors.ts` (the original hardcoded dark hex palette,
  extracted, `userInterfaceStyle` in `app.json` is `"automatic"`).
