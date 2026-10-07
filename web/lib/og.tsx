import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";

// Gemeinsamer Aufbau der Vorschaubilder (Open Graph) für Links in Messengern und sozialen Netzwerken.

export const OG_SIZE = { width: 1200, height: 630 };

const fontDir = path.join(process.cwd(), "assets", "fonts");
const font = (file: string) => fs.readFileSync(path.join(fontDir, file));

const FONTS = [
  { name: "Display", data: font("BarlowCondensed-ExtraBoldItalic.ttf"), weight: 800 as const, style: "italic" as const },
  { name: "Condensed", data: font("BarlowCondensed-Bold.ttf"), weight: 700 as const, style: "normal" as const },
  { name: "Body", data: font("Barlow-Regular.ttf"), weight: 400 as const, style: "normal" as const },
];

const ORANGE = "#ff7a1a";

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        padding: "56px 64px",
        backgroundColor: "#121417",
        color: "#eef1f4",
        fontFamily: "Body",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", position: "absolute", left: 0, top: 0, right: 0, height: 10, background: ORANGE }} />
      {/* Spielfeldlinien im Hintergrund */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: 40,
          right: 40,
          bottom: 40,
          border: "2px solid rgba(255,255,255,0.06)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 600,
          top: 40,
          bottom: 40,
          width: 2,
          background: "rgba(255,255,255,0.06)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          left: 510,
          top: 225,
          width: 180,
          height: 180,
          borderRadius: 999,
          border: "2px solid rgba(255,255,255,0.06)",
          display: "flex",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div
          style={{
            width: 54,
            height: 54,
            borderRadius: 10,
            background: ORANGE,
            color: "#1f0c00",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "Display",
            fontSize: 30,
          }}
        >
          PA
        </div>
        <div style={{ display: "flex", fontFamily: "Display", fontSize: 40, textTransform: "uppercase" }}>
          Pre<span style={{ color: ORANGE }}>Assists</span>
        </div>
      </div>
      {children}
    </div>
  );
}

export function ogText(title: string, subtitle: string, kicker?: string) {
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", flexDirection: "column", marginTop: "auto" }}>
          {kicker && (
            <div style={{ display: "flex", fontFamily: "Condensed", fontSize: 28, color: ORANGE, textTransform: "uppercase", letterSpacing: 2 }}>
              {kicker}
            </div>
          )}
          <div
            style={{ display: "flex", fontFamily: "Display",
              fontSize: title.length > 22 ? 84 : 110,
              lineHeight: 0.95,
              textTransform: "uppercase",
              marginTop: 8,
            }}
          >
            {title}
          </div>
          <div style={{ display: "flex", fontSize: 32, color: "#c9d0d7", marginTop: 20, maxWidth: 920 }}>{subtitle}</div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: FONTS },
  );
}

export function ogPlayer(p: {
  name: string;
  team: string;
  season: string;
  position: string | null;
  preAssists: number;
  assists: number;
  goals: number;
  xg: number;
}) {
  const stats: [string, string][] = [
    ["Assists", String(p.assists)],
    ["Tore", String(p.goals)],
    ["xPA", p.xg.toFixed(2).replace(".", ",")],
  ];
  return new ImageResponse(
    (
      <Frame>
        <div style={{ display: "flex", marginTop: "auto", alignItems: "flex-end", gap: 48 }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              width: 250,
              height: 300,
              borderRadius: 24,
              border: `4px solid ${ORANGE}`,
              background: "linear-gradient(180deg, rgba(255,122,26,0.25), rgba(20,20,24,0.9))",
            }}
          >
            <div style={{ display: "flex", fontFamily: "Display", fontSize: 150, color: ORANGE, lineHeight: 1 }}>{p.preAssists}</div>
            <div style={{ display: "flex", fontFamily: "Condensed", fontSize: 30, color: "#ffc58f", textTransform: "uppercase" }}>
              Pre-Assists
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
            <div style={{ display: "flex", fontFamily: "Condensed", fontSize: 28, color: ORANGE, textTransform: "uppercase", letterSpacing: 2 }}>
              {[p.position, p.team, p.season].filter(Boolean).join(" · ")}
            </div>
            <div
              style={{ display: "flex", fontFamily: "Display",
                fontSize: p.name.length > 18 ? 76 : 96,
                lineHeight: 0.95,
                textTransform: "uppercase",
                marginTop: 6,
              }}
            >
              {p.name}
            </div>
            <div style={{ display: "flex", gap: 36, marginTop: 28 }}>
              {stats.map(([label, value]) => (
                <div key={label} style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontFamily: "Display", fontSize: 54, lineHeight: 1 }}>{value}</div>
                  <div style={{ display: "flex", fontSize: 24, color: "#8d96a0" }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Frame>
    ),
    { ...OG_SIZE, fonts: FONTS },
  );
}
