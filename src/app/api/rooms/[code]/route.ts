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

// ルーム情報取得
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { code } = await params;

  const { data: room, error } = await supabase
    .from("rooms")
    .select("*, players(*)")
    .eq("code", code.toUpperCase())
    .single();

  if (error || !room) {
    return NextResponse.json({ error: "ルームが見つかりません" }, { status: 404 });
  }

  return NextResponse.json(room);
}

// ルーム状態更新
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { code } = await params;
  const updates = await req.json();

  const { data: room, error } = await supabase
    .from("rooms")
    .update(updates)
    .eq("code", code.toUpperCase())
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(room);
}

// ルーム削除
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const supabase = getSupabase();

  if (!supabase) {
    return NextResponse.json({ error: "Supabase is not configured" }, { status: 500 });
  }

  const { code } = await params;

  // playersはon delete cascadeで自動削除される
  const { error } = await supabase
    .from("rooms")
    .delete()
    .eq("code", code.toUpperCase());

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
