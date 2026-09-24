import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AppMeta, Challenge, Habit, NotificationPrefs } from '../types';

const HABITS_KEY = 'habit-tracker-v2-habits';
const CHALLENGES_KEY = 'habit-tracker-v2-challenges';
const META_KEY = 'habit-tracker-v2-meta';
const NOTIFICATION_PREFS_KEY = 'habit-tracker-v2-notification-prefs';

const LEGACY_HABITS_KEY = 'habit-tracker-demo-habits';
const LEGACY_SEEDED_KEY = 'habit-tracker-demo-seeded';

type LegacyHabit = {
  id: string;
  name: string;
  streak: number;
  lastCompletedDate: string | null;
};

const DEFAULT_META: AppMeta = { onboardingComplete: false, schemaVersion: 2 };

const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  enabled: false,
  permissionStatus: 'undetermined',
  hasPromptedSoftAsk: false,
  scheduledIds: { midday: null, evening: null },
};

const readJson = async <T>(key: string): Promise<T | null> => {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

export const getHabits = () => readJson<Habit[]>(HABITS_KEY).then((v) => v ?? []);
export const setHabits = (habits: Habit[]) =>
  AsyncStorage.setItem(HABITS_KEY, JSON.stringify(habits));

export const getChallenges = () => readJson<Challenge[]>(CHALLENGES_KEY).then((v) => v ?? []);
export const setChallenges = (challenges: Challenge[]) =>
  AsyncStorage.setItem(CHALLENGES_KEY, JSON.stringify(challenges));

export const getMeta = () => readJson<AppMeta>(META_KEY).then((v) => v ?? DEFAULT_META);
export const setMeta = (meta: AppMeta) => AsyncStorage.setItem(META_KEY, JSON.stringify(meta));

export const getNotificationPrefs = () =>
  readJson<NotificationPrefs>(NOTIFICATION_PREFS_KEY).then((v) => v ?? DEFAULT_NOTIFICATION_PREFS);
export const setNotificationPrefs = (prefs: NotificationPrefs) =>
  AsyncStorage.setItem(NOTIFICATION_PREFS_KEY, JSON.stringify(prefs));

/**
 * One-time upconvert of the pre-v2 single-key, binary-only habit shape.
 * History (`completions`) isn't reconstructable from the legacy shape, so
 * habits come back with an empty completion log but keep their name/streak.
 */
export const migrateLegacyDataIfNeeded = async (): Promise<void> => {
  const meta = await getMeta();
  if (meta.schemaVersion >= 2) return;

  const [legacyRaw, legacySeeded] = await Promise.all([
    AsyncStorage.getItem(LEGACY_HABITS_KEY),
    AsyncStorage.getItem(LEGACY_SEEDED_KEY),
  ]);

  let onboardingComplete = false;

  if (legacySeeded && legacyRaw) {
    try {
      const legacyHabits = JSON.parse(legacyRaw) as LegacyHabit[];
      const migrated: Habit[] = legacyHabits.map((h) => ({
        id: h.id,
        name: h.name,
        type: 'binary',
        targetCount: 1,
        createdAt: new Date().toISOString(),
        streak: h.streak,
        bestStreak: h.streak,
        lastCompletedDate: h.lastCompletedDate,
        completions: {},
      }));
      await setHabits(migrated);
      // Existing users with prior habits skip onboarding entirely.
      onboardingComplete = migrated.length > 0;
    } catch {
      // Legacy data was malformed — fall through to a fresh start.
    }
  }

  await setMeta({ onboardingComplete, schemaVersion: 2 });
};
