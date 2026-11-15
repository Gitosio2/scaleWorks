import { describe, expect, it } from "vitest";
import { canViewCollectionImage, collectionImageKeys } from "./collection-image";

describe("canViewCollectionImage", () => {
  it("allows only the signed-in owner", () => {
    expect(canViewCollectionImage("user-1", "user-1")).toBe(true);
  });

  it("denies another account", () => {
    expect(canViewCollectionImage("user-1", "user-2")).toBe(false);
  });

  it("denies visitors without a session", () => {
    expect(canViewCollectionImage("user-1", null)).toBe(false);
    expect(canViewCollectionImage("user-1", undefined)).toBe(false);
    expect(canViewCollectionImage("user-1", "")).toBe(false);
  });

  it("denies when the owner is unknown", () => {
    expect(canViewCollectionImage("", "")).toBe(false);
  });
});

describe("collectionImageKeys", () => {
  it("builds keys under the collection prefix, never the models one", () => {
    const { key, thumbKey } = collectionImageKeys("u1", "item1", "abc", "webp", "jpg");
    expect(key).toBe("collection/u1/item1/abc.webp");
    expect(thumbKey).toBe("collection/u1/item1/abc-thumb.jpg");
    expect(key.startsWith("models/")).toBe(false);
  });
});
