import { describe, expect, it } from "vitest";
import { listboxOptions, moveIndex, typeaheadIndex, typeaheadQuery } from "./listbox";

describe("moveIndex", () => {
  it("moves down and up one option and stops at the ends", () => {
    expect(moveIndex(0, 3, "ArrowDown")).toBe(1);
    expect(moveIndex(2, 3, "ArrowDown")).toBe(2);
    expect(moveIndex(2, 3, "ArrowUp")).toBe(1);
    expect(moveIndex(0, 3, "ArrowUp")).toBe(0);
  });

  it("jumps to the first and last option", () => {
    expect(moveIndex(1, 4, "Home")).toBe(0);
    expect(moveIndex(1, 4, "End")).toBe(3);
  });

  it("starts at the first option when nothing is active yet", () => {
    expect(moveIndex(-1, 3, "ArrowDown")).toBe(0);
    expect(moveIndex(-1, 3, "ArrowUp")).toBe(0);
  });

  it("has no active option when there are none", () => {
    expect(moveIndex(-1, 0, "ArrowDown")).toBe(-1);
    expect(moveIndex(0, 0, "End")).toBe(-1);
  });
});

describe("typeaheadQuery", () => {
  it("appends characters typed in quick succession", () => {
    expect(typeaheadQuery("a", 1000, "r", 1300)).toBe("ar");
  });

  it("starts over once the pause was long enough", () => {
    expect(typeaheadQuery("ar", 1000, "g", 2000)).toBe("g");
  });
});

describe("typeaheadIndex", () => {
  const labels = ["All", "Argentina", "Austria", "Brazil", "Spain"];

  it("finds the first label starting with the typed letter, after the active one", () => {
    expect(typeaheadIndex(labels, 0, "b")).toBe(3);
    expect(typeaheadIndex(labels, 1, "a")).toBe(2);
  });

  it("wraps around", () => {
    expect(typeaheadIndex(labels, 4, "a")).toBe(0);
  });

  it("stays on the only match", () => {
    expect(typeaheadIndex(labels, 4, "s")).toBe(4);
  });

  it("matches a longer prefix starting at the active option", () => {
    expect(typeaheadIndex(labels, 0, "au")).toBe(2);
    expect(typeaheadIndex(labels, 2, "au")).toBe(2);
  });

  it("cycles through the matches when one letter is repeated", () => {
    expect(typeaheadIndex(labels, 1, "aa")).toBe(2);
  });

  it("ignores case and accents", () => {
    expect(typeaheadIndex(["Zeta", "Éire"], 0, "e")).toBe(1);
    expect(typeaheadIndex(["Zeta", "Eire"], 0, "É")).toBe(1);
  });

  it("is -1 when nothing matches or the query is empty", () => {
    expect(typeaheadIndex(labels, 0, "x")).toBe(-1);
    expect(typeaheadIndex(labels, 0, "")).toBe(-1);
    expect(typeaheadIndex([], -1, "a")).toBe(-1);
  });
});

describe("listboxOptions", () => {
  const options = [{ value: "ES", label: "Spain" }];

  it("puts the empty option first", () => {
    expect(listboxOptions(options, "All", "")).toEqual([
      { value: "", label: "All" },
      { value: "ES", label: "Spain" },
    ]);
  });

  it("leaves the empty option out when no label is given", () => {
    expect(listboxOptions(options, null, "ES")).toEqual(options);
  });

  it("keeps a selected value the list no longer offers, labelled by its value", () => {
    expect(listboxOptions(options, "All", "XX")).toEqual([
      { value: "", label: "All" },
      { value: "ES", label: "Spain" },
      { value: "XX", label: "XX" },
    ]);
  });

  it("does not duplicate a selected value that is offered", () => {
    expect(listboxOptions(options, "All", "ES")).toHaveLength(2);
  });
});
