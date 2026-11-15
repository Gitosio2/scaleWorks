import { getTranslations } from "next-intl/server";

// The browser resizes before uploading (see photo-uploader.tsx); these caps
// are the server-side backstop, not the target size.
export const MAX_FULL_BYTES = 1_500_000;
export const MAX_THUMB_BYTES = 300_000;

export type ImageKind = { ext: "webp" | "jpg"; contentType: string };

// Trust the bytes, not the file name or the declared type.
export function detectImage(bytes: Uint8Array): ImageKind | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (bytes.length > 12 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    return { ext: "webp", contentType: "image/webp" };
  }
  if (bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { ext: "jpg", contentType: "image/jpeg" };
  }
  return null;
}

// Validates one uploaded file (size and real type) and returns its bytes.
export async function readImage(file: FormDataEntryValue | null, maxBytes: number) {
  const t = await getTranslations("actionErrors");
  if (!(file instanceof File) || file.size === 0) throw new Error(t("imageInvalid"));
  if (file.size > maxBytes) throw new Error(t("imageTooLarge"));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = detectImage(bytes);
  if (!kind) throw new Error(t("imageInvalid"));
  return { bytes, kind };
}
