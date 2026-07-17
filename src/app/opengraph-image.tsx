import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Relune — Presence, beautifully shared.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "linear-gradient(145deg, #12141A 0%, #1B2A28 48%, #2A1F18 100%)",
          color: "#F4F2EE",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 28,
            letterSpacing: "0.35em",
            textTransform: "uppercase",
            opacity: 0.7,
          }}
        >
          Relune
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 72, lineHeight: 1.05, maxWidth: 900 }}>
            Presence, beautifully shared.
          </div>
          <div style={{ fontSize: 28, opacity: 0.72, maxWidth: 780 }}>
            A premium social platform for conversation, communities, and quiet
            cinematic moments.
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
