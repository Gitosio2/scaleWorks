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
  return (
    <span
      role="img"
      aria-label={t("colorSwatch", { color: color.toUpperCase() })}
      title={color.toUpperCase()}
      style={{ backgroundColor: color }}
      className="size-11 shrink-0 self-center rounded-[10px] border border-line"
    />
  );
}
