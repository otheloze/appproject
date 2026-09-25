import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { scheduleDailyNudges } from '../lib/notifications';
import type { Challenge, Habit } from '../types';

/** Reschedules the two daily local nudges whenever habit/challenge state
 * changes, and again whenever the app returns to the foreground (since
 * notification content is fixed at schedule time, not fire time). */
export function useNotificationScheduler(
  userId: string | null,
  habits: Habit[],
  challenges: Challenge[],
  loaded: boolean
) {
  const habitsRef = useRef(habits);
  const challengesRef = useRef(challenges);
  useEffect(() => {
    habitsRef.current = habits;
    challengesRef.current = challenges;
  }, [habits, challenges]);

  useEffect(() => {
    if (!loaded || !userId) return;
    scheduleDailyNudges(userId, habits, challenges);
  }, [userId, habits, challenges, loaded]);

  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') scheduleDailyNudges(userId, habitsRef.current, challengesRef.current);
    });
    return () => sub.remove();
  }, [userId]);
}
