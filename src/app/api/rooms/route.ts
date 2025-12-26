import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { nanoid } from "nanoid";
import { generateQuizFromVideo } from "@/lib/quiz-generator";

function getSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey || supabaseUrl === "your-supabase-url") {
    return null;
  }

  return createClient(supabaseUrl, supabaseKey);
}

// ルーム作成
export async function POST(req: NextRequest) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase が設定されていません。環境変数を確認してください。" },
      { status: 500 }
    );
  }

  const { videoUrl, hostName } = await req.json();

  try {
    // クイズを生成
    const { quiz, videoInfo } = await generateQuizFromVideo(videoUrl);

    // ルームを作成
    const roomCode = nanoid(6).toUpperCase();

    const { data: room, error: roomError } = await supabase
      .from("rooms")
      .insert({
        code: roomCode,
        video_url: videoUrl,
        video_title: videoInfo.title,
        quiz,
        status: "waiting",
      })
      .select()
      .single();

    if (roomError) {
      return NextResponse.json({ error: roomError.message }, { status: 500 });
    }

    // ホストをプレイヤーとして追加
    const { data: player, error: playerError } = await supabase
      .from("players")
      .insert({
        room_id: room.id,
        name: hostName,
        is_host: true,
      })
      .select()
      .single();

    if (playerError) {
      return NextResponse.json({ error: playerError.message }, { status: 500 });
    }

    return NextResponse.json({
      room,
      player,
      roomCode,
    });
  } catch (error) {
    console.error("ルーム作成エラー:", error);
    return NextResponse.json(
      { error: "ルームの作成に失敗しました: " + (error as Error).message },
      { status: 500 }
    );
  }
}
