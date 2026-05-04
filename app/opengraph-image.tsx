import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "GetWebPage — Serious websites for UK small businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f7f3ec",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          fontFamily: "Georgia, serif",
        }}
      >
        {/* Top — logo */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              background: "#a04020",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: 20,
              fontFamily: "Georgia, serif",
            }}
          >
            G
          </div>
          <span
            style={{
              fontSize: 22,
              color: "#1a1612",
              letterSpacing: "-0.02em",
              fontFamily: "Georgia, serif",
            }}
          >
            GetWebPage
          </span>
        </div>

        {/* Middle — headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              fontSize: 11,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#c87850",
              fontFamily: "sans-serif",
            }}
          >
            UK Web Studio
          </div>
          <div
            style={{
              fontSize: 68,
              fontWeight: 300,
              lineHeight: 1.05,
              letterSpacing: "-0.025em",
              color: "#1a1612",
              fontFamily: "Georgia, serif",
            }}
          >
            Serious websites
            <br />
            for small businesses.
          </div>
          <div
            style={{
              fontSize: 22,
              color: "#6b6358",
              fontFamily: "sans-serif",
              fontWeight: 300,
              lineHeight: 1.5,
            }}
          >
            From £500 · Delivered in 7 days · Full ownership yours.
          </div>
        </div>

        {/* Bottom — URL + accent bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span
            style={{
              fontSize: 16,
              color: "#9a9188",
              fontFamily: "sans-serif",
              letterSpacing: "0.02em",
            }}
          >
            getwebpage.co.uk
          </span>
          <div
            style={{
              background: "#a04020",
              color: "#fff",
              fontSize: 14,
              fontFamily: "sans-serif",
              fontWeight: 500,
              padding: "10px 24px",
              borderRadius: 4,
              letterSpacing: "0.02em",
            }}
          >
            Get started →
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
