import { ImageResponse } from "next/og";
import { SITE_INITIAL, THEME_ACCENT, THEME_INK } from "@/lib/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Same mark as components/brand.tsx: safety-yellow square with the initial in ink.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: THEME_ACCENT,
          color: THEME_INK,
          fontSize: 44,
          fontWeight: 800,
          borderRadius: 12,
        }}
      >
        {SITE_INITIAL}
      </div>
    ),
    size,
  );
}
