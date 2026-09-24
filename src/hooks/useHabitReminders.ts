import { useEffect, useRef } from 'react';
import { cancelHabitReminderById, scheduleHabitReminder } from '../lib/notifications';
import { getNotificationPrefs } from '../lib/storage';
import type { Habit } from '../types';

/**
 * Keeps each habit's own custom-time reminder (as opposed to the two
 * general check-in nudges) in sync with its `reminderTime`/`reminderIntention`.
 * Rescheduling a native daily trigger is only worth doing when that config
 * actually changes, not on every habit-array change (e.g. a completion
 * ticking a streak), so a per-habit signature is cached across renders and
 * only a mismatch triggers a cancel+reschedule.
 */
export function useHabitReminders(
  habits: Habit[],
  loaded: boolean,
  onReminderIdChange: (habitId: string, reminderNotificationId: string | null) => void
) {
  const signaturesRef = useRef<Record<string, string | null>>({});

  useEffect(() => {
    if (!loaded) return;
    let cancelled = false;

    (async () => {
      const prefs = await getNotificationPrefs();
      for (const habit of habits) {
        const desired = habit.reminderTime && prefs.enabled
          ? `${habit.reminderTime}::${habit.reminderIntention ?? ''}`
          : null;
        if (signaturesRef.current[habit.id] === desired) continue;
        signaturesRef.current[habit.id] = desired;

        await cancelHabitReminderById(habit.reminderNotificationId);
        const newId = desired ? await scheduleHabitReminder(habit) : null;
        if (cancelled) return;
        if (newId !== (habit.reminderNotificationId ?? null)) {
          onReminderIdChange(habit.id, newId);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [habits, loaded, onReminderIdChange]);

  useEffect(() => {
    const known = new Set(habits.map((h) => h.id));
    for (const id of Object.keys(signaturesRef.current)) {
      if (!known.has(id)) delete signaturesRef.current[id];
    }
  }, [habits]);
}
