import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageHref, pageWindow, parsePage } from "./pagination";

describe("parsePage", () => {
  it("defaults to the first page", () => {
    expect(parsePage({})).toBe(1);
    expect(parsePage({ page: undefined })).toBe(1);
    expect(parsePage({ page: "" })).toBe(1);
  });

  it("reads a positive integer", () => {
    expect(parsePage({ page: "3" })).toBe(3);
    expect(parsePage({ page: " 12 " })).toBe(12);
  });

  it("falls back to 1 for garbage, zero and negatives", () => {
    for (const value of ["abc", "0", "-2", "1.5", "2e3", "NaN", "Infinity", "1x"]) {
      expect(parsePage({ page: value })).toBe(1);
    }
  });

  it("falls back to 1 for repeated params", () => {
    expect(parsePage({ page: ["2", "3"] })).toBe(1);
  });

  it("caps absurdly large values to a safe integer", () => {
    expect(parsePage({ page: "99999999999999999999" })).toBe(1);
  });
});

describe("pageWindow", () => {
  it("uses 20 per page by default", () => {
    expect(PAGE_SIZE).toBe(20);
  });

  it("describes the first page", () => {
    expect(pageWindow(1, 60, 25)).toEqual({
      page: 1,
      totalPages: 3,
      offset: 0,
      limit: 25,
      from: 1,
      to: 25,
    });
  });

  it("describes a partial last page", () => {
    expect(pageWindow(3, 60, 25)).toEqual({
      page: 3,
      totalPages: 3,
      offset: 50,
      limit: 25,
      from: 51,
      to: 60,
    });
  });

  it("clamps a page beyond the last one", () => {
    const w = pageWindow(99, 60, 25);
    expect(w.page).toBe(3);
    expect(w.offset).toBe(50);
  });

  it("handles an empty list", () => {
    expect(pageWindow(1, 0, 25)).toEqual({
      page: 1,
      totalPages: 1,
      offset: 0,
      limit: 25,
      from: 0,
      to: 0,
    });
    expect(pageWindow(5, 0, 25).page).toBe(1);
  });

  it("fits an exact multiple on its pages", () => {
    const w = pageWindow(2, 50, 25);
    expect(w).toMatchObject({ page: 2, totalPages: 2, from: 26, to: 50 });
  });

  it("clamps a page below 1", () => {
    expect(pageWindow(0, 10, 25).page).toBe(1);
    expect(pageWindow(-3, 10, 25).page).toBe(1);
  });

  it("defaults the page size", () => {
    expect(pageWindow(1, 100).limit).toBe(PAGE_SIZE);
  });
});

describe("pageHref", () => {
  it("omits the page param on page 1", () => {
    expect(pageHref("/models", {}, 1)).toBe("/models");
    expect(pageHref("/models", { q: "fiat", page: "4" }, 1)).toBe("/models?q=fiat");
  });

  it("sets the page and keeps the other params", () => {
    expect(pageHref("/models", { q: "fiat", phase: "finished" }, 3)).toBe(
      "/models?q=fiat&phase=finished&page=3",
    );
  });

  it("replaces an existing page param", () => {
    expect(pageHref("/models", { page: "2", q: "a b" }, 3)).toBe("/models?q=a+b&page=3");
  });

  it("drops a repeated page param and keeps the other params", () => {
    expect(pageHref("/models", { q: "a", page: ["2", "3"] }, 4)).toBe("/models?q=a&page=4");
    expect(pageHref("/models", { page: ["2", "3"], q: "a" }, 1)).toBe("/models?q=a");
  });

  it("keeps repeated params and skips undefined ones", () => {
    expect(pageHref("/models", { a: ["1", "2"], b: undefined }, 2)).toBe(
      "/models?a=1&a=2&page=2",
    );
  });
});
