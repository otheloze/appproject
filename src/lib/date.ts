export const todayKey = () => new Date().toDateString();

export const dateKeyOffset = (daysFromToday: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return d.toDateString();
};

export const yesterdayKey = () => dateKeyOffset(-1);

/** Is `dateKey` one of the `days` consecutive dates starting at `startKey`? */
export const isWithinWindow = (dateKey: string, startKey: string, days: number) => {
  const start = new Date(startKey);
  const target = new Date(dateKey);
  const diffDays = Math.round((target.getTime() - start.getTime()) / 86_400_000);
  return diffDays >= 0 && diffDays < days;
};

/** Number of days elapsed from startKey to today (0 on the start day). */
export const daysElapsedSince = (startKey: string) => {
  const start = new Date(startKey);
  const now = new Date(todayKey());
  return Math.round((now.getTime() - start.getTime()) / 86_400_000);
};

/** Parses a "HH:mm" (24-hour) time-of-day string, as stored on a habit's
 * `reminderTime`. Returns null for missing/malformed input. */
export const parseTimeOfDay = (time: string | null | undefined): { hour: number; minute: number } | null => {
  if (!time) return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
};

export const formatTimeOfDay = (hour: number, minute: number): string => {
  const period = hour < 12 ? 'AM' : 'PM';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
};

/** Converts minutes-since-midnight (0-1439) to a "HH:mm" storage string. */
export const minutesToTimeOfDay = (totalMinutes: number): string => {
  const hour = Math.floor(totalMinutes / 60) % 24;
  const minute = totalMinutes % 60;
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
};
