import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { WelcomeLoadingScreen } from '../components/WelcomeLoadingScreen';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { useHabitReminders } from '../hooks/useHabitReminders';
import { HabitsProvider, useHabitsStore } from '../hooks/useHabitsStore';
import { useNotificationScheduler } from '../hooks/useNotificationScheduler';
import { RewardsProvider } from '../hooks/useRewards';
import { colors } from '../theme/colors';

function RootNavigator() {
  const { loading: authLoading, session, userId, recoveryPending } = useAuth();
  const { loaded, onboardingComplete, habits, challenges, editHabit } = useHabitsStore();
  useNotificationScheduler(userId, habits, challenges, loaded);

  const handleReminderIdChange = useCallback(
    (habitId: string, reminderNotificationId: string | null) => {
      editHabit(habitId, { reminderNotificationId });
    },
    [editHabit]
  );
  useHabitReminders(userId, habits, loaded, handleReminderIdChange);

  const authed = !authLoading && !!session;

  // The Stack (and the navigator it wraps) must always render — Expo
  // Router's initial-URL/linking resolution runs as soon as the root
  // component mounts and expects a navigator to already be there. Gating
  // the whole <Stack> behind readiness (swapping it for a plain View) leaves
  // that resolution racing against a component that hasn't mounted yet, which
  // is exactly what throws "Can't perform a React state update on a
  // component that hasn't mounted yet." Instead, while loading, no
  // Stack.Protected branch is active, so the Stack renders with no visible
  // screen (blank, covered by the WelcomeLoadingScreen overlay) until data
  // resolves — the same pattern now covers auth resolving in addition to
  // habit-data loading.
  //
  // `add-habit`/`how-it-works` must also be gated on `authed && loaded`, even
  // though they aren't onboarding-state screens: if either stayed
  // unconditionally registered, it would be the *only* screen present during
  // that blank window (since every other branch is inactive), so the
  // navigator would boot straight into it as the initial route — and never
  // leave, since a route that stays registered throughout never triggers a
  // protected-route redirect.
  return (
    <>
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!authLoading && !session}>
          <Stack.Screen name="auth" />
        </Stack.Protected>
        <Stack.Protected guard={authed && recoveryPending}>
          <Stack.Screen name="reset-password" />
        </Stack.Protected>
        <Stack.Protected guard={authed && !recoveryPending && loaded && !onboardingComplete}>
          <Stack.Screen name="onboarding" />
        </Stack.Protected>
        <Stack.Protected guard={authed && !recoveryPending && loaded && onboardingComplete}>
          <Stack.Screen name="(tabs)" />
        </Stack.Protected>
        <Stack.Protected guard={authed && !recoveryPending && loaded}>
          <Stack.Screen name="add-habit" options={{ presentation: 'modal' }} />
          <Stack.Screen name="how-it-works" options={{ presentation: 'modal' }} />
        </Stack.Protected>
      </Stack>
      {/* A pending password reset has its own screen above and doesn't need
          (or want — it'd cover the form) habit data, so it's excluded here;
          habit loading still proceeds in the background and is ready by the
          time the user finishes resetting their password. */}
      {!recoveryPending && (authLoading || (authed && !loaded)) && <WelcomeLoadingScreen />}
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <AuthProvider>
        <HabitsProvider>
          <RewardsProvider>
            <RootNavigator />
          </RewardsProvider>
        </HabitsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
