import { NextRequest, NextResponse } from "next/server";
import { generateQuizFromVideo, type Quiz } from "@/lib/quiz-generator";

export type { Quiz };

export async function POST(req: NextRequest) {
  const { videoUrl } = await req.json();

  try {
    const { quiz } = await generateQuizFromVideo(videoUrl);
    return NextResponse.json(quiz);
  } catch (error) {
    console.error("クイズの生成中にエラーが発生しました:", error);
    return NextResponse.json(
      { error: "クイズの生成に失敗しました: " + (error as Error).message },
      { status: 500 }
    );
  }
}
