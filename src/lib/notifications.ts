import * as Notifications from 'expo-notifications';
import { todayKey } from './date';
import { getNotificationPrefs, setNotificationPrefs } from './storage';
import type { Challenge, Habit } from '../types';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const MIDDAY_TRIGGER = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 12, minute: 0 } as const;
const EVENING_TRIGGER = { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: 19, minute: 30 } as const;

export async function requestNotificationPermission(): Promise<boolean> {
  const { status } = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: true, allowSound: true },
  });
  const granted = status === 'granted';
  const prefs = await getNotificationPrefs();
  await setNotificationPrefs({
    ...prefs,
    enabled: granted,
    permissionStatus: granted ? 'granted' : 'denied',
    hasPromptedSoftAsk: true,
  });
  return granted;
}

export async function getCurrentPermissionStatus() {
  const { status } = await Notifications.getPermissionsAsync();
  return status;
}

/** Records that the in-app soft-ask was shown and dismissed without
 * requesting the OS permission, so it isn't shown again. */
export async function markSoftAskDeclined(): Promise<void> {
  const prefs = await getNotificationPrefs();
  await setNotificationPrefs({ ...prefs, hasPromptedSoftAsk: true });
}

/**
 * Priority-ordered nudge copy. Returns null when there's nothing worth
 * nudging about today (everything done, or nothing set up yet).
 */
export function buildNudgeCopy(habits: Habit[], challenges: Challenge[]): string | null {
  const today = todayKey();

  if (habits.length === 0) {
    return "Still thinking about your first habit? Takes 10 seconds to start one.";
  }

  const activeChallenges = challenges.filter((c) => c.status === 'active');
  for (const challenge of activeChallenges) {
    const dayNumber = challenge.completedDays.length + 1;
    const isLastDay = dayNumber >= challenge.durationDays;
    const doneToday = challenge.completedDays.includes(today);
    if (isLastDay && !doneToday) {
      const habit = habits.find((h) => h.id === challenge.habitId);
      if (habit) {
        return `Day ${dayNumber} of your ${challenge.durationDays}-day challenge on ${habit.name} — finish today to lock it in!`;
      }
    }
  }

  const pending = habits.filter((h) => (h.completions[today] ?? 0) < h.targetCount);
  if (pending.length === 0) return null;

  const countHabitInProgress = pending.find((h) => h.type === 'count' && (h.completions[today] ?? 0) > 0);
  if (countHabitInProgress) {
    const done = countHabitInProgress.completions[today] ?? 0;
    const remaining = countHabitInProgress.targetCount - done;
    return `${countHabitInProgress.name}: ${done}/${countHabitInProgress.targetCount} done — ${remaining} more to hit today's goal.`;
  }

  const withIntention = pending.find((h) => h.reminderIntention);
  if (withIntention) {
    return `You said you'd ${withIntention.reminderIntention} today — still on for it?`;
  }

  const first = pending[0];
  return `Don't break the chain — ${first.name} is still waiting on you today.`;
}

/**
 * Cancels and reschedules the two daily local reminders based on current
 * state. Content is fixed at schedule time (expo-notifications has no
 * fire-time callback), so this should be called on app foreground and on
 * every habit/challenge state change to keep copy from going stale.
 */
export async function scheduleDailyNudges(habits: Habit[], challenges: Challenge[]): Promise<void> {
  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return;

  await cancelAllNudges();

  const body = buildNudgeCopy(habits, challenges);
  if (!body) return;

  const middayId = await Notifications.scheduleNotificationAsync({
    content: { title: 'Habit check-in', body },
    trigger: MIDDAY_TRIGGER,
  });
  const eveningId = await Notifications.scheduleNotificationAsync({
    content: { title: 'Habit check-in', body },
    trigger: EVENING_TRIGGER,
  });

  await setNotificationPrefs({
    ...prefs,
    scheduledIds: { midday: middayId, evening: eveningId },
  });
}

export async function cancelAllNudges(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  const prefs = await getNotificationPrefs();
  await setNotificationPrefs({ ...prefs, scheduledIds: { midday: null, evening: null } });
}
