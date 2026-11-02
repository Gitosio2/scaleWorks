import { describe, expect, it } from "vitest";
import { contactHref, siteOrigin } from "./share";

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

describe("contactHref", () => {
  it("builds a mailto link from an email", () => {
    expect(contactHref("me@example.com")).toBe("mailto:me@example.com");
  });

  it("builds a WhatsApp link from a phone number", () => {
    expect(contactHref("+34 600 123 456")).toBe("https://wa.me/34600123456");
  });

  it("keeps http(s) URLs", () => {
    expect(contactHref("https://wa.me/34600123456")).toBe("https://wa.me/34600123456");
  });

  it("hides the button for empty or unsupported values", () => {
    expect(contactHref(undefined)).toBeNull();
    expect(contactHref("  ")).toBeNull();
    expect(contactHref("javascript:alert(1)")).toBeNull();
    expect(contactHref("12345")).toBeNull();
    expect(contactHref("just words")).toBeNull();
  });
});
