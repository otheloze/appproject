import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHabitsStore } from '../../hooks/useHabitsStore';
import { colors } from '../../theme/colors';
import type { Challenge } from '../../types';

const STATUS_LABEL: Record<Challenge['status'], string> = {
  active: 'In progress',
  completed: 'Completed',
  failed: 'Missed',
};

const STATUS_COLOR: Record<Challenge['status'], string> = {
  active: colors.accent,
  completed: colors.success,
  failed: colors.danger,
};

export default function ChallengesScreen() {
  const { habits, challenges, startChallenge, activeChallengeForHabit } = useHabitsStore();

  const habitName = (habitId: string) => habits.find((h) => h.id === habitId)?.name ?? 'Deleted habit';
  const habitIcon = (habitId: string) => habits.find((h) => h.id === habitId)?.icon ?? '🗑️';
  const habitsWithoutChallenge = habits.filter((h) => !activeChallengeForHabit(h.id));
  const sortedChallenges = [...challenges].reverse();

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Text style={styles.title}>Challenges</Text>
      <FlatList
        data={sortedChallenges}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.emptyText}>No challenges yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderName}>
                <Text style={styles.habitIcon}>{habitIcon(item.habitId)}</Text>
                <Text style={styles.habitName}>{habitName(item.habitId)}</Text>
              </View>
              <Text style={[styles.statusText, { color: STATUS_COLOR[item.status] }]}>
                {STATUS_LABEL[item.status]}
              </Text>
            </View>
            <Text style={styles.progressText}>
              {item.completedDays.length} of {item.durationDays} days completed
            </Text>
          </View>
        )}
        ListFooterComponent={
          habitsWithoutChallenge.length > 0 ? (
            <View style={styles.footer}>
              <Text style={styles.footerTitle}>Start a new 3-day challenge</Text>
              {habitsWithoutChallenge.map((h) => (
                <Pressable key={h.id} style={styles.startRow} onPress={() => startChallenge(h.id)}>
                  <View style={styles.startRowName}>
                    <Text style={styles.habitIcon}>{h.icon}</Text>
                    <Text style={styles.startRowText}>{h.name}</Text>
                  </View>
                  <Text style={styles.startRowCta}>Start →</Text>
                </Pressable>
              ))}
            </View>
          ) : null
        }
      />
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
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  cardHeaderName: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  habitIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  progressText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  footer: {
    marginTop: 20,
  },
  footerTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 10,
  },
  startRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  startRowName: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  startRowText: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  startRowCta: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
});
