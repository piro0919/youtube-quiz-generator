"use client";

import { useSoundSettings } from "@/contexts/SoundContext";

export function SoundToggle() {
  const { soundEnabled, toggleSound } = useSoundSettings();

  return (
    <button
      onClick={toggleSound}
      className="fixed top-4 right-4 z-50 w-12 h-12 rounded-full bg-white/10 backdrop-blur border border-white/20 flex items-center justify-center text-2xl hover:bg-white/20 transition-all duration-200 hover:scale-110 active:scale-95"
      aria-label={soundEnabled ? "サウンドをオフにする" : "サウンドをオンにする"}
      title={soundEnabled ? "サウンド ON" : "サウンド OFF"}
    >
      {soundEnabled ? "🔊" : "🔇"}
    </button>
  );
}
