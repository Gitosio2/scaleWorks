import { describe, expect, it } from "vitest";
import { siteOrigin, socialLinks } from "./share";

describe("siteOrigin", () => {
  it("prefers the configured URL and keeps only its origin", () => {
    expect(siteOrigin({ configured: " https://works.example.com/portfolio ", host: "other.com" })).toBe(
      "https://works.example.com",
    );
  });

  it("falls back to the request host, https by default", () => {
    expect(siteOrigin({ host: "works.example.com" })).toBe("https://works.example.com");
    expect(siteOrigin({ host: "localhost:3000", proto: "http" })).toBe("http://localhost:3000");
  });

  it("uses the first value of forwarded headers", () => {
    expect(siteOrigin({ host: "a.com, b.com", proto: "https, http" })).toBe("https://a.com");
  });

  it("ignores an invalid configured URL", () => {
    expect(siteOrigin({ configured: "javascript:alert(1)", host: "a.com" })).toBe("https://a.com");
    expect(siteOrigin({ configured: "not a url", host: "a.com" })).toBe("https://a.com");
  });

  it("returns null without a usable host", () => {
    expect(siteOrigin({})).toBeNull();
    expect(siteOrigin({ host: "bad host/x" })).toBeNull();
  });
});

describe("socialLinks", () => {
  it("returns the configured links in a fixed order", () => {
    expect(
      socialLinks({
        facebook: "https://facebook.com/marcos",
        tiktok: "https://www.tiktok.com/@marcos",
      }),
    ).toEqual([
      { key: "tiktok", href: "https://www.tiktok.com/@marcos" },
      { key: "facebook", href: "https://facebook.com/marcos" },
    ]);
  });

  it("trims values and skips empty ones", () => {
    expect(socialLinks({ instagram: "  https://instagram.com/marcos  ", tiktok: " ", facebook: undefined })).toEqual([
      { key: "instagram", href: "https://instagram.com/marcos" },
    ]);
  });

  it("rejects anything that is not an https URL", () => {
    expect(
      socialLinks({
        tiktok: "javascript:alert(1)",
        instagram: "http://instagram.com/marcos",
        facebook: "facebook.com/marcos",
      }),
    ).toEqual([]);
  });
});
