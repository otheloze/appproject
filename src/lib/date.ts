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
