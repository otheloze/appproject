import * as Haptics from 'expo-haptics';
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';
import { daysElapsedSince, todayKey, yesterdayKey } from '../lib/date';
import { cancelHabitReminderById } from '../lib/notifications';
import {
  getChallenges,
  getHabits,
  getMeta,
  initializeStorageIfNeeded,
  setChallenges as persistChallenges,
  setHabits as persistHabits,
  setMeta,
} from '../lib/storage';
import type { Challenge, Habit, HabitType } from '../types';

export type CompletionResult = {
  justCompleted: boolean;
  completedChallenge: Challenge | null;
};

type AddHabitInput = {
  name: string;
  type: HabitType;
  targetCount: number;
  reminderIntention?: string;
  reminderTime?: string | null;
};

type HabitsContextValue = {
  loaded: boolean;
  habits: Habit[];
  challenges: Challenge[];
  onboardingComplete: boolean;
  completeOnboarding: () => void;
  addHabit: (input: AddHabitInput, opts?: { startChallenge?: boolean }) => Habit;
  editHabit: (
    id: string,
    patch: Partial<Pick<Habit, 'name' | 'targetCount' | 'reminderIntention' | 'reminderTime' | 'reminderNotificationId'>>
  ) => void;
  deleteHabit: (id: string) => void;
  completeBinary: (id: string) => CompletionResult;
  incrementCount: (id: string) => CompletionResult;
  undoToday: (id: string) => void;
  activeChallengeForHabit: (habitId: string) => Challenge | undefined;
  startChallenge: (habitId: string) => void;
  claimChallengeReward: (challengeId: string) => void;
  todaysPendingHabits: () => Habit[];
};

const HabitsContext = createContext<HabitsContextValue | null>(null);

function reconcileChallenges(challenges: Challenge[]): Challenge[] {
  return challenges.map((c) => {
    if (c.status !== 'active') return c;
    const elapsed = daysElapsedSince(c.startDateKey);
    if (elapsed >= c.durationDays && c.completedDays.length < c.durationDays) {
      return { ...c, status: 'failed' };
    }
    return c;
  });
}

function makeChallenge(habitId: string): Challenge {
  return {
    id: `${habitId}-challenge-${Date.now()}`,
    habitId,
    kind: '3-day-kickstart',
    startDateKey: todayKey(),
    durationDays: 3,
    completedDays: [],
    status: 'active',
    rewardClaimed: false,
  };
}

