import { hasFlag } from "country-flag-icons";

// Codes of our country list that the flag package does not cover. None today: the
// test fails if a code of the list loses its flag, so it must be listed here (and
// the UI falls back to showing the ISO code as text).
export const EXCLUDED_FROM_FLAGS: readonly string[] = [];

// The code when the package has a flag for it, otherwise null. Case-sensitive: codes
// are stored in uppercase.
export function flagCode(code: string) {
  return hasFlag(code) ? code : null;
}
