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

const DEFAULT_META: AppMeta = { onboardingComplete: false, schemaVersion: 2, seeded: false };

// Restored from the original single-screen demo, carried over as starter
// content so the app doesn't look empty before/alongside the onboarding
// habit — same names and demo streak values as before.
const DEFAULT_HABITS: Habit[] = [
  {
    id: 'default-1',
    name: 'Drink water',
    type: 'binary',
    targetCount: 1,
    createdAt: new Date().toISOString(),
    streak: 3,
    bestStreak: 3,
    lastCompletedDate: null,
    completions: {},
  },
  {
    id: 'default-2',
    name: 'Exercise',
    type: 'binary',
    targetCount: 1,
    createdAt: new Date().toISOString(),
    streak: 1,
    bestStreak: 1,
    lastCompletedDate: null,
    completions: {},
  },
  {
    id: 'default-3',
    name: 'Read 10 pages',
    type: 'binary',
    targetCount: 1,
    createdAt: new Date().toISOString(),
    streak: 0,
    bestStreak: 0,
    lastCompletedDate: null,
    completions: {},
  },
  {
    id: 'default-4',
    name: 'Meditate',
    type: 'binary',
    targetCount: 1,
    createdAt: new Date().toISOString(),
    streak: 5,
    bestStreak: 5,
    lastCompletedDate: null,
    completions: {},
  },
];

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
 * Runs once per install: upconverts the pre-v2 single-key, binary-only habit
 * shape if present (history isn't reconstructable from that shape, so
 * migrated habits come back with an empty completion log but keep their
 * name/streak), then, for genuinely fresh installs with no prior data at
 * all, seeds the original demo's starter habits so the app isn't empty.
 */
export const initializeStorageIfNeeded = async (): Promise<void> => {
  const meta = await getMeta();
  if (meta.schemaVersion >= 2 && meta.seeded) return;

  let onboardingComplete = meta.onboardingComplete;
  let seeded = meta.seeded;

  if (meta.schemaVersion < 2) {
    const [legacyRaw, legacySeeded] = await Promise.all([
      AsyncStorage.getItem(LEGACY_HABITS_KEY),
      AsyncStorage.getItem(LEGACY_SEEDED_KEY),
    ]);

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
        seeded = true;
      } catch {
        // Legacy data was malformed — fall through to a fresh, unseeded start.
      }
    }
  }

  if (!seeded) {
    // Defensive: only seed onto a genuinely empty habit list.
    const existingHabits = await getHabits();
    if (existingHabits.length === 0) {
      await setHabits(DEFAULT_HABITS);
      // Default habits already give the user something to see, so skip the
      // forced "create your first habit" onboarding wizard for fresh installs.
      onboardingComplete = true;
    }
    seeded = true;
  }

  await setMeta({ onboardingComplete, schemaVersion: 2, seeded });
};

/** Wipes all app storage (current schema and any legacy keys) back to a
 * blank slate — used by the Settings "Reset all data" action. */
export const resetAllData = async (): Promise<void> => {
  await AsyncStorage.multiRemove([
    HABITS_KEY,
    CHALLENGES_KEY,
    META_KEY,
    NOTIFICATION_PREFS_KEY,
    LEGACY_HABITS_KEY,
    LEGACY_SEEDED_KEY,
  ]);
};
