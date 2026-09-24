import { router, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HabitForm, HabitFormValues } from '../components/HabitForm';
import { useHabitsStore } from '../hooks/useHabitsStore';
import { colors } from '../theme/colors';

export default function AddHabitScreen() {
  const { habitId, source } = useLocalSearchParams<{ habitId?: string; source?: string }>();
  const { habits, addHabit, editHabit, completeOnboarding } = useHabitsStore();
  const editingHabit = habitId ? habits.find((h) => h.id === habitId) : undefined;
  const fromOnboarding = source === 'onboarding';

  const handleSubmit = (values: HabitFormValues) => {
    if (editingHabit) {
      editHabit(editingHabit.id, {
        name: values.name,
        targetCount: values.targetCount,
        reminderIntention: values.reminderIntention || undefined,
      });
      router.back();
      return;
    }

    addHabit(
      {
        name: values.name,
        type: values.type,
        targetCount: values.targetCount,
        reminderIntention: values.reminderIntention || undefined,
      },
      { startChallenge: fromOnboarding }
    );

    if (fromOnboarding) {
      completeOnboarding();
      router.replace('/(tabs)');
    } else {
      router.back();
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>{editingHabit ? 'Edit habit' : 'New habit'}</Text>
        <HabitForm
          initialValues={
            editingHabit
              ? {
                  name: editingHabit.name,
                  type: editingHabit.type,
                  targetCount: editingHabit.targetCount,
                  reminderIntention: editingHabit.reminderIntention ?? '',
                }
              : undefined
          }
          submitLabel={
            editingHabit ? 'Save changes' : fromOnboarding ? 'Start my 3-day challenge' : 'Add habit'
          }
          onSubmit={handleSubmit}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 8,
  },
});
