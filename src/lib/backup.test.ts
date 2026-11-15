import { describe, expect, it, vi } from "vitest";

// backup.ts imports the database client, which needs a connection string at import.
vi.mock("@/db", () => ({ db: {} }));

import { BACKUP_TABLES, columnsOf, isBackupTable, toCsv } from "./backup";

describe("backup tables", () => {
  it("includes the collection items and their photo keys", () => {
    expect(BACKUP_TABLES).toContain("collectionItems");
    expect(BACKUP_TABLES).toContain("collectionItemImages");
    expect(isBackupTable("collectionItems")).toBe(true);
    expect(isBackupTable("collectionItemImages")).toBe(true);
  });

  it("never exports the owner id", () => {
    for (const table of BACKUP_TABLES) expect(columnsOf(table)).not.toContain("userId");
  });

  it("exports storage keys for the photos, never file contents", () => {
    expect(columnsOf("collectionItemImages")).toEqual(
      expect.arrayContaining(["id", "itemId", "key", "thumbKey", "position"]),
    );
  });

  it("exports the item columns including year and sale data", () => {
    expect(columnsOf("collectionItems")).toEqual(
      expect.arrayContaining(["brand", "name", "year", "soldDate", "soldPriceCents", "condition"]),
    );
  });

  it("rejects unknown table names", () => {
    expect(isBackupTable("user")).toBe(false);
    expect(isBackupTable(null)).toBe(false);
  });
});

describe("toCsv", () => {
  it("writes an array column as its values joined with a comma and a space", () => {
    const csv = toCsv([{ name: "Actros", tags: ["rigid", "tipper"] }], ["name", "tags"], "en");
    expect(csv).toContain("name;tags");
    expect(csv).toContain("Actros;rigid, tipper");
  });

  it("writes an empty array as an empty cell", () => {
    const csv = toCsv([{ name: "Actros", tags: [] }], ["name", "tags"], "en");
    expect(csv).toContain("Actros;" + String.fromCharCode(13, 10));
  });

  it("still guards text cells against formulas", () => {
    expect(toCsv([{ name: "=1+1" }], ["name"], "en")).toContain("'=1+1");
  });
});
