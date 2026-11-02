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
