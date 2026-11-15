import { describe, expect, it } from "vitest";
import { COUNTRY_CODES, countryName, countryOptions, isCountryCode } from "./countries";

describe("COUNTRY_CODES", () => {
  it("holds unique uppercase two-letter codes", () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    for (const code of COUNTRY_CODES) expect(code).toMatch(/^[A-Z]{2}$/);
  });

  it("includes common countries", () => {
    for (const code of ["ES", "DE", "FR", "IT", "GB", "US", "JP"]) {
      expect(COUNTRY_CODES).toContain(code);
    }
  });
});

describe("isCountryCode", () => {
  it("accepts known uppercase codes only", () => {
    expect(isCountryCode("ES")).toBe(true);
    expect(isCountryCode("es")).toBe(false);
    expect(isCountryCode("ZZ")).toBe(false);
    expect(isCountryCode("ESP")).toBe(false);
    expect(isCountryCode("")).toBe(false);
  });
});

describe("countryOptions", () => {
  it("labels every code in the given locale", () => {
    const options = countryOptions("es-ES");
    expect(options).toHaveLength(COUNTRY_CODES.length);
    expect(options.find((o) => o.code === "DE")?.label).toBe("Alemania");
  });

  it("is sorted by the localized name", () => {
    const labels = countryOptions("en-US").map((o) => o.label);
    const sorted = [...labels].sort((a, b) => a.localeCompare(b, "en-US"));
    expect(labels).toEqual(sorted);
  });
});

describe("countryName", () => {
  it("names a code in the given locale", () => {
    expect(countryName("DE", "es-ES")).toBe("Alemania");
    expect(countryName("DE", "en-US")).toBe("Germany");
  });
});
