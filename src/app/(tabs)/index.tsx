import { router } from 'expo-router';
import { useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NotificationSoftAsk } from '../../components/NotificationSoftAsk';
import type { CompletionResult } from '../../hooks/useHabitsStore';
import { useHabitsStore } from '../../hooks/useHabitsStore';
import { useRewards } from '../../hooks/useRewards';
import { todayKey } from '../../lib/date';
import { markSoftAskDeclined, requestNotificationPermission } from '../../lib/notifications';
import { getNotificationPrefs } from '../../lib/storage';
import { colors } from '../../theme/colors';
import type { Habit } from '../../types';

export default function TodayScreen() {
  const { habits, completeBinary, incrementCount, undoToday, activeChallengeForHabit } = useHabitsStore();
  const { celebrateHabit, celebrateChallenge } = useRewards();
  const [showSoftAsk, setShowSoftAsk] = useState(false);

  const maybeShowSoftAsk = async () => {
    const prefs = await getNotificationPrefs();
    if (!prefs.hasPromptedSoftAsk) setShowSoftAsk(true);
  };

  const onCompleteResult = (habit: Habit, result: CompletionResult) => {
    if (!result.justCompleted) return;
    if (result.completedChallenge) {
      celebrateChallenge(habit.name);
    } else {
      celebrateHabit(habit);
    }
    maybeShowSoftAsk();
  };

  const handleBinaryToggle = (habit: Habit) => {
    const result = completeBinary(habit.id);
    onCompleteResult(habit, result);
  };

  const handleIncrement = (habit: Habit) => {
    const result = incrementCount(habit.id);
    onCompleteResult(habit, result);
  };

  const renderHabit = ({ item }: { item: Habit }) => {
    const today = todayKey();
    const doneCount = item.completions[today] ?? 0;
    const completedToday = doneCount >= item.targetCount;
    const challenge = activeChallengeForHabit(item.id);
    const challengeDay = challenge
      ? Math.min(challenge.completedDays.length + 1, challenge.durationDays)
      : null;

    return (
      <Pressable
        style={styles.habitRow}
        onPress={() => router.push({ pathname: '/add-habit', params: { habitId: item.id } })}
      >
        <View style={styles.habitInfo}>
          <View style={styles.habitNameRow}>
            <Text style={styles.habitName}>{item.name}</Text>
            {challengeDay && (
              <View style={styles.challengeBadge}>
                <Text style={styles.challengeBadgeText}>Day {challengeDay}/{challenge!.durationDays}</Text>
              </View>
            )}
          </View>
          <Text style={styles.habitStreak}>
            🔥 {item.streak} day{item.streak === 1 ? '' : 's'}
          </Text>
        </View>

        {item.type === 'binary' ? (
          <Pressable
            style={[styles.checkbox, completedToday && styles.checkboxDone]}
            onPress={(e) => {
              e.stopPropagation();
              handleBinaryToggle(item);
            }}
          >
            {completedToday && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ) : (
          <View style={styles.counterRow}>
            <Pressable
              style={styles.counterButton}
              onPress={(e) => {
                e.stopPropagation();
                undoToday(item.id);
              }}
            >
              <Text style={styles.counterButtonText}>−</Text>
            </Pressable>
            <Text style={styles.counterValue}>
              {doneCount}/{item.targetCount}
            </Text>
            <Pressable
              style={[styles.counterButton, completedToday && styles.counterButtonDone]}
              disabled={completedToday}
              onPress={(e) => {
                e.stopPropagation();
                handleIncrement(item);
              }}
            >
              <Text style={[styles.counterButtonText, completedToday && styles.counterButtonTextDone]}>
                {completedToday ? '✓' : '+'}
              </Text>
            </Pressable>
          </View>
        )}
      </Pressable>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>Today</Text>
        <Pressable style={styles.addButton} onPress={() => router.push('/add-habit')}>
          <Text style={styles.addButtonText}>+ Habit</Text>
        </Pressable>
      </View>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No habits yet. Add one to get started.</Text>
        }
      />

      {showSoftAsk && (
        <NotificationSoftAsk
          onAccept={async () => {
            setShowSoftAsk(false);
            await requestNotificationPermission();
          }}
          onDecline={async () => {
            setShowSoftAsk(false);
            await markSoftAskDeclined();
          }}
        />
      )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  addButton: {
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addButtonText: {
    color: colors.background,
    fontWeight: '700',
    fontSize: 13,
  },
  list: {
    flexGrow: 1,
    paddingBottom: 24,
  },
  emptyText: {
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 40,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  habitInfo: {
    flex: 1,
    marginRight: 12,
  },
  habitNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  challengeBadge: {
    backgroundColor: colors.accent + '33',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  challengeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.accent,
  },
  habitStreak: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.accent,
  },
  checkmark: {
    color: colors.background,
    fontSize: 14,
    fontWeight: '700',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterButtonDone: {
    backgroundColor: colors.accent,
  },
  counterButtonText: {
    color: colors.accent,
    fontSize: 16,
    fontWeight: '700',
  },
  counterButtonTextDone: {
    color: colors.background,
  },
  counterValue: {
    color: colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    minWidth: 36,
    textAlign: 'center',
  },
});
