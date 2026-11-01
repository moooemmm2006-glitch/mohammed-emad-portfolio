import { ImageResponse } from "next/og";

// The preview card when the site's link is shared (WhatsApp, Facebook, LinkedIn, X…).
export const alt = "Sprich Deutsch – Deutsch sprechen lernen, A1 bis B2";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const LEVELS: [string, string][] = [["A1", "#059669"], ["A2", "#0284c7"], ["B1", "#7c3aed"], ["B2", "#e11d48"]];

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "linear-gradient(135deg, #f7f5f0 0%, #eef2f8 55%, #e4ebf5 100%)", position: "relative" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 84, height: 84, borderRadius: 20, background: "#1f3a5f", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden" }}>
            <div style={{ color: "#fff", fontSize: 38, fontWeight: 800, marginTop: -6 }}>SD</div>
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 12, display: "flex" }}>
              <div style={{ flex: 1, background: "#111" }} />
              <div style={{ flex: 1, background: "#d00" }} />
              <div style={{ flex: 1, background: "#ffce00" }} />
            </div>
          </div>
          <div style={{ fontSize: 34, fontWeight: 700, color: "#1f3a5f" }}>sprich deutsch</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 800, color: "#0f172a", letterSpacing: -2, lineHeight: 1.05 }}>Deutsch sprechen lernen.</div>
          <div style={{ fontSize: 36, color: "#475569" }}>Sätze nachsprechen · Grammatik · Videos · Lernplan · Sprachcafé</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          {LEVELS.map(([l, c]) => (
            <div key={l} style={{ display: "flex", padding: "10px 26px", borderRadius: 999, background: c, color: "#fff", fontSize: 34, fontWeight: 800 }}>
              {l}
            </div>
          ))}
          <div style={{ marginLeft: "auto", fontSize: 26, color: "#64748b" }}>by ME Web</div>
        </div>
        <div style={{ position: "absolute", top: 0, right: 0, width: 18, height: "100%", display: "flex", flexDirection: "column" }}>
          <div style={{ flex: 1, background: "#111" }} />
          <div style={{ flex: 1, background: "#d00" }} />
          <div style={{ flex: 1, background: "#ffce00" }} />
        </div>
      </div>
    ),
    size,
  );
}
