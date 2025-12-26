import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";

function createSupabaseClient(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseKey || supabaseUrl === "your-supabase-url") {
    return null;
  }
  return createClient(supabaseUrl, supabaseKey);
}

export const supabase = createSupabaseClient();

// 型定義
export type Room = {
  id: string;
  code: string;
  video_url: string;
  video_title: string;
  quiz: Quiz;
  status: "waiting" | "playing" | "finished";
  current_question: number;
  created_at: string;
};

export type Player = {
  id: string;
  room_id: string;
  name: string;
  score: number;
  answers: PlayerAnswer[];
  is_host: boolean;
  created_at: string;
};

export type PlayerAnswer = {
  question_index: number;
  selected_index: number;
  is_correct: boolean;
  time_ms: number;
};

export type Quiz = {
  questions: {
    question: string;
    choices: string[];
    correctIndex: number;
    explanation: string;
  }[];
};
