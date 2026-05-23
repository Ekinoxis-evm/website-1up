// Shared Open Graph image renderer for the 1UP marketing surface. Returns a
// 1200×630 PNG via Next.js `ImageResponse` — the modern replacement for the
// old `1up.png` 512² square (audit Area 1: "OG images are 512² squares declared
// as summary_large_image — should be 1200×630"). Each `app/**/opengraph-image.tsx`
// route handler delegates here.
//
// Constraints of ImageResponse:
//   - No external Tailwind classes (must use inline `style`)
//   - No remote http(s) image fetches at runtime
//   - Flexbox + inline styles only

import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = "image/png";

type Accent = "primary" | "secondary" | "tertiary";

// Pulled verbatim from `tailwind.config.ts` so OG images match the live brand.
const ACCENT: Record<Accent, string> = {
  primary:   "#ff4d80", // primary-container
  secondary: "#0897ff", // secondary-container
  tertiary:  "#abd600", // tertiary
};

const BG  = "#0b1326"; // background
const FG  = "#ffffff";
const DIM = "#90a4c4";

export function renderOgImage({
  title,
  subtitle,
  accent = "primary",
}: {
  title:    string;
  subtitle?: string;
  accent?:   Accent;
}) {
  const accentHex = ACCENT[accent];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: BG,
          color: FG,
          padding: "72px 88px",
          justifyContent: "space-between",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Wordmark + accent stripe */}
        <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
          <div
            style={{
              fontSize: 104,
              fontWeight: 900,
              fontStyle: "italic",
              color: accentHex,
              letterSpacing: -6,
              lineHeight: 1,
            }}
          >
            1UP
          </div>
          <div style={{ height: 8, flex: 1, background: accentHex }} />
        </div>

        {/* Title block */}
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              lineHeight: 1.02,
              letterSpacing: -3,
              textTransform: "uppercase",
            }}
          >
            {title}
          </div>
          {subtitle && (
            <div
              style={{
                fontSize: 32,
                marginTop: 28,
                color: DIM,
                lineHeight: 1.3,
                maxWidth: 900,
              }}
            >
              {subtitle}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              fontSize: 22,
              color: DIM,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            1upesports.org
          </div>
          <div
            style={{
              fontSize: 22,
              color: accentHex,
              letterSpacing: 6,
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            Cali · Colombia
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
