import { describe, expect, it } from "vitest";
import { COUNTRY_CODES } from "./countries";
import { EXCLUDED_FROM_FLAGS, flagCode } from "./country-flags";

describe("flagCode", () => {
  it("returns the code for a country that has a flag", () => {
    expect(flagCode("ES")).toBe("ES");
    expect(flagCode("DE")).toBe("DE");
  });

  it("returns null for unknown, lowercase or malformed codes", () => {
    for (const value of ["", "es", "ZZ", "ESP", "E", "XX"]) {
      expect(flagCode(value)).toBeNull();
    }
  });
});

describe("country list vs flags", () => {
  it("every selectable country has a flag or is deliberately excluded", () => {
    for (const code of COUNTRY_CODES) {
      const covered = flagCode(code) !== null || EXCLUDED_FROM_FLAGS.includes(code);
      expect(covered, `${code} has no flag and is not excluded`).toBe(true);
    }
  });

  it("only excludes codes that really have no flag", () => {
    for (const code of EXCLUDED_FROM_FLAGS) expect(flagCode(code)).toBeNull();
  });
});
