import { router, useLocalSearchParams } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HabitForm, HabitFormValues } from '../components/HabitForm';
import { useHabitsStore } from '../hooks/useHabitsStore';
import { colors } from '../theme/colors';

export default function AddHabitScreen() {
  const { habitId, source } = useLocalSearchParams<{ habitId?: string; source?: string }>();
  const { habits, addHabit, editHabit, deleteHabit, completeOnboarding } = useHabitsStore();
  const editingHabit = habitId ? habits.find((h) => h.id === habitId) : undefined;
  const fromOnboarding = source === 'onboarding';

  // Falls back to replacing with Today when there's no back history to pop
  // (e.g. this screen was reached directly, such as after a dev reload) —
  // router.back() alone throws "GO_BACK was not handled" in that case.
  const closeScreen = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const handleSubmit = (values: HabitFormValues) => {
    if (editingHabit) {
      editHabit(editingHabit.id, {
        name: values.name,
        icon: values.icon,
        targetCount: values.targetCount,
        reminderIntention: values.reminderIntention || undefined,
        reminderTime: values.reminderTime,
      });
      closeScreen();
      return;
    }

    addHabit(
      {
        name: values.name,
        icon: values.icon,
        type: values.type,
        targetCount: values.targetCount,
        reminderIntention: values.reminderIntention || undefined,
        reminderTime: values.reminderTime,
      },
      { startChallenge: fromOnboarding }
    );

    if (fromOnboarding) {
      completeOnboarding();
      router.replace('/(tabs)');
    } else {
      closeScreen();
    }
  };

  const handleDelete = () => {
    if (!editingHabit) return;
    Alert.alert(
      'Delete habit?',
      `This removes "${editingHabit.name}" and its streak history. This can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteHabit(editingHabit.id);
            closeScreen();
          },
        },
      ]
    );
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
                  icon: editingHabit.icon,
                  type: editingHabit.type,
                  targetCount: editingHabit.targetCount,
                  reminderIntention: editingHabit.reminderIntention ?? '',
                  reminderTime: editingHabit.reminderTime ?? null,
                }
              : undefined
          }
          submitLabel={
            editingHabit ? 'Save changes' : fromOnboarding ? 'Start my 3-day challenge' : 'Add habit'
          }
          onSubmit={handleSubmit}
        />
        {editingHabit && (
          <Pressable style={styles.deleteButton} onPress={handleDelete}>
            <Text style={styles.deleteButtonText}>Delete habit</Text>
          </Pressable>
        )}
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
  deleteButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginTop: 8,
  },
  deleteButtonText: {
    color: colors.danger,
    fontWeight: '600',
    fontSize: 14,
  },
});
