import * as Flags from "country-flag-icons/react/3x2";
import { flagCode } from "@/lib/country-flags";

// An SVG flag plus the country name. Server-rendered, so no flag code reaches the
// client; the SVGs carry no style attributes or <style> elements, which the CSP
// forbids. Windows shows flag emoji as two letters, hence SVG. Without a flag the
// ISO code is shown as text. The name stays for screen readers and, on very small
// screens, is hidden visually (the title keeps it for hovering).
export function CountryFlag({
  code,
  name,
  iconOnly = false,
}: {
  code: string;
  name: string;
  // Only the flag, for places where the name is already written next to it (a select or listbox).
  iconOnly?: boolean;
}) {
  const known = flagCode(code);
  const Flag = known ? Flags[known as keyof typeof Flags] : null;
  return (
    <span className="inline-flex items-center gap-1.5 align-middle" title={name}>
      {Flag ? (
        <Flag aria-hidden className="h-3.5 w-[21px] shrink-0 rounded-[2px]" />
      ) : (
        <span aria-hidden className="font-semibold">{code}</span>
      )}
      {!iconOnly && <span className="sr-only sm:not-sr-only">{name}</span>}
    </span>
  );
}
