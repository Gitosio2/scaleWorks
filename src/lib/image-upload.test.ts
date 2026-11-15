import { describe, expect, it } from "vitest";
import { detectImage } from "./image-upload";

const bytes = (...values: number[]) => new Uint8Array(values);
const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

describe("detectImage", () => {
  it("recognises WebP by its RIFF/WEBP header", () => {
    const webp = bytes(...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP"), 0);
    expect(detectImage(webp)).toEqual({ ext: "webp", contentType: "image/webp" });
  });

  it("recognises JPEG by its signature", () => {
    expect(detectImage(bytes(0xff, 0xd8, 0xff, 0xe0))).toEqual({ ext: "jpg", contentType: "image/jpeg" });
  });

  it("rejects anything else, whatever the file name claims", () => {
    expect(detectImage(bytes(...ascii("GIF89a")))).toBeNull();
    expect(detectImage(bytes(...ascii("<svg xmlns")))).toBeNull();
    expect(detectImage(bytes())).toBeNull();
    expect(detectImage(bytes(0xff, 0xd8))).toBeNull();
  });
});
