import { sql } from "drizzle-orm";
import { PgDialect } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import {
  ascNullsLast,
  containsPattern,
  descNullsLast,
  enumParam,
  textParam,
  uuidParam,
} from "./list-filters";

describe("textParam", () => {
  it("is empty when the param is absent", () => {
    expect(textParam({}, "q")).toBe("");
    expect(textParam({ q: undefined }, "q")).toBe("");
  });

  it("trims the value", () => {
    expect(textParam({ q: "  fiat " }, "q")).toBe("fiat");
  });

  it("takes the first of repeated params", () => {
    expect(textParam({ q: ["a", "b"] }, "q")).toBe("a");
    expect(textParam({ q: [] }, "q")).toBe("");
  });

  it("drops NUL bytes", () => {
    expect(textParam({ q: "a\0b" }, "q")).toBe("ab");
  });

  it("caps the length at 100 characters", () => {
    expect(textParam({ q: "x".repeat(250) }, "q")).toHaveLength(100);
  });
});

describe("enumParam", () => {
  const phases = ["not_started", "in_progress", "finished"] as const;

  it("returns a listed value", () => {
    expect(enumParam({ phase: "finished" }, "phase", phases)).toBe("finished");
  });

  it("returns null for unknown or missing values", () => {
    expect(enumParam({ phase: "other" }, "phase", phases)).toBeNull();
    expect(enumParam({}, "phase", phases)).toBeNull();
  });

  it("matches the trimmed value but is case sensitive", () => {
    expect(enumParam({ phase: " finished " }, "phase", phases)).toBe("finished");
    expect(enumParam({ phase: "FINISHED" }, "phase", phases)).toBeNull();
  });
});

describe("uuidParam", () => {
  const id = "123e4567-e89b-12d3-a456-426614174000";

  it("accepts a uuid in either case", () => {
    expect(uuidParam({ id }, "id")).toBe(id);
    expect(uuidParam({ id: id.toUpperCase() }, "id")).toBe(id.toUpperCase());
  });

  it("rejects anything Postgres would refuse", () => {
    expect(uuidParam({ id: "123" }, "id")).toBeNull();
    expect(uuidParam({ id: `${id}x` }, "id")).toBeNull();
    expect(uuidParam({ id: "x or 1=1" }, "id")).toBeNull();
    expect(uuidParam({}, "id")).toBeNull();
  });
});

describe("containsPattern", () => {
  it("wraps the term in wildcards", () => {
    expect(containsPattern("fiat")).toBe("%fiat%");
  });

  it("escapes LIKE wildcards and the escape character", () => {
    expect(containsPattern("100%")).toBe("%100\\%%");
    expect(containsPattern("a_b")).toBe("%a\\_b%");
    expect(containsPattern("a\\b")).toBe("%a\\\\b%");
  });

  it("matches everything for an empty term", () => {
    expect(containsPattern("")).toBe("%%");
  });
});

describe("null ordering helpers", () => {
  const dialect = new PgDialect();
  const column = sql.raw('"price_cents"');

  it("puts nulls last in both directions", () => {
    expect(dialect.sqlToQuery(ascNullsLast(column)).sql).toBe(
      '"price_cents" asc nulls last',
    );
    expect(dialect.sqlToQuery(descNullsLast(column)).sql).toBe(
      '"price_cents" desc nulls last',
    );
  });
});
