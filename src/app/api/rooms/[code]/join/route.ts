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

// ルーム参加
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { code } = await params;
  const { name } = await req.json();

  // ルーム取得
  const { data: room, error: roomError } = await supabase
    .from("rooms")
    .select()
    .eq("code", code.toUpperCase())
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "ルームが見つかりません" }, { status: 404 });
  }

  if (room.status !== "waiting") {
    return NextResponse.json({ error: "ゲームは既に開始されています" }, { status: 400 });
  }

  // 同じ名前のプレイヤーが既に存在するかチェック
  const { data: existingPlayer } = await supabase
    .from("players")
    .select()
    .eq("room_id", room.id)
    .eq("name", name)
    .single();

  if (existingPlayer) {
    // 既存プレイヤーを返す
    return NextResponse.json({ room, player: existingPlayer });
  }

  // プレイヤー追加
  const { data: player, error: playerError } = await supabase
    .from("players")
    .insert({
      room_id: room.id,
      name,
      is_host: false,
    })
    .select()
    .single();

  if (playerError) {
    return NextResponse.json({ error: playerError.message }, { status: 500 });
  }

  return NextResponse.json({ room, player });
}
