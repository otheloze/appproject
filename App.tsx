import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

type Habit = {
  id: string;
  name: string;
  streak: number;
  lastCompletedDate: string | null;
};

const STORAGE_KEY = 'habit-tracker-demo-habits';

const DEFAULT_HABITS: Habit[] = [
  { id: 'default-1', name: 'Drink water', streak: 3, lastCompletedDate: null },
  { id: 'default-2', name: 'Exercise', streak: 1, lastCompletedDate: null },
  { id: 'default-3', name: 'Read 10 pages', streak: 0, lastCompletedDate: null },
  { id: 'default-4', name: 'Meditate', streak: 5, lastCompletedDate: null },
];

const todayKey = () => new Date().toDateString();

const yesterdayKey = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toDateString();
};

export default function App() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [newHabitName, setNewHabitName] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        setHabits(raw ? JSON.parse(raw) : DEFAULT_HABITS);
      })
      .finally(() => setLoaded(true));
  }, []);

  useEffect(() => {
    if (loaded) AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(habits));
  }, [habits, loaded]);

  const addHabit = () => {
    const name = newHabitName.trim();
    if (!name) return;
    setHabits((prev) => [
      ...prev,
      { id: Date.now().toString(), name, streak: 0, lastCompletedDate: null },
    ]);
    setNewHabitName('');
  };

  const deleteHabit = (id: string) => {
    setHabits((prev) => prev.filter((h) => h.id !== id));
  };

  const toggleToday = (id: string) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const completedToday = h.lastCompletedDate === todayKey();
        if (completedToday) {
          // undo today's completion
          return {
            ...h,
            streak: Math.max(0, h.streak - 1),
            lastCompletedDate: null,
          };
        }
        const continuesStreak = h.lastCompletedDate === yesterdayKey();
        return {
          ...h,
          streak: continuesStreak ? h.streak + 1 : 1,
          lastCompletedDate: todayKey(),
        };
      })
    );
  };

  const renderHabit = ({ item }: { item: Habit }) => {
    const completedToday = item.lastCompletedDate === todayKey();
    return (
      <View style={styles.habitRow}>
        <Pressable
          style={[styles.checkbox, completedToday && styles.checkboxDone]}
          onPress={() => toggleToday(item.id)}
        >
          {completedToday && <Text style={styles.checkmark}>✓</Text>}
        </Pressable>
        <View style={styles.habitInfo}>
          <Text style={styles.habitName}>{item.name}</Text>
          <Text style={styles.habitStreak}>
            🔥 {item.streak} day{item.streak === 1 ? '' : 's'}
          </Text>
        </View>
        <Pressable onPress={() => deleteHabit(item.id)} hitSlop={8}>
          <Text style={styles.deleteText}>✕</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar style="light" />
      <Text style={styles.title}>Habit Tracker</Text>
      <Text style={styles.subtitle}>Demo app · tap a habit to mark today done</Text>

      <FlatList
        data={habits}
        keyExtractor={(item) => item.id}
        renderItem={renderHabit}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <Text style={styles.emptyText}>No habits yet. Add one below to get started.</Text>
        }
      />

      <View style={styles.addRow}>
        <TextInput
          style={styles.input}
          placeholder="New habit, e.g. Drink water"
          placeholderTextColor="#565670"
          value={newHabitName}
          onChangeText={setNewHabitName}
          onSubmitEditing={addHabit}
          returnKeyType="done"
        />
        <Pressable style={styles.addButton} onPress={addHabit}>
          <Text style={styles.addButtonText}>Add</Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e17',
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f5f5fa',
  },
  subtitle: {
    fontSize: 13,
    color: '#8888a0',
    marginTop: 4,
    marginBottom: 16,
  },
  list: {
    flexGrow: 1,
  },
  emptyText: {
    color: '#8888a0',
    textAlign: 'center',
    marginTop: 40,
  },
  habitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a28',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#26263a',
  },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#8b7cf6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxDone: {
    backgroundColor: '#8b7cf6',
  },
  checkmark: {
    color: '#0e0e17',
    fontSize: 14,
    fontWeight: '700',
  },
  habitInfo: {
    flex: 1,
  },
  habitName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#f5f5fa',
  },
  habitStreak: {
    fontSize: 12,
    color: '#8888a0',
    marginTop: 2,
  },
  deleteText: {
    fontSize: 16,
    color: '#565670',
    paddingHorizontal: 6,
  },
  addRow: {
    flexDirection: 'row',
    marginTop: 8,
    marginBottom: 20,
  },
  input: {
    flex: 1,
    backgroundColor: '#1a1a28',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#26263a',
    color: '#f5f5fa',
  },
  addButton: {
    backgroundColor: '#8b7cf6',
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#0e0e17',
    fontWeight: '700',
  },
});
