import { ImageResponse } from "next/og";
import { SITE_INITIAL } from "@/lib/site";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

// Same mark as components/brand.tsx: brand-colored rounded square with the initial.
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
          background: "#3e5e58",
          color: "#f7f5f0",
          fontSize: 44,
          fontWeight: 700,
          borderRadius: 14,
        }}
      >
        {SITE_INITIAL}
      </div>
    ),
    size,
  );
}
