export const DEFAULT_HABIT_ICON = '🎯';

// Ordered keyword -> icon rules; the habit's icon is derived automatically
// from its name (first matching rule wins), not chosen by the user, so two
// habits named "Drink water" always look the same.
const ICON_RULES: { keywords: string[]; icon: string }[] = [
  { keywords: ['water', 'hydrat'], icon: '💧' },
  { keywords: ['exercise', 'workout', 'gym', 'run', 'jog', 'walk', 'stretch'], icon: '🏃' },
  { keywords: ['read', 'book'], icon: '📖' },
  { keywords: ['meditat', 'mindful', 'breath'], icon: '🧘' },
  { keywords: ['sleep', 'bed'], icon: '😴' },
  { keywords: ['eat', 'diet', 'healthy', 'salad', 'veg', 'fruit', 'meal'], icon: '🥗' },
  { keywords: ['medic', 'pill', 'vitamin', 'supplement'], icon: '💊' },
  { keywords: ['journal', 'write', 'writing', 'diary'], icon: '✍️' },
  { keywords: ['draw', 'paint', 'art', 'creativ', 'sketch'], icon: '🎨' },
  { keywords: ['save', 'money', 'budget', 'spend'], icon: '💰' },
  { keywords: ['clean', 'tidy', 'chore', 'laundry', 'dish'], icon: '🧹' },
  { keywords: ['smok', 'vape', 'quit'], icon: '🚭' },
  { keywords: ['screen', 'phone', 'social media'], icon: '📵' },
  { keywords: ['music', 'guitar', 'piano', 'practice'], icon: '🎵' },
  { keywords: ['study', 'learn', 'course', 'homework'], icon: '📚' },
];

/** Derives a habit's icon from its name — a fixed rule, not a user choice. */
export function iconForHabitName(name: string): string {
  const lower = name.toLowerCase();
  const rule = ICON_RULES.find((r) => r.keywords.some((keyword) => lower.includes(keyword)));
  return rule?.icon ?? DEFAULT_HABIT_ICON;
}
