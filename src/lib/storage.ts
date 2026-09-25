import AsyncStorage from '@react-native-async-storage/async-storage';
import { iconForHabitName } from './icons';
import type { AppMeta, Challenge, Habit, NotificationPrefs } from '../types';

// Namespaced per signed-in user so two accounts on the same device never see
// each other's cached data (a stale AsyncStorage read is the only way that
// could otherwise leak between users).
const habitsKey = (userId: string) => `habit-tracker-v3-${userId}-habits`;
const challengesKey = (userId: string) => `habit-tracker-v3-${userId}-challenges`;
const metaKey = (userId: string) => `habit-tracker-v3-${userId}-meta`;
const notificationPrefsKey = (userId: string) => `habit-tracker-v3-${userId}-notification-prefs`;

// Pre-auth keys (from when this app had no sign-in) — read once per device,
// for a one-time migration into whichever user signs in first.
const PRE_AUTH_HABITS_KEY = 'habit-tracker-v2-habits';
const PRE_AUTH_CHALLENGES_KEY = 'habit-tracker-v2-challenges';
const PRE_AUTH_META_KEY = 'habit-tracker-v2-meta';
const PRE_AUTH_NOTIFICATION_PREFS_KEY = 'habit-tracker-v2-notification-prefs';
const PRE_AUTH_CLAIMED_KEY = 'habit-tracker-pre-auth-claimed';

// Pre-v2 single-screen demo keys, one migration hop further back.
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
    icon: '💧',
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
    icon: '🏃',
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
    icon: '📖',
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
    icon: '🧘',
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

export const getHabits = (userId: string) => readJson<Habit[]>(habitsKey(userId)).then((v) => v ?? []);
export const setHabits = (userId: string, habits: Habit[]) =>
  AsyncStorage.setItem(habitsKey(userId), JSON.stringify(habits));

export const getChallenges = (userId: string) =>
  readJson<Challenge[]>(challengesKey(userId)).then((v) => v ?? []);
export const setChallenges = (userId: string, challenges: Challenge[]) =>
  AsyncStorage.setItem(challengesKey(userId), JSON.stringify(challenges));

export const getMeta = (userId: string) => readJson<AppMeta>(metaKey(userId)).then((v) => v ?? DEFAULT_META);
export const setMeta = (userId: string, meta: AppMeta) =>
  AsyncStorage.setItem(metaKey(userId), JSON.stringify(meta));

export const getNotificationPrefs = (userId: string) =>
  readJson<NotificationPrefs>(notificationPrefsKey(userId)).then((v) => v ?? DEFAULT_NOTIFICATION_PREFS);
export const setNotificationPrefs = (userId: string, prefs: NotificationPrefs) =>
  AsyncStorage.setItem(notificationPrefsKey(userId), JSON.stringify(prefs));

/**
 * Runs once per (user, device): migrates pre-auth local data into this
 * user's namespace if this device has any and it hasn't been claimed by
 * anyone yet (upconverting the pre-v2 single-screen demo shape first, if
 * that's all that's present), then, for a genuinely fresh start, seeds the
 * original demo's starter habits so the app isn't empty.
 */
export const initializeStorageIfNeeded = async (userId: string): Promise<void> => {
  const meta = await getMeta(userId);
  if (meta.schemaVersion >= 2 && meta.seeded) return;

  let onboardingComplete = meta.onboardingComplete;
  let seeded = meta.seeded;

  if (!seeded) {
    const alreadyClaimed = await AsyncStorage.getItem(PRE_AUTH_CLAIMED_KEY);
    if (!alreadyClaimed) {
      const [preAuthHabits, preAuthMeta] = await Promise.all([
        readJson<Habit[]>(PRE_AUTH_HABITS_KEY),
        readJson<AppMeta>(PRE_AUTH_META_KEY),
      ]);

      if (preAuthHabits && preAuthHabits.length > 0) {
        const [preAuthChallenges, preAuthPrefs] = await Promise.all([
          readJson<Challenge[]>(PRE_AUTH_CHALLENGES_KEY),
          readJson<NotificationPrefs>(PRE_AUTH_NOTIFICATION_PREFS_KEY),
        ]);
        await setHabits(userId, preAuthHabits);
        await setChallenges(userId, preAuthChallenges ?? []);
        if (preAuthPrefs) await setNotificationPrefs(userId, preAuthPrefs);
        onboardingComplete = preAuthMeta?.onboardingComplete ?? true;
        seeded = true;
      } else {
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
              icon: iconForHabitName(h.name),
              type: 'binary',
              targetCount: 1,
              createdAt: new Date().toISOString(),
              streak: h.streak,
              bestStreak: h.streak,
              lastCompletedDate: h.lastCompletedDate,
              completions: {},
            }));
            await setHabits(userId, migrated);
            onboardingComplete = migrated.length > 0;
            seeded = true;
          } catch {
            // Legacy data was malformed — fall through to a fresh, unseeded start.
          }
        }
      }

      await AsyncStorage.setItem(PRE_AUTH_CLAIMED_KEY, '1');
    }
  }

  if (!seeded) {
    // Defensive: only seed onto a genuinely empty habit list.
    const existingHabits = await getHabits(userId);
    if (existingHabits.length === 0) {
      await setHabits(userId, DEFAULT_HABITS);
      // Default habits already give the user something to see, so skip the
      // forced "create your first habit" onboarding wizard for fresh installs.
      onboardingComplete = true;
    }
    seeded = true;
  }

  await setMeta(userId, { onboardingComplete, schemaVersion: 2, seeded });
};

/** Wipes this user's local cache back to a blank slate — used by the
 * Settings "Reset all data" action. Does not touch their remote data. */
export const resetAllData = async (userId: string): Promise<void> => {
  await AsyncStorage.multiRemove([habitsKey(userId), challengesKey(userId), metaKey(userId), notificationPrefsKey(userId)]);
};
