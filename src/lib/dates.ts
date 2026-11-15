import type { ActionT } from "./labels";

// Earliest year accepted for any date or year the user types.
export const MIN_YEAR = 1800;

// Calendar "today" in the app's time zone, as YYYY-MM-DD like the date columns.
export function todayInMadrid(now: Date = new Date()) {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}

// "2026-03-05" -> same string. Empty -> null. Not a real calendar date -> throws.
export function parseDate(raw: string, t: ActionT) {
  const value = raw.trim();
  if (!value) return null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00Z`) : null;
  // Round-trip catches impossible days such as 2026-02-30.
  if (
    !date ||
    Number.isNaN(date.getTime()) ||
    date.toISOString().slice(0, 10) !== value ||
    Number(value.slice(0, 4)) < MIN_YEAR
  ) {
    throw new Error(t("invalidDate"));
  }
  return value;
}
