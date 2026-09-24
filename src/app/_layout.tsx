import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useHabitReminders } from '../hooks/useHabitReminders';
import { HabitsProvider, useHabitsStore } from '../hooks/useHabitsStore';
import { useNotificationScheduler } from '../hooks/useNotificationScheduler';
import { RewardsProvider } from '../hooks/useRewards';
import { colors } from '../theme/colors';

function RootNavigator() {
  const { loaded, onboardingComplete, habits, challenges, editHabit } = useHabitsStore();
  useNotificationScheduler(habits, challenges, loaded);

  const handleReminderIdChange = useCallback(
    (habitId: string, reminderNotificationId: string | null) => {
      editHabit(habitId, { reminderNotificationId });
    },
    [editHabit]
  );
  useHabitReminders(habits, loaded, handleReminderIdChange);

  // The Stack (and the navigator it wraps) must always render — Expo
  // Router's initial-URL/linking resolution runs as soon as the root
  // component mounts and expects a navigator to already be there. Gating
  // the whole <Stack> behind `loaded` (swapping it for a plain View) leaves
  // that resolution racing against a component that hasn't mounted yet, which
  // is exactly what throws "Can't perform a React state update on a
  // component that hasn't mounted yet." Instead, while loading, neither
  // Stack.Protected branch is active, so the Stack renders with no visible
  // screen (blank, same effect as before) until data resolves.
  //
  // `add-habit` must also be gated on `loaded`, even though it isn't an
  // onboarding-state screen: if it stayed unconditionally registered, it
  // would be the *only* screen present during that blank window (since
  // both branches above are inactive), so the navigator would boot straight
  // into it as the initial route — and never leave, since a route that
  // stays registered throughout never triggers a protected-route redirect.
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
      <Stack.Protected guard={loaded && !onboardingComplete}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={loaded && onboardingComplete}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Protected guard={loaded}>
        <Stack.Screen name="add-habit" options={{ presentation: 'modal' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <HabitsProvider>
        <RewardsProvider>
          <RootNavigator />
        </RewardsProvider>
      </HabitsProvider>
    </SafeAreaProvider>
  );
}
