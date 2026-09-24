import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { HabitsProvider, useHabitsStore } from '../hooks/useHabitsStore';
import { useNotificationScheduler } from '../hooks/useNotificationScheduler';
import { RewardsProvider } from '../hooks/useRewards';
import { colors } from '../theme/colors';

function RootNavigator() {
  const { loaded, onboardingComplete, habits, challenges } = useHabitsStore();
  useNotificationScheduler(habits, challenges, loaded);

  if (!loaded) {
    return <View style={{ flex: 1, backgroundColor: colors.background }} />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!onboardingComplete}>
        <Stack.Screen name="onboarding" />
      </Stack.Protected>
      <Stack.Protected guard={onboardingComplete}>
        <Stack.Screen name="(tabs)" />
      </Stack.Protected>
      <Stack.Screen name="add-habit" options={{ presentation: 'modal' }} />
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
