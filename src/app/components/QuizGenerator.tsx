"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Quiz } from "../api/generate-quiz/route";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { SoundToggle } from "@/components/SoundToggle";

type GameMode = "menu" | "solo" | "create-room" | "join-room";
type GameState = "input" | "loading" | "playing" | "result";

type AnswerRecord = {
  questionIndex: number;
  selectedIndex: number;
  isCorrect: boolean;
  timeMs: number;
};

const CHOICE_COLORS = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600",
];

const CHOICE_ICONS = ["◆", "●", "▲", "■"];

export default function QuizGenerator() {
  const router = useRouter();
  const { playSound } = useSoundEffects();
  const [mode, setMode] = useState<GameMode>("menu");
  const [videoUrl, setVideoUrl] = useState("");
  const [gameState, setGameState] = useState<GameState>("input");
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<AnswerRecord[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const hasPlayedFanfare = useRef(false);

  // ルーム作成
  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsCreating(true);

    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl, hostName: playerName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ルームの作成に失敗しました");
      }

      const data = await res.json();
      sessionStorage.setItem(`player_${data.room.code}`, data.player.id);
      router.push(`/room/${data.room.code}`);
    } catch (err) {
      setError((err as Error).message);
      setIsCreating(false);
    }
  };

  // ルーム参加
  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const res = await fetch(`/api/rooms/${roomCode.toUpperCase()}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: playerName }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "ルームへの参加に失敗しました");
      }

      const data = await res.json();
      sessionStorage.setItem(`player_${roomCode.toUpperCase()}`, data.player.id);
      router.push(`/room/${roomCode.toUpperCase()}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // ソロモード - クイズ生成
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setGameState("loading");

    try {
      const res = await fetch("/api/generate-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ videoUrl }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "クイズの生成に失敗しました");
      }

      const data: Quiz = await res.json();
      setQuiz(data);
      setCurrentQuestion(0);
      setAnswers([]);
      setQuestionStartTime(Date.now());
      setGameState("playing");
    } catch (err) {
      setError((err as Error).message);
      setGameState("input");
    }
  };

  const handleAnswer = (selectedIndex: number) => {
    if (!quiz) return;

    const timeMs = Date.now() - questionStartTime;
    const isCorrect = quiz.questions[currentQuestion].correctIndex === selectedIndex;

    // 正解/不正解の音を鳴らす
    playSound(isCorrect ? "correct" : "wrong");

    const newAnswer: AnswerRecord = {
      questionIndex: currentQuestion,
      selectedIndex,
      isCorrect,
      timeMs,
    };

    setAnswers([...answers, newAnswer]);

    if (currentQuestion + 1 < quiz.questions.length) {
      setCurrentQuestion(currentQuestion + 1);
      setQuestionStartTime(Date.now());
    } else {
      setGameState("result");
    }
  };

  const totalTime = answers.reduce((sum, a) => sum + a.timeMs, 0);
  const correctCount = answers.filter((a) => a.isCorrect).length;

  const handleRetry = () => {
    setMode("menu");
    setGameState("input");
    setQuiz(null);
    setVideoUrl("");
    setAnswers([]);
    hasPlayedFanfare.current = false;
  };

  // 結果画面のファンファーレ
  useEffect(() => {
    if (gameState === "result" && !hasPlayedFanfare.current) {
      hasPlayedFanfare.current = true;
      playSound("fanfare");
    }
  }, [gameState, playSound]);


  // メインメニュー
  if (mode === "menu") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <SoundToggle />
        {/* 背景の装飾 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-20 w-40 h-40 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-32 right-16 w-56 h-56 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-1/3 right-1/3 w-32 h-32 bg-blue-400/20 rounded-full blur-2xl animate-pulse"></div>
        </div>

        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          {/* ロゴ */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🎮</div>
            <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-pink-400 to-purple-400">
              YouTube Quiz Battle
            </h1>
            <p className="text-white/60 mt-2">
              動画からクイズを生成して対戦しよう！
            </p>
          </div>

          <div className="space-y-4">
            <button
              onClick={() => setMode("solo")}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/30 text-lg flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🎯</span>
              ソロプレイ
            </button>

            <button
              onClick={() => setMode("create-room")}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-green-500/30 text-lg flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🏠</span>
              ルームを作成
            </button>

            <button
              onClick={() => setMode("join-room")}
              className="w-full bg-white/10 backdrop-blur text-white font-bold py-4 rounded-2xl hover:bg-white/20 transition-all duration-200 border border-white/20 text-lg flex items-center justify-center gap-2"
            >
              <span className="text-2xl">🚪</span>
              ルームに参加
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ルーム作成画面
  if (mode === "create-room") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <SoundToggle />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-green-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-emerald-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <button
            onClick={() => setMode("menu")}
            className="text-white/60 hover:text-white mb-6 flex items-center gap-2 transition"
          >
            <span>←</span> 戻る
          </button>

          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🏠</div>
            <h1 className="text-2xl font-bold text-white">
              ルームを作成
            </h1>
          </div>

          <form onSubmit={handleCreateRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                あなたの名前
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="名前を入力"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none backdrop-blur"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                YouTube動画URL
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-green-400 focus:border-transparent outline-none backdrop-blur"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-green-500/30 disabled:opacity-50 disabled:hover:scale-100"
            >
              {isCreating ? "作成中..." : "ルームを作成"}
            </button>
          </form>

          {isCreating && (
            <div className="mt-6 text-center">
              <div className="relative w-16 h-16 mx-auto mb-3">
                <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
                <div className="absolute inset-0 border-4 border-t-green-400 rounded-full animate-spin"></div>
              </div>
              <p className="text-white/60">クイズを生成しています...</p>
              <p className="text-white/40 text-sm mt-1">動画の内容を分析中</p>
            </div>
          )}

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
              <p className="text-red-300 text-center">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ルーム参加画面
  if (mode === "join-room") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <SoundToggle />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 right-10 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 left-20 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <button
            onClick={() => setMode("menu")}
            className="text-white/60 hover:text-white mb-6 flex items-center gap-2 transition"
          >
            <span>←</span> 戻る
          </button>

          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🚪</div>
            <h1 className="text-2xl font-bold text-white">
              ルームに参加
            </h1>
          </div>

          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                あなたの名前
              </label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="名前を入力"
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none backdrop-blur"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                ルームコード
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="XXXXXX"
                maxLength={6}
                className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none backdrop-blur text-center text-3xl tracking-[0.3em] font-mono"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/30"
            >
              参加する
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
              <p className="text-red-300 text-center">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ソロモード - 入力画面
  if (mode === "solo" && gameState === "input") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <SoundToggle />
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md border border-white/20">
          <button
            onClick={() => setMode("menu")}
            className="text-white/60 hover:text-white mb-6 flex items-center gap-2 transition"
          >
            <span>←</span> 戻る
          </button>

          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-bold text-white">
              ソロプレイ
            </h1>
            <p className="text-white/60 mt-2">
              タイムアタックでクイズに挑戦！
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-white/80 mb-2">
                YouTube動画URL
              </label>
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/40 focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none backdrop-blur"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/30"
            >
              クイズを生成
            </button>
          </form>

          {error && (
            <div className="mt-4 p-4 bg-red-500/20 border border-red-400/30 rounded-xl">
              <p className="text-red-300 text-center">{error}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ローディング画面
  if (gameState === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <SoundToggle />
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-6">
            <div className="absolute inset-0 border-4 border-white/20 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-yellow-400 rounded-full animate-spin"></div>
            <div className="absolute inset-0 flex items-center justify-center text-4xl">🎮</div>
          </div>
          <p className="text-2xl font-bold text-white mb-2">クイズを生成中...</p>
          <p className="text-white/60">動画の内容を分析しています</p>
        </div>
      </div>
    );
  }

  // クイズ画面
  if (gameState === "playing" && quiz) {
    const question = quiz.questions[currentQuestion];

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex flex-col">
        <SoundToggle />
        {/* ヘッダー */}
        <div className="flex justify-between items-center p-3 md:p-4">
          <span className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur rounded-full text-white font-bold border border-white/20 text-sm md:text-base">
            Q{currentQuestion + 1} / {quiz.questions.length}
          </span>
          <span className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur rounded-full text-white/80 border border-white/20 text-sm md:text-base">
            {correctCount}問正解
          </span>
        </div>

        {/* 問題文 */}
        <div className="px-3 md:px-4 mb-3 md:mb-4">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-xl md:rounded-2xl shadow-2xl p-4 md:p-8">
              <h2 className="text-base md:text-2xl font-bold text-gray-800 text-center leading-relaxed">
                {question.question}
              </h2>
            </div>
          </div>
        </div>

        {/* 選択肢：モバイルは縦1列、PCは2x2 */}
        <div className="flex-1 px-3 md:px-4 pb-3 md:pb-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:grid md:grid-cols-2 gap-2 md:gap-4">
              {question.choices.map((choice, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswer(index)}
                  className={`relative flex items-center gap-3 p-4 md:flex-col md:justify-center md:p-6 rounded-xl md:rounded-2xl transition-all duration-200 font-bold text-white shadow-lg hover:scale-[1.02] active:scale-95 hover:shadow-xl ${CHOICE_COLORS[index]}`}
                >
                  <span className="text-2xl md:text-4xl opacity-80 shrink-0">{CHOICE_ICONS[index]}</span>
                  <span className="text-left md:text-center leading-snug text-sm md:text-lg flex-1">{choice}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 結果画面のファンファーレ
  useEffect(() => {
    if (gameState === "result" && !hasPlayedFanfare.current) {
      hasPlayedFanfare.current = true;
      playSound("fanfare");
    }
  }, [gameState, playSound]);

  // 結果画面
  if (gameState === "result" && quiz) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4 overflow-hidden">
        <SoundToggle />
        {/* 紙吹雪エフェクト */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-3 h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ["#fbbf24", "#f472b6", "#34d399", "#60a5fa", "#a78bfa"][i % 5],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-2xl border border-white/20">
          <div className="text-center mb-8">
            <div className="text-7xl mb-4 animate-bounce">🏆</div>
            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-4">
              結果発表
            </h2>

            <div className="flex justify-center gap-8">
              <div className="text-center">
                <div className="text-5xl font-black text-white mb-1">
                  {correctCount}/{quiz.questions.length}
                </div>
                <div className="text-white/60">正解数</div>
              </div>
              <div className="text-center">
                <div className="text-5xl font-black text-yellow-400 mb-1">
                  {(totalTime / 1000).toFixed(1)}
                </div>
                <div className="text-white/60">秒</div>
              </div>
            </div>
          </div>

          {/* 問題ごとの結果 */}
          <div className="space-y-3 mb-8 max-h-64 overflow-y-auto">
            {quiz.questions.map((q, i) => {
              const answer = answers[i];
              return (
                <div
                  key={i}
                  className={`p-4 rounded-xl ${
                    answer?.isCorrect
                      ? "bg-green-500/20 border border-green-400/30"
                      : "bg-red-500/20 border border-red-400/30"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {answer?.isCorrect ? "⭕" : "❌"}
                    </span>
                    <div className="flex-1">
                      <p className="font-medium text-white">{q.question}</p>
                      <p className="text-sm text-white/60 mt-1">
                        正解: {q.choices[q.correctIndex]}
                      </p>
                      <p className="text-xs text-white/40 mt-1">
                        {(answer?.timeMs / 1000).toFixed(2)}秒
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleRetry}
            className="w-full py-4 bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold rounded-2xl hover:scale-105 active:scale-95 transition-all shadow-lg shadow-purple-500/30"
          >
            🔄 もう一度
          </button>
        </div>
      </div>
    );
  }

  return null;
}
