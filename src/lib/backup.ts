import { eq, getTableColumns } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  consumables,
  modelConsumables,
  modelImages,
  models,
  parts,
  quotes,
  timeEntries,
} from "@/db/schema";

// What a backup holds: the app data of ONE account. The auth tables (user,
// account with the password hash, session, verification) are never exported,
// and the owner id is left out of every row.
export const BACKUP_TABLES = [
  "clients",
  "models",
  "modelImages",
  "quotes",
  "parts",
  "consumables",
  "modelConsumables",
  "timeEntries",
] as const;
export type BackupTable = (typeof BACKUP_TABLES)[number];

export function isBackupTable(value: string | null): value is BackupTable {
  return BACKUP_TABLES.includes(value as BackupTable);
}

type Row = Record<string, unknown>;

// Column names per table, in schema order. Used for CSV headers, so an empty
// table still gets its header row.
const COLUMNS: Record<BackupTable, string[]> = {
  clients: Object.keys(getTableColumns(clients)),
  models: Object.keys(getTableColumns(models)),
  modelImages: Object.keys(getTableColumns(modelImages)),
  quotes: Object.keys(getTableColumns(quotes)),
  parts: Object.keys(getTableColumns(parts)),
  consumables: Object.keys(getTableColumns(consumables)),
  modelConsumables: Object.keys(getTableColumns(modelConsumables)),
  timeEntries: Object.keys(getTableColumns(timeEntries)),
};

export function columnsOf(table: BackupTable) {
  return COLUMNS[table].filter((c) => c !== "userId");
}

function withoutOwner(rows: Row[]): Row[] {
  return rows.map((row) => Object.fromEntries(Object.entries(row).filter(([key]) => key !== "userId")));
}

/** Rows of one table that belong to the account. */
export async function loadTable(table: BackupTable, userId: string): Promise<Row[]> {
  switch (table) {
    case "clients":
      return withoutOwner(await db.select().from(clients).where(eq(clients.userId, userId)));
    case "models":
      return withoutOwner(await db.select().from(models).where(eq(models.userId, userId)));
    case "modelImages":
      return withoutOwner(
        await db.select().from(modelImages).where(eq(modelImages.userId, userId)),
      );
    case "quotes":
      return withoutOwner(await db.select().from(quotes).where(eq(quotes.userId, userId)));
    case "parts":
      return withoutOwner(await db.select().from(parts).where(eq(parts.userId, userId)));
    case "consumables":
      return withoutOwner(
        await db.select().from(consumables).where(eq(consumables.userId, userId)),
      );
    case "timeEntries":
      return withoutOwner(
        await db.select().from(timeEntries).where(eq(timeEntries.userId, userId)),
      );
    case "modelConsumables":
      // The link table has no owner column: it belongs to the account through its model.
      return db
        .select(getTableColumns(modelConsumables))
        .from(modelConsumables)
        .innerJoin(models, eq(models.id, modelConsumables.modelId))
        .where(eq(models.userId, userId));
  }
}

/** Every table of the account, loaded in parallel. */
export async function loadAll(userId: string) {
  const entries = await Promise.all(
    BACKUP_TABLES.map(async (table) => [table, await loadTable(table, userId)] as const),
  );
  return Object.fromEntries(entries) as Record<BackupTable, Row[]>;
}

// ---- CSV ----

// Semicolon-separated with a UTF-8 byte order mark and CRLF line ends: the form
// spreadsheets in Spanish settings open correctly by double click.
const DELIMITER = ";";

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  let text =
    value instanceof Date ? value.toISOString() : typeof value === "string" ? value : String(value);
  // A text cell that starts with =, +, - or @ would be run as a formula by a
  // spreadsheet; the apostrophe makes it plain text.
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Rows as CSV. Every money column (`...Cents`) also gets a readable `...Eur`
 * column next to it, using a decimal comma in Spanish and a point otherwise.
 */
export function toCsv(rows: Row[], columns: string[], locale: string): string {
  const eur = (cents: unknown) =>
    typeof cents === "number"
      ? (cents / 100).toFixed(2).replace(".", locale === "es" ? "," : ".")
      : "";
  const headers: string[] = [];
  const getters: Array<(row: Row) => unknown> = [];
  for (const column of columns) {
    headers.push(column);
    getters.push((row) => row[column]);
    if (column.endsWith("Cents")) {
      headers.push(`${column.slice(0, -"Cents".length)}Eur`);
      getters.push((row) => eur(row[column]));
    }
  }
  const lines = [
    headers.map(cell).join(DELIMITER),
    ...rows.map((row) => getters.map((get) => cell(get(row))).join(DELIMITER)),
  ];
  return "﻿" + lines.join("\r\n") + "\r\n";
}
