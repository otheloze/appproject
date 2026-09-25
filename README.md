# Habit Tracker

A mobile habit tracker built with Expo and React Native. Create a habit, check it off (or log progress toward a daily target), kick it off with a 3-day challenge to build momentum, and track your consistency over time — with optional reminders to nudge you at the right moment.

## Features

- **Two habit types** — simple yes/no habits, or count habits with a daily target (e.g. "drink 8 glasses of water").
- **Streaks** — current and best streak tracked per habit, with a calendar heatmap of your consistency on the Progress tab.
- **3-day kickstart challenges** — new habits can start with a short challenge; complete all three days for a bonus reward.
- **Automatic icons** — each habit gets an emoji icon inferred from its name (e.g. "Drink water" → 💧), so habits are easy to tell apart at a glance.
- **Reminders** — general daily check-in nudges, plus an optional custom reminder time per habit.
- **Rewards** — haptic + particle + chime celebration on completions, with a bigger variant for finishing a challenge.
- **Offline-first** — all data is stored locally on-device (AsyncStorage); nothing leaves your phone.

## Tech stack

- [Expo](https://expo.dev) / React Native, TypeScript
- [Expo Router](https://docs.expo.dev/router/introduction/) for file-based navigation
- `expo-notifications`, `expo-haptics`, `expo-audio` for reminders and feedback
- No external state library — a Context-based store in `src/hooks/useHabitsStore.tsx`

## Getting started

```bash
npm install
npx expo start
```

Then open the app in Expo Go, an iOS/Android simulator, or a development build (see below).

### Reminders on Android

`expo-notifications` isn't supported in Expo Go on Android — you'll need a [development build](https://docs.expo.dev/develop/development-builds/introduction/) to test reminders there:

```bash
npx expo install expo-dev-client
npx eas-cli@latest build --profile development --platform android
```

Install the resulting build on your device, then run `npx expo start --dev-client` and open it from there instead of Expo Go.

### Useful commands

| Command | Purpose |
| --- | --- |
| `npx expo start` | Start the dev server |
| `npm run android` / `npm run ios` / `npm run web` | Start targeting a specific platform |
| `npx tsc --noEmit` | Typecheck |
| `npx expo lint` | Lint |
| `npx expo-doctor` | Diagnose dependency/config issues |

## Project structure

```
src/
  app/            # Expo Router screens (file-based routing)
    (tabs)/       # Today, Progress, Challenges, Settings
    add-habit.tsx # Modal: create/edit a habit
    onboarding.tsx
    how-it-works.tsx
  components/     # HabitForm, ConsistencyChart, RewardOverlay, ...
  hooks/          # useHabitsStore, useRewards, useNotificationScheduler, useHabitReminders
  lib/            # storage, notifications, date helpers, icon set
  theme/          # color palette
  types.ts        # Habit, Challenge, AppMeta, NotificationPrefs
```

## License

MIT — see [LICENSE](LICENSE).
