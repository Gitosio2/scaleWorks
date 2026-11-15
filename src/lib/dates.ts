import type { ActionT } from "./labels";

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
  if (!date || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
    throw new Error(t("invalidDate"));
  }
  return value;
}
