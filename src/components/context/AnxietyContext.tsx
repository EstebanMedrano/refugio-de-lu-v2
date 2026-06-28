import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface AnxietyState {
  level: number;
  setLevel: (level: number) => void;
  reduceLevel: () => void;
}

const AnxietyContext = createContext<AnxietyState | undefined>(undefined);

export function AnxietyProvider({ children }: { children: ReactNode }) {
  const [level, setLevelState] = useState(() => {
    const saved = localStorage.getItem('calma_last_level');
    return saved ? parseInt(saved) : 0;
  });

  const setLevel = useCallback((newLevel: number) => {
    const clampedLevel = Math.min(10, Math.max(0, newLevel));
    setLevelState(clampedLevel);
    localStorage.setItem('calma_last_level', clampedLevel.toString());
  }, []);

  const reduceLevel = useCallback(() => {
    setLevelState(prev => {
      const newLevel = Math.max(0, prev - 1);
      localStorage.setItem('calma_last_level', newLevel.toString());
      return newLevel;
    });
  }, []);

  return (
    <AnxietyContext.Provider value={{ level, setLevel, reduceLevel }}>
      {children}
    </AnxietyContext.Provider>
  );
}

export function useAnxiety() {
  const context = useContext(AnxietyContext);
  if (!context) {
    throw new Error('useAnxiety debe usarse dentro de AnxietyProvider');
  }
  return context;
}