import { supabase } from './supabase';
import type { Challenge, Habit, NotificationPrefs } from '../types';

type HabitRow = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  type: 'binary' | 'count';
  target_count: number;
  created_at: string;
  streak: number;
  best_streak: number;
  last_completed_date: string | null;
  completions: Record<string, number>;
  reminder_intention: string | null;
  reminder_time: string | null;
  reminder_notification_id: string | null;
  archived_at: string | null;
};

type ChallengeRow = {
  id: string;
  user_id: string;
  habit_id: string;
  kind: string;
  start_date_key: string;
  duration_days: number;
  completed_days: string[];
  status: Challenge['status'];
  reward_claimed: boolean;
};

type NotificationPrefsRow = {
  user_id: string;
  enabled: boolean;
  permission_status: NotificationPrefs['permissionStatus'];
  has_prompted_soft_ask: boolean;
  scheduled_midday_id: string | null;
  scheduled_evening_id: string | null;
};

const habitToRow = (userId: string, h: Habit): HabitRow => ({
  id: h.id,
  user_id: userId,
  name: h.name,
  icon: h.icon,
  type: h.type,
  target_count: h.targetCount,
  created_at: h.createdAt,
  streak: h.streak,
  best_streak: h.bestStreak,
  last_completed_date: h.lastCompletedDate,
  completions: h.completions,
  reminder_intention: h.reminderIntention ?? null,
  reminder_time: h.reminderTime ?? null,
  reminder_notification_id: h.reminderNotificationId ?? null,
  archived_at: h.archivedAt ?? null,
});

const rowToHabit = (r: HabitRow): Habit => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  type: r.type,
  targetCount: r.target_count,
  createdAt: r.created_at,
  streak: r.streak,
  bestStreak: r.best_streak,
  lastCompletedDate: r.last_completed_date,
  completions: r.completions ?? {},
  reminderIntention: r.reminder_intention ?? undefined,
  reminderTime: r.reminder_time,
  reminderNotificationId: r.reminder_notification_id,
  archivedAt: r.archived_at,
});

const challengeToRow = (userId: string, c: Challenge): ChallengeRow => ({
  id: c.id,
  user_id: userId,
  habit_id: c.habitId,
  kind: c.kind,
  start_date_key: c.startDateKey,
  duration_days: c.durationDays,
  completed_days: c.completedDays,
  status: c.status,
  reward_claimed: c.rewardClaimed,
});

const rowToChallenge = (r: ChallengeRow): Challenge => ({
  id: r.id,
  habitId: r.habit_id,
  kind: '3-day-kickstart',
  startDateKey: r.start_date_key,
  durationDays: r.duration_days,
  completedDays: r.completed_days ?? [],
  status: r.status,
  rewardClaimed: r.reward_claimed,
});

const prefsToRow = (userId: string, p: NotificationPrefs): NotificationPrefsRow => ({
  user_id: userId,
  enabled: p.enabled,
  permission_status: p.permissionStatus,
  has_prompted_soft_ask: p.hasPromptedSoftAsk,
  scheduled_midday_id: p.scheduledIds.midday,
  scheduled_evening_id: p.scheduledIds.evening,
});

const rowToPrefs = (r: NotificationPrefsRow): NotificationPrefs => ({
  enabled: r.enabled,
  permissionStatus: r.permission_status,
  hasPromptedSoftAsk: r.has_prompted_soft_ask,
  scheduledIds: { midday: r.scheduled_midday_id, evening: r.scheduled_evening_id },
});

export type RemoteSnapshot = {
  habits: Habit[];
  challenges: Challenge[];
  notificationPrefs: NotificationPrefs | null;
};

/** Best-effort pull of everything for this user. Returns null on any
 * failure (offline, etc.) so callers can fall back to the local cache. */
export async function pullRemoteSnapshot(userId: string): Promise<RemoteSnapshot | null> {
  try {
    const [habitsRes, challengesRes, prefsRes] = await Promise.all([
      supabase.from('habits').select('*').eq('user_id', userId),
      supabase.from('challenges').select('*').eq('user_id', userId),
      supabase.from('notification_prefs').select('*').eq('user_id', userId).maybeSingle(),
    ]);
    if (habitsRes.error || challengesRes.error || prefsRes.error) return null;

    return {
      habits: (habitsRes.data as HabitRow[]).map(rowToHabit),
      challenges: (challengesRes.data as ChallengeRow[]).map(rowToChallenge),
      notificationPrefs: prefsRes.data ? rowToPrefs(prefsRes.data as NotificationPrefsRow) : null,
    };
  } catch {
    return null;
  }
}

/** Upserts the full current habit list and deletes any that were removed
 * since `previousIds`. Best-effort/fire-and-forget — failures (e.g. offline)
 * are swallowed since the next successful sync re-sends full state anyway. */
export async function pushHabits(userId: string, habits: Habit[], previousIds: Iterable<string>): Promise<void> {
  try {
    const currentIds = new Set(habits.map((h) => h.id));
    const removedIds = [...previousIds].filter((id) => !currentIds.has(id));
    if (habits.length > 0) {
      await supabase.from('habits').upsert(habits.map((h) => habitToRow(userId, h)));
    }
    if (removedIds.length > 0) {
      await supabase.from('habits').delete().in('id', removedIds);
    }
  } catch {
    // Offline or transient failure — the next state change re-syncs full state.
  }
}

export async function pushChallenges(
  userId: string,
  challenges: Challenge[],
  previousIds: Iterable<string>
): Promise<void> {
  try {
    const currentIds = new Set(challenges.map((c) => c.id));
    const removedIds = [...previousIds].filter((id) => !currentIds.has(id));
    if (challenges.length > 0) {
      await supabase.from('challenges').upsert(challenges.map((c) => challengeToRow(userId, c)));
    }
    if (removedIds.length > 0) {
      await supabase.from('challenges').delete().in('id', removedIds);
    }
  } catch {
    // Offline or transient failure — the next state change re-syncs full state.
  }
}

export async function pushNotificationPrefs(userId: string, prefs: NotificationPrefs): Promise<void> {
  try {
    await supabase.from('notification_prefs').upsert(prefsToRow(userId, prefs));
  } catch {
    // Offline or transient failure — the next preference change re-syncs it.
  }
}

/** Deletes all of this user's rows across every table — used by "Reset all data". */
export async function deleteRemoteData(userId: string): Promise<void> {
  try {
    await Promise.all([
      supabase.from('habits').delete().eq('user_id', userId),
      supabase.from('challenges').delete().eq('user_id', userId),
      supabase.from('notification_prefs').delete().eq('user_id', userId),
    ]);
  } catch {
    // Best-effort — local reset already happened, which is what matters most.
  }
}
