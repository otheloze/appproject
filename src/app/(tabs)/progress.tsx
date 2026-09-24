import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConsistencyChart } from '../../components/ConsistencyChart';
import { useHabitsStore } from '../../hooks/useHabitsStore';
import { colors } from '../../theme/colors';

export default function ProgressScreen() {
  const { habits } = useHabitsStore();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Progress</Text>
      <ScrollView contentContainerStyle={styles.list}>
        {habits.length === 0 && (
          <Text style={styles.emptyText}>Add a habit to start tracking your consistency.</Text>
        )}
        {habits.map((habit) => (
          <View key={habit.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <Text style={styles.habitName}>{habit.name}</Text>
              <Text style={styles.streakText}>
                🔥 {habit.streak} · best {habit.bestStreak}
              </Text>
            </View>
            <ConsistencyChart completions={habit.completions} targetCount={habit.targetCount} />
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  streakText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
});
