import { describe, expect, it } from "vitest";
import { isGroupActive, isPathActive } from "./nav-groups";

describe("isPathActive", () => {
  it("matches the root only exactly", () => {
    expect(isPathActive("/", "/")).toBe(true);
    expect(isPathActive("/models", "/")).toBe(false);
  });

  it("matches a route and its sub-routes, not look-alike prefixes", () => {
    expect(isPathActive("/components", "/components")).toBe(true);
    expect(isPathActive("/components/1", "/components")).toBe(true);
    expect(isPathActive("/components-x", "/components")).toBe(false);
  });
});

describe("isGroupActive", () => {
  const children = [{ href: "/consumables" }, { href: "/components" }];

  it("is active when any child route is active", () => {
    expect(isGroupActive("/components", children)).toBe(true);
    expect(isGroupActive("/consumables/3", children)).toBe(true);
  });

  it("is inactive elsewhere", () => {
    expect(isGroupActive("/models", children)).toBe(false);
    expect(isGroupActive("/", children)).toBe(false);
  });
});
