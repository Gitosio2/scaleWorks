import { useTranslations } from "next-intl";
import { ralHex } from "@/lib/ral";

/** Color square for a consumable: its manual color, else the RAL code in its reference. */
export function ColorSwatch({
  colorHex,
  reference,
}: {
  colorHex: string | null;
  reference: string | null;
}) {
  const t = useTranslations("consumables");
  const color = colorHex ?? ralHex(reference);
  if (!color) return null;
  // An SVG fill is a presentation attribute, not an inline style, so it works
  // under the CSP (which forbids style attributes) for any color.
  return (
    <svg
      role="img"
      aria-label={t("colorSwatch", { color: color.toUpperCase() })}
      className="size-11 shrink-0 self-center overflow-hidden rounded-[10px] border border-line"
    >
      <title>{color.toUpperCase()}</title>
      <rect width="100%" height="100%" fill={color} />
    </svg>
  );
}
