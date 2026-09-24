import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { RewardOverlay } from '../components/RewardOverlay';
import type { Habit } from '../types';

type RewardState =
  | { visible: false }
  | { visible: true; variant: 'habit'; habitName: string }
  | { visible: true; variant: 'challenge'; habitName: string };

type RewardsContextValue = {
  celebrateHabit: (habit: Habit) => void;
  celebrateChallenge: (habitName: string) => void;
};

const RewardsContext = createContext<RewardsContextValue | null>(null);

export function RewardsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RewardState>({ visible: false });

  const celebrateHabit = useCallback((habit: Habit) => {
    setState({ visible: true, variant: 'habit', habitName: habit.name });
  }, []);

  const celebrateChallenge = useCallback((habitName: string) => {
    setState({ visible: true, variant: 'challenge', habitName });
  }, []);

  const dismiss = useCallback(() => setState({ visible: false }), []);

  return (
    <RewardsContext.Provider value={{ celebrateHabit, celebrateChallenge }}>
      {children}
      {state.visible && (
        <RewardOverlay
          variant={state.variant}
          habitName={state.habitName}
          onDone={dismiss}
        />
      )}
    </RewardsContext.Provider>
  );
}

export function useRewards() {
  const ctx = useContext(RewardsContext);
  if (!ctx) throw new Error('useRewards must be used within a RewardsProvider');
  return ctx;
}
