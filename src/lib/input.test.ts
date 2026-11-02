import { describe, expect, it } from "vitest";
import { capText, isUuid, parseHttpUrl } from "./input";
import type { ActionT } from "./labels";

const t: ActionT = (key) => key;

describe("capText", () => {
  it("accepts text up to the limit", () => {
    expect(capText("a".repeat(500), 500, t)).toBe("a".repeat(500));
  });

  it("rejects text one character over the limit", () => {
    expect(() => capText("a".repeat(501), 500, t)).toThrow("textTooLong");
  });

  it("passes null through", () => {
    expect(capText(null, 500, t)).toBeNull();
  });
});

describe("isUuid", () => {
  it("accepts a v4 uuid in either case", () => {
    expect(isUuid("3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6b")).toBe(true);
    expect(isUuid("3F2B8C1E-9A4D-4E6F-8B7A-1C2D3E4F5A6B")).toBe(true);
  });

  it("rejects malformed ids", () => {
    for (const value of ["", "abc", "3f2b8c1e9a4d4e6f8b7a1c2d3e4f5a6b", "3f2b8c1e-9a4d-4e6f-8b7a-1c2d3e4f5a6bX", "' OR 1=1 --"]) {
      expect(isUuid(value)).toBe(false);
    }
  });
});

describe("parseHttpUrl", () => {
  it("returns null for empty input", () => {
    expect(parseHttpUrl(null, t)).toBeNull();
    expect(parseHttpUrl("", t)).toBeNull();
  });

  it("accepts http and https", () => {
    expect(parseHttpUrl("http://example.com/a", t)).toBe("http://example.com/a");
    expect(parseHttpUrl("https://example.com", t)).toBe("https://example.com/");
  });

  it("rejects other protocols and malformed values", () => {
    for (const value of ["javascript:alert(1)", "ftp://example.com", "not a url", "example.com"]) {
      expect(() => parseHttpUrl(value, t)).toThrow("invalidLink");
    }
  });
});
