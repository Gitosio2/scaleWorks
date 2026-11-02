// Calendar "today" in the app's time zone, as YYYY-MM-DD like the date columns.
export function todayInMadrid(now: Date = new Date()) {
  return now.toLocaleDateString("sv-SE", { timeZone: "Europe/Madrid" });
}
