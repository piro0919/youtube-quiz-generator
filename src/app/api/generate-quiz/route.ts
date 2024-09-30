import { NextRequest } from "next/server";
import { YoutubeTranscript } from "youtube-transcript";
import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";

// OpenAIクライアントの初期化
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

export async function POST(req: NextRequest) {
  const { prompt: videoUrl } = await req.json();

  try {
    // 1. 日本語の動画トランスクリプトを取得
    const transcript = await YoutubeTranscript.fetchTranscript(videoUrl, {
      lang: "ja",
    });

    if (!transcript || transcript.length === 0) {
      throw new Error("日本語のトランスクリプトが利用できません。");
    }

    const fullText = transcript.map((item) => item.text).join(" ");

    // 2. 改良されたプロンプトの準備
    const prompt = `
      以下は、あるYouTube動画の日本語トランスクリプトです：

      ${fullText}

      このトランスクリプトに基づいて、以下の指示に従ってタスクを実行してください：

      1. まず、このトランスクリプトの主要なポイントを3-5つの短い文で要約してください。

      2. 次に、その要約に基づいて3つの日本語の多肢選択問題を生成してください。以下の点に注意してください：
         a) 質問は動画の主要な概念や重要なポイントに焦点を当ててください。
         b) 各質問の難易度を変えてください（易しい、中程度、難しい）。
         c) 選択肢は明確で紛らわしくないものにしてください。
         d) 誤った選択肢も、一見もっともらしく聞こえるようにしてください。
         e) 各問題の後に、正解の簡単な説明を追加してください。

      出力を以下の形式でフォーマットしてください：

      要約：
      [トランスクリプトの要約]

      問題：

      Q1: [質問]（難易度：易しい）
      A) [選択肢A]
      B) [選択肢B]
      C) [選択肢C]
      D) [選択肢D]
      正解: [正解の選択肢のアルファベット]
      説明: [正解の簡単な説明]

      Q2: [質問]（難易度：中程度）
      ...

      Q3: [質問]（難易度：難しい）
      ...
    `;

    // 3. OpenAI APIを呼び出す
    const response = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [{ role: "user", content: prompt }],
      stream: true,
      temperature: 0.7, // やや創造性を持たせる
      max_tokens: 1500, // 十分な長さの回答を確保
    });

    // 4. レスポンスを読み取り可能なストリームに変換
    const stream = OpenAIStream(response);

    // 5. StreamingTextResponseを返す
    return new StreamingTextResponse(stream);
  } catch (error) {
    console.error("クイズの生成中にエラーが発生しました:", error);
    return new Response(
      "クイズの生成に失敗しました: " + (error as Error).message,
      { status: 500 }
    );
  }
}
