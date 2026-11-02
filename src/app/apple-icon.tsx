import { ImageResponse } from "next/og";
import { SITE_INITIAL } from "@/lib/site";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// iOS rounds the corners itself, so the square is full-bleed.
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#3e5e58",
          color: "#f7f5f0",
          fontSize: 124,
          fontWeight: 700,
        }}
      >
        {SITE_INITIAL}
      </div>
    ),
    size,
  );
}
