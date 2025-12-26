import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === "your-supabase-url") {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

// 回答送信
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { playerId, questionIndex, selectedIndex, isCorrect, timeMs } = await req.json();

  // プレイヤー取得
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select()
    .eq("id", playerId)
    .single();

  if (playerError || !player) {
    return NextResponse.json({ error: "プレイヤーが見つかりません" }, { status: 404 });
  }

  // スコア計算（正解: 1000点 - 回答時間ボーナス）
  const baseScore = isCorrect ? 1000 : 0;
  const timeBonus = isCorrect ? Math.max(0, 500 - Math.floor(timeMs / 20)) : 0;
  const questionScore = baseScore + timeBonus;

  // 回答を追加
  const newAnswer = { question_index: questionIndex, selected_index: selectedIndex, is_correct: isCorrect, time_ms: timeMs };
  const updatedAnswers = [...(player.answers || []), newAnswer];

  const { data: updatedPlayer, error: updateError } = await supabase
    .from("players")
    .update({
      answers: updatedAnswers,
      score: player.score + questionScore,
    })
    .eq("id", playerId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  return NextResponse.json({ player: updatedPlayer, questionScore });
}
