import { ImageResponse } from "next/og";

// The site icon (browser tab, bookmarks): "SD" on the brand blue with a thin German-flag stripe.
export const size = { width: 64, height: 64 };
export const contentType = "image/png";

export function Mark({ px }: { px: number }) {
  const r = Math.round(px * 0.22);
  return (
    <div style={{ width: px, height: px, borderRadius: r, background: "#1f3a5f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
      <div style={{ color: "#ffffff", fontSize: Math.round(px * 0.44), fontWeight: 800, letterSpacing: -1, marginTop: -Math.round(px * 0.06) }}>SD</div>
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: Math.round(px * 0.14), display: "flex" }}>
        <div style={{ flex: 1, background: "#111111" }} />
        <div style={{ flex: 1, background: "#dd0000" }} />
        <div style={{ flex: 1, background: "#ffce00" }} />
      </div>
    </div>
  );
}

export default function Icon() {
  return new ImageResponse(<Mark px={64} />, size);
}
