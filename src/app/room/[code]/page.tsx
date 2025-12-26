"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { supabase, Room, Player } from "@/lib/supabase";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { SoundToggle } from "@/components/SoundToggle";

type GamePhase = "waiting" | "countdown" | "question" | "showing_answer" | "finished";

const QUESTION_TIME_LIMIT = 15;

// 選択肢の色パレット（Kahoot風）
const CHOICE_COLORS = [
  { bg: "bg-red-500", hover: "hover:bg-red-600", border: "border-red-600", text: "text-white" },
  { bg: "bg-blue-500", hover: "hover:bg-blue-600", border: "border-blue-600", text: "text-white" },
  { bg: "bg-yellow-500", hover: "hover:bg-yellow-600", border: "border-yellow-600", text: "text-white" },
  { bg: "bg-green-500", hover: "hover:bg-green-600", border: "border-green-600", text: "text-white" },
];

const CHOICE_ICONS = ["◆", "●", "▲", "■"];

export default function RoomPage() {
  const params = useParams();
  const code = params.code as string;
  const { playSound, playTickIfNeeded } = useSoundEffects();

  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [phase, setPhase] = useState<GamePhase>("waiting");
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME_LIMIT);
  const [questionStartTime, setQuestionStartTime] = useState(0);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const fetchRoom = useCallback(async () => {
    const res = await fetch(`/api/rooms/${code}`);
    if (!res.ok) {
      setError("ルームが見つかりません");
      return;
    }
    const data = await res.json();
    setRoom(data);
    setPlayers(data.players || []);

    const storedPlayerId = sessionStorage.getItem(`player_${code}`);
    if (storedPlayerId) {
      const player = data.players?.find((p: Player) => p.id === storedPlayerId);
      if (player) setCurrentPlayer(player);
    }
  }, [code]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  useEffect(() => {
    if (!room || phase !== "question") return;

    const currentQuestionIndex = room.current_question;
    const answeredCount = players.filter((p) =>
      p.answers?.some((a: { question_index: number }) => a.question_index === currentQuestionIndex)
    ).length;

    if (answeredCount >= players.length && players.length > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase("showing_answer");

      if (currentPlayer?.is_host) {
        setTimeout(async () => {
          if (room.current_question + 1 < room.quiz.questions.length) {
            await fetch(`/api/rooms/${code}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ current_question: room.current_question + 1 }),
            });
          } else {
            await fetch(`/api/rooms/${code}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: "finished" }),
            });
          }
        }, 3000);
      }
    }
  }, [room, players, phase, currentPlayer?.is_host, code]);

  useEffect(() => {
    if (!room || !supabase) return;

    const roomChannel = supabase
      .channel(`room_${room.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rooms", filter: `id=eq.${room.id}` },
        (payload) => {
          const updatedRoom = payload.new as Room;
          const prevQuestion = room.current_question;
          setRoom(updatedRoom);

          if (updatedRoom.status === "playing" && phase === "waiting") {
            setPhase("countdown");
            setCountdown(3);
          } else if (updatedRoom.status === "finished") {
            setPhase("finished");
          } else if (updatedRoom.current_question !== prevQuestion && phase !== "countdown") {
            setPhase("countdown");
            setCountdown(3);
            setHasAnswered(false);
            setSelectedAnswer(null);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_id=eq.${room.id}` },
        () => {
          fetchRoom();
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(roomChannel);
    };
  }, [room?.id, room?.current_question, phase, fetchRoom]);

  useEffect(() => {
    if (phase !== "countdown") return;

    if (countdown > 0) {
      playSound("countdown");
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setPhase("question");
      setQuestionStartTime(Date.now());
      setTimeLeft(QUESTION_TIME_LIMIT);
      setHasAnswered(false);
      setSelectedAnswer(null);
    }
  }, [phase, countdown, playSound]);

  useEffect(() => {
    if (phase !== "question") return;

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeUp();
          return 0;
        }
        playTickIfNeeded(prev - 1);
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [phase, room?.current_question, playTickIfNeeded]);

  const handleTimeUp = async () => {
    if (!room || !currentPlayer) return;

    if (!hasAnswered) {
      setHasAnswered(true);
      setSelectedAnswer(-1);

      await fetch(`/api/rooms/${code}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentPlayer.id,
          questionIndex: room.current_question,
          selectedIndex: -1,
          isCorrect: false,
          timeMs: QUESTION_TIME_LIMIT * 1000,
        }),
      });
    }

    setPhase("showing_answer");

    if (currentPlayer.is_host) {
      setTimeout(async () => {
        if (room.current_question + 1 < room.quiz.questions.length) {
          await fetch(`/api/rooms/${code}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ current_question: room.current_question + 1 }),
          });
        } else {
          await fetch(`/api/rooms/${code}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "finished" }),
          });
        }
      }, 3000);
    }
  };

  const startGame = async () => {
    await fetch(`/api/rooms/${code}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "playing", current_question: 0 }),
    });
  };

  const submitAnswer = async (selectedIndex: number) => {
    if (!room || !currentPlayer || hasAnswered) return;

    const timeMs = Date.now() - questionStartTime;
    const question = room.quiz.questions[room.current_question];
    const isCorrect = question.correctIndex === selectedIndex;

    // 正解/不正解の音を鳴らす
    playSound(isCorrect ? "correct" : "wrong");

    setHasAnswered(true);
    setSelectedAnswer(selectedIndex);

    await fetch(`/api/rooms/${code}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        playerId: currentPlayer.id,
        questionIndex: room.current_question,
        selectedIndex,
        isCorrect,
        timeMs,
      }),
    });
  };

  // エラー画面
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 text-center border border-white/20">
          <div className="text-6xl mb-4">😢</div>
          <p className="text-white text-xl">{error}</p>
        </div>
      </div>
    );
  }

  // ローディング
  if (!room) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="text-center">
          <div className="relative w-24 h-24 mx-auto mb-4">
            <div className="absolute inset-0 border-4 border-white/30 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-t-yellow-400 rounded-full animate-spin"></div>
          </div>
          <p className="text-white/80 text-lg animate-pulse">Loading...</p>
        </div>
      </div>
    );
  }

  // 待機画面
  if (phase === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-4">
        <SoundToggle />
        {/* 背景の装飾 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-10 left-10 w-32 h-32 bg-yellow-400/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-pink-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
          <div className="absolute top-1/2 left-1/4 w-24 h-24 bg-blue-400/20 rounded-full blur-2xl animate-pulse delay-500"></div>
        </div>

        <div className="relative bg-white/10 backdrop-blur-lg rounded-3xl shadow-2xl p-8 w-full max-w-md text-center border border-white/20">
          {/* ルームコード */}
          <div className="mb-6">
            <p className="text-white/60 text-sm mb-1">ROOM CODE</p>
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 text-transparent bg-clip-text text-5xl font-black tracking-widest">
              {code}
            </div>
          </div>

          {/* 動画タイトル */}
          <div className="bg-white/5 rounded-xl p-4 mb-6">
            <p className="text-white/80 text-sm line-clamp-2">{room.video_title}</p>
          </div>

          {/* 参加者リスト */}
          <div className="mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-2xl">👥</span>
              <span className="text-white font-bold text-lg">{players.length}人が参加中</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {players.map((p, i) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-white/10 backdrop-blur rounded-xl px-4 py-3 border border-white/10 animate-fade-in"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center text-white font-bold">
                      {p.name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-white font-medium">{p.name}</span>
                  </div>
                  {p.is_host && (
                    <span className="text-xs bg-yellow-400/20 text-yellow-300 px-3 py-1 rounded-full border border-yellow-400/30">
                      HOST
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* ゲーム開始ボタン */}
          {currentPlayer?.is_host && players.length >= 1 && (
            <button
              onClick={startGame}
              className="w-full bg-gradient-to-r from-green-400 to-emerald-500 text-white font-bold py-4 rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-green-500/30 text-lg"
            >
              🎮 ゲームスタート！
            </button>
          )}

          {!currentPlayer?.is_host && (
            <div className="bg-white/5 rounded-xl p-4">
              <div className="flex items-center justify-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <p className="text-white/60">ホストの開始を待っています...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // カウントダウン
  if (phase === "countdown") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center overflow-hidden p-4">
        <SoundToggle />
        {/* 放射状の背景エフェクト */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-gradient-to-r from-yellow-400/20 to-pink-500/20 rounded-full blur-3xl animate-pulse"></div>
        </div>

        <div className="relative text-center">
          <div className="mb-4 md:mb-8">
            <span className="inline-block px-4 py-1.5 md:px-6 md:py-2 bg-white/10 backdrop-blur rounded-full text-white/80 text-sm md:text-lg border border-white/20">
              Q{room.current_question + 1} / {room.quiz.questions.length}
            </span>
          </div>

          <div className="relative">
            {/* カウントダウン数字 */}
            <div
              key={countdown}
              className="text-[120px] md:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 via-yellow-400 to-orange-500 leading-none animate-bounce-in drop-shadow-2xl"
            >
              {countdown}
            </div>

            {/* 光のリング */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-40 h-40 md:w-64 md:h-64 border-4 border-yellow-400/30 rounded-full animate-ping"></div>
            </div>
          </div>

          <p className="text-white/60 text-base md:text-xl mt-4 md:mt-8 animate-pulse">Get Ready!</p>
        </div>
      </div>
    );
  }

  // クイズ出題 & 正解表示
  if (phase === "question" || phase === "showing_answer") {
    const question = room.quiz.questions[room.current_question];
    const showAnswer = phase === "showing_answer" || hasAnswered;
    const isCorrectAnswer = selectedAnswer !== null && selectedAnswer === question.correctIndex;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex flex-col">
        <SoundToggle />
        {/* ヘッダー：問題番号とタイマー */}
        <div className="flex justify-between items-center p-3 md:p-4">
          <span className="px-3 py-1.5 md:px-4 md:py-2 bg-white/10 backdrop-blur rounded-full text-white font-bold border border-white/20 text-sm md:text-base">
            Q{room.current_question + 1} / {room.quiz.questions.length}
          </span>

          {/* タイマー */}
          <div className="relative">
            <div
              className={`w-12 h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center text-xl md:text-2xl font-black transition-all duration-300 ${
                timeLeft <= 5
                  ? "bg-red-500 text-white animate-pulse scale-110"
                  : "bg-white/10 backdrop-blur text-white border border-white/20"
              }`}
            >
              {timeLeft}
            </div>
            <svg className="absolute inset-0 w-12 h-12 md:w-16 md:h-16 -rotate-90" viewBox="0 0 64 64">
              <circle
                cx="32"
                cy="32"
                r="28"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                className={`transition-all duration-1000 ${timeLeft <= 5 ? "text-red-300" : "text-yellow-400"}`}
                strokeDasharray={`${(timeLeft / QUESTION_TIME_LIMIT) * 176} 176`}
                strokeLinecap="round"
              />
            </svg>
          </div>
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
              {question.choices.map((choice, index) => {
                const color = CHOICE_COLORS[index];
                const isSelected = selectedAnswer === index;
                const isCorrect = index === question.correctIndex;

                let buttonClass = `${color.bg} ${color.hover} ${color.text}`;
                let overlayContent = null;

                if (showAnswer) {
                  if (isCorrect) {
                    buttonClass = "bg-green-500 text-white ring-4 ring-green-300";
                    overlayContent = (
                      <div className="absolute inset-0 flex items-center justify-center bg-green-500/90 rounded-xl md:rounded-2xl">
                        <span className="text-3xl md:text-6xl animate-bounce">⭕</span>
                      </div>
                    );
                  } else if (isSelected && !isCorrect) {
                    buttonClass = "bg-gray-600 text-white/50";
                    overlayContent = (
                      <div className="absolute inset-0 flex items-center justify-center bg-gray-800/90 rounded-xl md:rounded-2xl">
                        <span className="text-3xl md:text-6xl animate-shake">❌</span>
                      </div>
                    );
                  } else {
                    buttonClass = "bg-gray-600/50 text-white/30";
                  }
                }

                return (
                  <button
                    key={index}
                    onClick={() => submitAnswer(index)}
                    disabled={hasAnswered || phase === "showing_answer"}
                    className={`relative flex items-center gap-3 p-4 md:flex-col md:justify-center md:p-6 rounded-xl md:rounded-2xl transition-all duration-200 font-bold shadow-lg ${buttonClass} ${
                      !showAnswer ? "hover:scale-[1.02] active:scale-95 hover:shadow-xl" : ""
                    } ${isSelected && !showAnswer ? "ring-4 ring-white/50 scale-[1.02]" : ""}`}
                  >
                    <span className="text-2xl md:text-4xl opacity-80 shrink-0">{CHOICE_ICONS[index]}</span>
                    <span className="text-left md:text-center leading-snug text-sm md:text-lg flex-1">{choice}</span>
                    {overlayContent}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 解説（正解表示時） */}
        {phase === "showing_answer" && (
          <div className="px-3 py-2 md:p-4 animate-slide-up">
            <div className="max-w-4xl mx-auto">
              <div
                className={`rounded-xl md:rounded-2xl p-3 md:p-6 ${
                  isCorrectAnswer ? "bg-green-500/20 border border-green-400/30" : "bg-blue-500/20 border border-blue-400/30"
                }`}
              >
                <div className="flex items-start gap-2 md:gap-3">
                  <span className="text-xl md:text-2xl shrink-0">{isCorrectAnswer ? "🎉" : "📖"}</span>
                  <p className="text-white font-medium leading-relaxed text-sm md:text-base">{question.explanation}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 待機メッセージ */}
        {hasAnswered && phase === "question" && (
          <div className="p-3 md:p-4 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 bg-white/10 backdrop-blur rounded-full border border-white/20">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
              <span className="text-white/80 text-xs md:text-base">他のプレイヤーを待っています</span>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 結果画面のファンファーレ
  const hasPlayedFanfare = useRef(false);
  useEffect(() => {
    if (phase === "finished" && !hasPlayedFanfare.current) {
      hasPlayedFanfare.current = true;
      playSound("fanfare");
    }
  }, [phase, playSound]);

  // 結果画面
  if (phase === "finished") {
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    const isWinner = currentPlayer?.id === winner?.id;

    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center p-3 md:p-4 overflow-hidden">
        <SoundToggle />
        {/* 紙吹雪エフェクト */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 md:w-3 md:h-3 animate-confetti"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                backgroundColor: ["#fbbf24", "#f472b6", "#34d399", "#60a5fa", "#a78bfa"][i % 5],
                transform: `rotate(${Math.random() * 360}deg)`,
              }}
            />
          ))}
        </div>

        <div className="relative bg-white/10 backdrop-blur-lg rounded-2xl md:rounded-3xl shadow-2xl p-4 md:p-8 w-full max-w-md text-center border border-white/20">
          {/* トロフィー */}
          <div className="text-5xl md:text-7xl mb-2 md:mb-4 animate-bounce">{isWinner ? "👑" : "🏆"}</div>

          <h2 className="text-2xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-orange-400 mb-4 md:mb-8">
            結果発表
          </h2>

          {/* ランキング */}
          <div className="space-y-2 md:space-y-3 mb-4 md:mb-8 max-h-[40vh] overflow-y-auto">
            {sortedPlayers.map((player, index) => {
              const medals = ["🥇", "🥈", "🥉"];
              const isCurrentPlayer = player.id === currentPlayer?.id;

              return (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-2.5 md:p-4 rounded-xl md:rounded-2xl transition-all duration-300 ${
                    index === 0
                      ? "bg-gradient-to-r from-yellow-400/30 to-orange-400/30 border-2 border-yellow-400/50 scale-105"
                      : "bg-white/10 border border-white/10"
                  } ${isCurrentPlayer ? "ring-2 ring-pink-400" : ""}`}
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="flex items-center gap-2 md:gap-3">
                    <span className="text-lg md:text-2xl">{medals[index] || `#${index + 1}`}</span>
                    <div className="flex items-center gap-1.5 md:gap-2">
                      <div
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full flex items-center justify-center text-white font-bold text-sm md:text-base ${
                          index === 0 ? "bg-gradient-to-br from-yellow-400 to-orange-500" : "bg-white/20"
                        }`}
                      >
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className={`font-bold text-sm md:text-base ${index === 0 ? "text-yellow-300" : "text-white"}`}>
                        {player.name}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-lg md:text-2xl font-black ${index === 0 ? "text-yellow-300" : "text-white"}`}>
                      {player.score}
                    </span>
                    <span className="text-white/60 text-xs md:text-sm ml-0.5 md:ml-1">pt</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* トップに戻るボタン */}
          <button
            onClick={async () => {
              if (currentPlayer?.is_host) {
                await fetch(`/api/rooms/${code}`, { method: "DELETE" });
              }
              sessionStorage.removeItem(`player_${code}`);
              window.location.href = "/";
            }}
            className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white font-bold py-3 md:py-4 rounded-xl md:rounded-2xl hover:scale-105 active:scale-95 transition-all duration-200 shadow-lg shadow-purple-500/30 text-base md:text-lg"
          >
            🏠 トップに戻る
          </button>
        </div>
      </div>
    );
  }

  return null;
}