export function HabitsProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [habits, setHabitsState] = useState<Habit[]>([]);
  const [challenges, setChallengesState] = useState<Challenge[]>([]);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Mirrors latest state so action creators can read-before-write without
  // waiting on a re-render (needed to report "did this just cross the
  // target/finish the challenge" back to the caller for reward triggering).
  const habitsRef = useRef<Habit[]>(habits);
  const challengesRef = useRef<Challenge[]>(challenges);
  // `seeded` only ever flips false->true once, inside initializeStorageIfNeeded;
  // stashed here so the meta-persisting effect below doesn't need to reset it.
  const seededRef = useRef(true);
  useEffect(() => {
    habitsRef.current = habits;
  }, [habits]);
  useEffect(() => {
    challengesRef.current = challenges;
  }, [challenges]);

  useEffect(() => {
    (async () => {
      await initializeStorageIfNeeded();
      const [h, c, meta] = await Promise.all([getHabits(), getChallenges(), getMeta()]);
      setHabitsState(h);
      setChallengesState(reconcileChallenges(c));
      setOnboardingComplete(meta.onboardingComplete);
      seededRef.current = meta.seeded;
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (loaded) persistHabits(habits);
  }, [habits, loaded]);

  useEffect(() => {
    if (loaded) persistChallenges(challenges);
  }, [challenges, loaded]);

  useEffect(() => {
    if (loaded) setMeta({ onboardingComplete, schemaVersion: 2, seeded: seededRef.current });
  }, [onboardingComplete, loaded]);

  // Re-check challenge windows whenever the app comes back to the foreground,
  // so a challenge missed while the app was closed shows as failed promptly.
  useEffect(() => {
    if (!loaded) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') setChallengesState((prev) => reconcileChallenges(prev));
    });
    return () => sub.remove();
  }, [loaded]);

  const completeOnboarding = useCallback(() => setOnboardingComplete(true), []);

  const markChallengeDayComplete = useCallback((habitId: string): Challenge | null => {
    const challenge = challengesRef.current.find((c) => c.habitId === habitId && c.status === 'active');
    if (!challenge) return null;
    const today = todayKey();
    if (challenge.completedDays.includes(today)) return null;

    const completedDays = [...challenge.completedDays, today];
    const isDone = completedDays.length >= challenge.durationDays;
    const updated: Challenge = { ...challenge, completedDays, status: isDone ? 'completed' : 'active' };
    setChallengesState((prev) => prev.map((c) => (c.id === challenge.id ? updated : c)));
    return isDone ? updated : null;
  }, []);

  const addHabit = useCallback<HabitsContextValue['addHabit']>((input, opts) => {
    const habit: Habit = {
      id: Date.now().toString(),
      name: input.name,
      type: input.type,
      targetCount: input.type === 'binary' ? 1 : Math.max(1, input.targetCount),
      createdAt: new Date().toISOString(),
      streak: 0,
      bestStreak: 0,
      lastCompletedDate: null,
      completions: {},
      reminderIntention: input.reminderIntention,
      reminderTime: input.reminderTime ?? null,
      reminderNotificationId: null,
    };
    setHabitsState((prev) => [...prev, habit]);
    if (opts?.startChallenge) {
      setChallengesState((prev) => [...prev, makeChallenge(habit.id)]);
    }
    return habit;
  }, []);

  const editHabit = useCallback<HabitsContextValue['editHabit']>((id, patch) => {
    setHabitsState((prev) => prev.map((h) => (h.id === id ? { ...h, ...patch } : h)));
  }, []);

  const deleteHabit = useCallback((id: string) => {
    const habit = habitsRef.current.find((h) => h.id === id);
    if (habit?.reminderNotificationId) {
      cancelHabitReminderById(habit.reminderNotificationId);
    }
    setHabitsState((prev) => prev.filter((h) => h.id !== id));
    setChallengesState((prev) => prev.filter((c) => c.habitId !== id));
  }, []);

  const completeBinary = useCallback<HabitsContextValue['completeBinary']>(
    (id) => {
      const habit = habitsRef.current.find((h) => h.id === id);
      if (!habit) return { justCompleted: false, completedChallenge: null };

      const today = todayKey();
      const alreadyDoneToday = habit.lastCompletedDate === today;

      if (alreadyDoneToday) {
        setHabitsState((prev) =>
          prev.map((h) =>
            h.id === id
              ? {
                  ...h,
                  streak: Math.max(0, h.streak - 1),
                  lastCompletedDate: null,
                  completions: { ...h.completions, [today]: 0 },
                }
              : h
          )
        );
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        return { justCompleted: false, completedChallenge: null };
      }

      const continuesStreak = habit.lastCompletedDate === yesterdayKey();
      const nextStreak = continuesStreak ? habit.streak + 1 : 1;
      setHabitsState((prev) =>
        prev.map((h) =>
          h.id === id
            ? {
                ...h,
                streak: nextStreak,
                bestStreak: Math.max(h.bestStreak, nextStreak),
                lastCompletedDate: today,
                completions: { ...h.completions, [today]: 1 },
              }
            : h
        )
      );
      const completedChallenge = markChallengeDayComplete(id);
      return { justCompleted: true, completedChallenge };
    },
    [markChallengeDayComplete]
  );

  const incrementCount = useCallback<HabitsContextValue['incrementCount']>(
    (id) => {
      const habit = habitsRef.current.find((h) => h.id === id);
      if (!habit) return { justCompleted: false, completedChallenge: null };

      const today = todayKey();
      const currentCount = habit.completions[today] ?? 0;
      if (currentCount >= habit.targetCount) return { justCompleted: false, completedChallenge: null };

      const nextCount = currentCount + 1;
      const crossesTarget = nextCount >= habit.targetCount;
      const continuesStreak = habit.lastCompletedDate === yesterdayKey();
      const nextStreak = crossesTarget ? (continuesStreak ? habit.streak + 1 : 1) : habit.streak;

      setHabitsState((prev) =>
        prev.map((h) =>
          h.id === id
            ? {
                ...h,
                completions: { ...h.completions, [today]: nextCount },
                streak: nextStreak,
                bestStreak: Math.max(h.bestStreak, nextStreak),
                lastCompletedDate: crossesTarget ? today : h.lastCompletedDate,
              }
            : h
        )
      );

      if (crossesTarget) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const completedChallenge = markChallengeDayComplete(id);
        return { justCompleted: true, completedChallenge };
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return { justCompleted: false, completedChallenge: null };
    },
    [markChallengeDayComplete]
  );

  const undoToday = useCallback((id: string) => {
    setHabitsState((prev) =>
      prev.map((h) => {
        if (h.id !== id) return h;
        const today = todayKey();
        const currentCount = h.completions[today] ?? 0;
        if (currentCount <= 0) return h;
        const nextCount = currentCount - 1;
        const wasComplete = currentCount >= h.targetCount;
        return {
          ...h,
          completions: { ...h.completions, [today]: nextCount },
          streak: wasComplete ? Math.max(0, h.streak - 1) : h.streak,
          lastCompletedDate: wasComplete ? null : h.lastCompletedDate,
        };
      })
    );
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const activeChallengeForHabit = useCallback(
    (habitId: string) => challenges.find((c) => c.habitId === habitId && c.status === 'active'),
    [challenges]
  );

  const startChallenge = useCallback((habitId: string) => {
    const existing = challengesRef.current.find((c) => c.habitId === habitId && c.status === 'active');
    if (existing) return;
    setChallengesState((prev) => [...prev, makeChallenge(habitId)]);
  }, []);

  const claimChallengeReward = useCallback((challengeId: string) => {
    setChallengesState((prev) => prev.map((c) => (c.id === challengeId ? { ...c, rewardClaimed: true } : c)));
  }, []);

  const todaysPendingHabits = useCallback(() => {
    const today = todayKey();
    return habitsRef.current.filter((h) => (h.completions[today] ?? 0) < h.targetCount);
  }, []);

  const value = useMemo<HabitsContextValue>(
    () => ({
      loaded,
      habits,
      challenges,
      onboardingComplete,
      completeOnboarding,
      addHabit,
      editHabit,
      deleteHabit,
      completeBinary,
      incrementCount,
      undoToday,
      activeChallengeForHabit,
      startChallenge,
      claimChallengeReward,
      todaysPendingHabits,
    }),
    [
      loaded,
      habits,
      challenges,
      onboardingComplete,
      completeOnboarding,
      addHabit,
      editHabit,
      deleteHabit,
      completeBinary,
      incrementCount,
      undoToday,
      activeChallengeForHabit,
      startChallenge,
      claimChallengeReward,
      todaysPendingHabits,
    ]
  );

  return <HabitsContext.Provider value={value}>{children}</HabitsContext.Provider>;
}

export function useHabitsStore() {
  const ctx = useContext(HabitsContext);
  if (!ctx) throw new Error('useHabitsStore must be used within a HabitsProvider');
  return ctx;
}
