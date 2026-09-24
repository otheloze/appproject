import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';
import { parseTimeOfDay, todayKey } from './date';
import { getNotificationPrefs, setNotificationPrefs } from './storage';
import type { Challenge, Habit } from '../types';

// expo-notifications throws the instant it's imported on Android inside Expo
// Go (a top-level side effect in the library itself, unrelated to anything we
// call) — it requires a development build there. Everything in this module
// stays behind this guard and a lazy require so that import never happens in
// that one unsupported environment; iOS Expo Go and real dev/prod builds on
// both platforms are unaffected.
const notificationsUnsupported = isRunningInExpoGo() && Platform.OS === 'android';

export function notificationsSupported(): boolean {
  return !notificationsUnsupported;
}

type NotificationsModule = typeof import('expo-notifications');
let cachedModule: NotificationsModule | null = null;

function getNotifications(): NotificationsModule | null {
  if (notificationsUnsupported) return null;
  if (!cachedModule) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    cachedModule = require('expo-notifications') as NotificationsModule;
    cachedModule.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  }
  return cachedModule;
}

function dailyTrigger(Notifications: NotificationsModule, hour: number, minute: number) {
  return { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute } as const;
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = getNotifications();
  if (!Notifications) return false;

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
  const Notifications = getNotifications();
  if (!Notifications) return 'denied' as const;
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
  const Notifications = getNotifications();
  if (!Notifications) return;

  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return;

  await cancelAllNudges();

  const body = buildNudgeCopy(habits, challenges);
  if (!body) return;

  const middayId = await Notifications.scheduleNotificationAsync({
    content: { title: 'Habit check-in', body },
    trigger: dailyTrigger(Notifications, 12, 0),
  });
  const eveningId = await Notifications.scheduleNotificationAsync({
    content: { title: 'Habit check-in', body },
    trigger: dailyTrigger(Notifications, 19, 30),
  });

  await setNotificationPrefs({
    ...prefs,
    scheduledIds: { midday: middayId, evening: eveningId },
  });
}

export async function cancelAllNudges(): Promise<void> {
  const Notifications = getNotifications();
  if (Notifications) {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
  const prefs = await getNotificationPrefs();
  await setNotificationPrefs({ ...prefs, scheduledIds: { midday: null, evening: null } });
}

/**
 * Schedules a habit's own custom-time daily reminder (distinct from the two
 * general check-in nudges above). Returns the new notification id, or null
 * if reminders are unsupported/disabled or the habit has no reminderTime set.
 * Callers are responsible for persisting the returned id onto the habit and
 * for cancelling any previous id via `cancelHabitReminderById` first.
 */
export async function scheduleHabitReminder(habit: Habit): Promise<string | null> {
  const Notifications = getNotifications();
  if (!Notifications) return null;

  const time = parseTimeOfDay(habit.reminderTime);
  if (!time) return null;

  const prefs = await getNotificationPrefs();
  if (!prefs.enabled) return null;

  const body = habit.reminderIntention
    ? `Time to ${habit.reminderIntention} — ${habit.name}.`
    : `Don't forget: ${habit.name}.`;

  return Notifications.scheduleNotificationAsync({
    content: { title: 'Habit reminder', body },
    trigger: dailyTrigger(Notifications, time.hour, time.minute),
  });
}

export async function cancelHabitReminderById(id: string | null | undefined): Promise<void> {
  if (!id) return;
  const Notifications = getNotifications();
  if (!Notifications) return;
  await Notifications.cancelScheduledNotificationAsync(id);
}
