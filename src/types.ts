export type HabitType = 'binary' | 'count';

export type Habit = {
  id: string;
  name: string;
  icon: string; // emoji, chosen from a fixed picker set (see HABIT_ICONS)
  type: HabitType;
  targetCount: number; // 1 for binary habits
  createdAt: string; // ISO timestamp
  streak: number;
  bestStreak: number;
  lastCompletedDate: string | null; // dateKey of the last fully-completed day
  completions: Record<string, number>; // dateKey -> count logged that day
  reminderIntention?: string;
  reminderTime?: string | null; // "HH:mm" (24-hour), null/undefined = no per-habit reminder
  reminderNotificationId?: string | null; // scheduled expo-notifications id for reminderTime, for cancel/reschedule
  archivedAt?: string | null;
};

export type ChallengeStatus = 'active' | 'completed' | 'failed';

export type Challenge = {
  id: string;
  habitId: string;
  kind: '3-day-kickstart';
  startDateKey: string;
  durationDays: number;
  completedDays: string[];
  status: ChallengeStatus;
  rewardClaimed: boolean;
};

export type NotificationPermissionStatus = 'undetermined' | 'granted' | 'denied';

export type NotificationPrefs = {
  enabled: boolean;
  permissionStatus: NotificationPermissionStatus;
  hasPromptedSoftAsk: boolean;
  scheduledIds: {
    midday: string | null;
    evening: string | null;
  };
};

export type AppMeta = {
  onboardingComplete: boolean;
  schemaVersion: number;
  seeded: boolean;
};
