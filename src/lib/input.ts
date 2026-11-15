import { MIN_YEAR, todayInMadrid } from "./dates";
import type { ActionT } from "./labels";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres rejects malformed uuids with a DB error; checking first fails cleanly.
export function isUuid(value: string) {
  return UUID.test(value);
}

// Rejects text longer than `max` characters; null passes through.
export function capText(value: string | null, max: number, t: ActionT) {
  if (value !== null && value.length > max) throw new Error(t("textTooLong"));
  return value;
}

// Only http(s) links: anything else (e.g. "javascript:") would be unsafe in an href.
export function parseHttpUrl(value: string | null, t: ActionT) {
  if (!value) return null;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(t("invalidLink"));
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(t("invalidLink"));
  }
  return url.toString();
}

// The current year in the app's time zone, whatever zone the server runs in.
const madridYear = (now: Date) => Number(todayInMadrid(now).slice(0, 4));

// Year of the real vehicle a model depicts. Empty -> null; otherwise a whole year
// between MIN_YEAR and next year (announced models); anything else throws.
export function parseYear(raw: string, t: ActionT, now = new Date()) {
  const value = raw.trim();
  if (!value) return null;
  const year = /^\d{1,4}$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(year) || year < MIN_YEAR || year > madridYear(now) + 1) {
    throw new Error(t("invalidYear"));
  }
  return year;
}
