"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type SoundContextType = {
  soundEnabled: boolean;
  toggleSound: () => void;
};

const SoundContext = createContext<SoundContextType | null>(null);

const STORAGE_KEY = "quiz_sound_enabled";

export function SoundProvider({ children }: { children: ReactNode }) {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored !== null) {
      setSoundEnabled(stored === "true");
    }
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem(STORAGE_KEY, String(soundEnabled));
    }
  }, [soundEnabled, isLoaded]);

  const toggleSound = () => {
    setSoundEnabled((prev) => !prev);
  };

  return (
    <SoundContext.Provider value={{ soundEnabled, toggleSound }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundSettings() {
  const context = useContext(SoundContext);
  if (!context) {
    throw new Error("useSoundSettings must be used within a SoundProvider");
  }
  return context;
}
