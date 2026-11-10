import { describe, expect, it } from "vitest";
import { isForeignKeyViolation } from "./db-errors";

describe("isForeignKeyViolation", () => {
  it("detects the Postgres foreign key code on the error", () => {
    expect(isForeignKeyViolation({ code: "23503" })).toBe(true);
  });

  it("detects the restrict violation raised by ON DELETE RESTRICT keys", () => {
    expect(isForeignKeyViolation({ code: "23001" })).toBe(true);
    expect(isForeignKeyViolation(new Error("failed", { cause: { code: "23001" } }))).toBe(true);
  });

  it("detects it on a wrapped cause (drizzle wraps driver errors)", () => {
    expect(isForeignKeyViolation(new Error("failed", { cause: { code: "23503" } }))).toBe(true);
  });

  it("ignores other errors and non-objects", () => {
    expect(isForeignKeyViolation({ code: "23505" })).toBe(false);
    expect(isForeignKeyViolation(new Error("boom"))).toBe(false);
    expect(isForeignKeyViolation(null)).toBe(false);
    expect(isForeignKeyViolation("23503")).toBe(false);
  });
});
