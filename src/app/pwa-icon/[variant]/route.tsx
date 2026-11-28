import { ImageResponse } from "next/og";
import { SITE_INITIAL, THEME_ACCENT, THEME_INK } from "@/lib/site";

// Same mark as icon.tsx, in the sizes the web manifest needs. "any" icons are
// rounded; the maskable one is full-bleed with the letter inside the safe zone,
// because the OS applies its own mask.
const VARIANTS = {
  "192": { px: 192, rounded: true },
  "512": { px: 512, rounded: true },
  "512-maskable": { px: 512, rounded: false },
} as const;

export function generateStaticParams() {
  return Object.keys(VARIANTS).map((variant) => ({ variant }));
}

export async function GET(_request: Request, ctx: RouteContext<"/pwa-icon/[variant]">) {
  const { variant } = await ctx.params;
  if (!(variant in VARIANTS)) return new Response("Not found", { status: 404 });
  const { px, rounded } = VARIANTS[variant as keyof typeof VARIANTS];

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
          fontSize: Math.round(px * (rounded ? 0.69 : 0.5)),
          fontWeight: 800,
          borderRadius: rounded ? Math.round(px * 0.22) : 0,
        }}
      >
        {SITE_INITIAL}
      </div>
    ),
    { width: px, height: px },
  );
}
