"use client";

import { useCallback, useRef } from "react";
import { useSoundSettings } from "@/contexts/SoundContext";

type SoundType = "countdown" | "tick" | "correct" | "wrong" | "fanfare" | "click";

export function useSoundEffects() {
  const { soundEnabled } = useSoundSettings();
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    }
    return audioContextRef.current;
  }, []);

  const playTone = useCallback(
    (frequency: number, duration: number, type: OscillatorType = "sine", volume = 0.3) => {
      if (!soundEnabled) return;
      const ctx = getAudioContext();
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);

      oscillator.type = type;
      oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

      gainNode.gain.setValueAtTime(volume, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration);

      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + duration);
    },
    [getAudioContext, soundEnabled]
  );

  const playSound = useCallback(
    (sound: SoundType) => {
      if (!soundEnabled) return;

      switch (sound) {
        case "countdown": {
          // カウントダウン音（高めのビープ）
          playTone(880, 0.15, "sine", 0.4);
          break;
        }

        case "tick": {
          // 時計のチクタク音
          playTone(1200, 0.05, "square", 0.15);
          break;
        }

        case "correct": {
          // 正解音（上昇する2音）
          playTone(523.25, 0.15, "sine", 0.4); // C5
          setTimeout(() => playTone(659.25, 0.2, "sine", 0.4), 100); // E5
          setTimeout(() => playTone(783.99, 0.3, "sine", 0.4), 200); // G5
          break;
        }

        case "wrong": {
          // 不正解音（下降する音）
          playTone(300, 0.3, "sawtooth", 0.25);
          setTimeout(() => playTone(200, 0.4, "sawtooth", 0.2), 150);
          break;
        }

        case "fanfare": {
          // ファンファーレ（結果発表）
          const notes = [
            { freq: 523.25, delay: 0 },    // C5
            { freq: 659.25, delay: 100 },  // E5
            { freq: 783.99, delay: 200 },  // G5
            { freq: 1046.5, delay: 300 },  // C6
            { freq: 783.99, delay: 450 },  // G5
            { freq: 1046.5, delay: 550 },  // C6
          ];
          notes.forEach(({ freq, delay }) => {
            setTimeout(() => playTone(freq, 0.2, "sine", 0.35), delay);
          });
          break;
        }

        case "click": {
          // ボタンクリック音
          playTone(600, 0.05, "sine", 0.2);
          break;
        }
      }
    },
    [soundEnabled, playTone]
  );

  // 残り時間に応じたチクタク音（5秒以下で鳴る）
  const playTickIfNeeded = useCallback(
    (timeLeft: number) => {
      if (timeLeft <= 5 && timeLeft > 0) {
        playSound("tick");
      }
    },
    [playSound]
  );

  return { playSound, playTickIfNeeded };
}
