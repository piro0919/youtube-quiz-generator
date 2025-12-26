import { fetchTranscript } from "@egoist/youtube-transcript-plus";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { generateText } from "ai";
import ytdl from "@distube/ytdl-core";

export const QuestionSchema = z.object({
  question: z.string(),
  choices: z.array(z.string()).length(4),
  correctIndex: z.number().min(0).max(3),
  explanation: z.string(),
});

export const QuizSchema = z.object({
  questions: z.array(QuestionSchema).length(10),
});

export type Quiz = z.infer<typeof QuizSchema>;
export type Question = z.infer<typeof QuestionSchema>;

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export type VideoInfo = {
  title: string;
  channelName: string;
  description: string;
};

export async function generateQuizFromVideo(videoUrl: string): Promise<{ quiz: Quiz; videoInfo: VideoInfo }> {
  // 環境変数チェック
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY が設定されていません");
  }

  // 1. 動画トランスクリプトを取得
  const result = await fetchTranscript(videoUrl);

  if (!result.segments || result.segments.length === 0) {
    throw new Error("字幕が利用できません。字幕付きの動画を選んでください。");
  }

  const fullText = result.segments
    .map((item) => decodeHtmlEntities(item.text))
    .join(" ");

  // 2. YouTube から動画情報を取得
  const videoDetails = await ytdl.getInfo(videoUrl);
  const videoInfo: VideoInfo = {
    title: videoDetails.videoDetails.title,
    channelName: videoDetails.videoDetails.author.name,
    description: videoDetails.videoDetails.description || "",
  };

  // 3. 第1段階：動画の内容を分析・整理
  const { text: analysis } = await generateText({
    model: openai("gpt-4o"),
    prompt: `
以下はYouTube動画の情報です。この動画を分析してください。

【動画タイトル】
${videoInfo.title}

【チャンネル名】
${videoInfo.channelName}

【概要欄】
${videoInfo.description}

【字幕】
${fullText}

【分析してほしいこと】
1. 登場人物の特定
   - チャンネル名や概要欄から、このチャンネルの出演者・メンバーを特定してください
   - 字幕内で呼ばれている名前（ひらがな・音声）と、正式な漢字表記を対応させてください
   - チャンネルのレギュラーメンバーの名前は正確な表記を使ってください

2. 動画の流れ（何が起きたか時系列で）

3. 各人物の印象的な発言や回答（具体的に引用）
   - 誰が何を言ったか明確に

4. 面白かった場面・盛り上がった場面

5. 意外だった展開や答え

できるだけ具体的に、発言を正確に引用しながら分析してください。
`,
  });

  // 4. 第2段階：分析結果からクイズを生成
  const { text: quizText } = await generateText({
    model: openai("gpt-4o"),
    prompt: `
以下は動画の分析結果です：

${analysis}

この分析に基づいて、「動画を見た人だけが答えられる」10問の4択クイズを作成してください。

【クイズ作成のルール】
- 出演者が実際に言った発言や回答をクイズにする
- 「〇〇さんが△△と聞かれて答えたのは？」のような形式
- 一般知識では答えられない、動画固有の内容を問う
- 誤答の選択肢も、もっともらしいものにする
- 人名は分析結果で特定された正式な表記を使う

【出力形式】JSONのみ：
{
  "questions": [
    {
      "question": "質問文",
      "choices": ["選択肢A", "選択肢B", "選択肢C", "選択肢D"],
      "correctIndex": 0,
      "explanation": "動画内での該当シーンの説明"
    }
  ]
}
`,
  });

  // JSONをパース
  const jsonMatch = quizText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("クイズの生成に失敗しました");
  }

  const quiz = QuizSchema.parse(JSON.parse(jsonMatch[0]));

  return { quiz, videoInfo };
}
