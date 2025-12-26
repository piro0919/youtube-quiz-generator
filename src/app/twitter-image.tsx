import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "YouTube Quiz Battle";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#0f0a1e",
          width: "100%",
          height: "100%",
          display: "flex",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* グラデーション背景 */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 80% 60% at 50% 120%, #7c3aed 0%, transparent 60%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 60% 40% at 80% 20%, #ec4899 0%, transparent 50%)",
            opacity: 0.6,
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "radial-gradient(ellipse 50% 30% at 20% 30%, #3b82f6 0%, transparent 50%)",
            opacity: 0.4,
          }}
        />

        {/* グリッドパターン */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />

        {/* メインコンテンツ */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            padding: "60px",
          }}
        >
          {/* アイコンとタイトル */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 24,
              marginBottom: 32,
            }}
          >
            <div
              style={{
                fontSize: 80,
                background: "linear-gradient(135deg, #7c3aed 0%, #ec4899 100%)",
                padding: "20px 28px",
                borderRadius: 24,
                display: "flex",
                boxShadow: "0 20px 40px rgba(124, 58, 237, 0.4)",
              }}
            >
              🎮
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: "white",
                  letterSpacing: "-2px",
                  lineHeight: 1,
                }}
              >
                YouTube
              </div>
              <div
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  background: "linear-gradient(90deg, #fbbf24, #f472b6, #a78bfa)",
                  backgroundClip: "text",
                  color: "transparent",
                  letterSpacing: "-2px",
                  lineHeight: 1,
                }}
              >
                Quiz Battle
              </div>
            </div>
          </div>

          {/* サブタイトル */}
          <div
            style={{
              fontSize: 28,
              color: "rgba(255, 255, 255, 0.7)",
              marginBottom: 48,
              letterSpacing: "0.5px",
            }}
          >
            動画の内容からAIがクイズを自動生成
          </div>

          {/* 特徴 */}
          <div
            style={{
              display: "flex",
              gap: 20,
            }}
          >
            {[
              { icon: "🎯", label: "ソロ" },
              { icon: "👥", label: "対戦" },
              { icon: "⚡", label: "リアルタイム" },
              { icon: "🤖", label: "AI生成" },
            ].map((item) => (
              <div
                key={item.label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "14px 28px",
                  borderRadius: 50,
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.15)",
                  color: "white",
                  fontSize: 22,
                  fontWeight: 600,
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 装飾：左下の光 */}
        <div
          style={{
            position: "absolute",
            bottom: -100,
            left: -100,
            width: 300,
            height: 300,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(59, 130, 246, 0.3) 0%, transparent 70%)",
          }}
        />

        {/* 装飾：右上の光 */}
        <div
          style={{
            position: "absolute",
            top: -50,
            right: -50,
            width: 250,
            height: 250,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(236, 72, 153, 0.25) 0%, transparent 70%)",
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  );
}
