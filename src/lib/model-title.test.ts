import { describe, expect, it } from "vitest";
import { modelTitle } from "./model-title";

describe("modelTitle", () => {
  it("joins brand and name", () => {
    expect(modelTitle("Citroën", "2CV")).toBe("Citroën 2CV");
  });

  it("returns the name alone for legacy models without a brand", () => {
    expect(modelTitle(null, "Citroën 2CV")).toBe("Citroën 2CV");
    expect(modelTitle(undefined, "Citroën 2CV")).toBe("Citroën 2CV");
  });

  it("ignores blank brands", () => {
    expect(modelTitle("", "2CV")).toBe("2CV");
    expect(modelTitle("   ", "2CV")).toBe("2CV");
  });

  it("trims the brand but keeps the name as is", () => {
    expect(modelTitle("  Fiat ", "500")).toBe("Fiat 500");
  });
});
