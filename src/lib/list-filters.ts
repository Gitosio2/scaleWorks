import { sql, type SQLWrapper } from "drizzle-orm";

export type SearchParams = Record<string, string | string[] | undefined>;

// Longest text filter value kept; search inputs use it as their maxLength.
export const MAX_TEXT_LENGTH = 100;

// First value of a query param, trimmed. "" when absent. NUL bytes are dropped
// (Postgres rejects them) and the length is capped.
export function textParam(sp: SearchParams, key: string) {
  const raw = sp[key];
  const value = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return value.replace(/\0/g, "").trim().slice(0, MAX_TEXT_LENGTH);
}

// The param value if it is one of `values`, otherwise null.
export function enumParam<T extends string>(
  sp: SearchParams,
  key: string,
  values: readonly T[],
) {
  const value = textParam(sp, key);
  return values.find((v) => v === value) ?? null;
}

// Every repeated value of the param that is one of `values`: unique, in the
// order of `values`. Unknown ones are dropped; a single value (an old link) counts as one.
export function enumParams<T extends string>(
  sp: SearchParams,
  key: string,
  values: readonly T[],
) {
  const raw = sp[key];
  const given = new Set((Array.isArray(raw) ? raw : [raw ?? ""]).map((v) => v.replace(/\0/g, "").trim()));
  return values.filter((v) => given.has(v));
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres rejects malformed uuids, so anything else is treated as "no filter".
export function uuidParam(sp: SearchParams, key: string) {
  const value = textParam(sp, key);
  return UUID.test(value) ? value : null;
}

// "%term%" for ILIKE with the wildcard characters in `term` escaped.
export function containsPattern(term: string) {
  return `%${term.replace(/[\\%_]/g, "\\$&")}%`;
}

export const ascNullsLast = (column: SQLWrapper) =>
  sql`${column} asc nulls last`;

export const descNullsLast = (column: SQLWrapper) =>
  sql`${column} desc nulls last`;
